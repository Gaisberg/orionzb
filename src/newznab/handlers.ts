import { FastifyRequest, FastifyReply } from 'fastify';
import { OrionoidClient } from '../orionoid/client.js';
import { Config } from '../config.js';
import {
    NewznabSearchParams,
    NewznabCaps,
    NEWZNAB_ERRORS,
    NewznabItem,
} from './types.js';
import {
    buildCapsXml,
    buildSearchResultsXml,
    buildErrorXml,
    buildDetailsXml,
} from './xml-builder.js';
import { getAllCategories, matchesCategory, mapToNewznabCategories } from '../mapping/categories.js';
import { transformStreamToNewznabItem } from '../mapping/transformer.js';
import { OrionoidSearchParams, OrionoidStream } from '../orionoid/types.js';

import { MemoryCache } from '../cache/memory-cache.js';

export class NewznabHandlers {
    private orionoidClient: OrionoidClient;
    private config: Config;
    private cache: MemoryCache;

    constructor(orionoidClient: OrionoidClient, config: Config) {
        this.orionoidClient = orionoidClient;
        this.config = config;
        // Cache for 5 minutes (300 seconds)
        this.cache = new MemoryCache(300);
    }

    /**
     * Handle capabilities request
     */
    async handleCaps(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
        const caps: NewznabCaps = {
            server: {
                version: '1.0',
                title: this.config.newznab.serverName,
                strapline: this.config.newznab.serverDescription,
                url: this.config.server.baseUrl,
            },
            limits: {
                max: this.config.features.maxResults,
                default: this.config.features.defaultResults,
            },
            retention: {
                days: 3000,
            },
            registration: {
                available: 'no',
                open: 'no',
            },
            searching: {
                search: {
                    available: 'yes',
                    supportedParams: 'q,cat,limit,offset,maxage',
                },
                'tv-search': {
                    available: 'yes',
                    supportedParams: 'q,cat,limit,offset,maxage,season,ep,imdbid,tvdbid,tmdbid,traktid,rid',
                },
                'movie-search': {
                    available: 'yes',
                    supportedParams: 'q,cat,limit,offset,maxage,imdbid,tmdbid,traktid',
                },
            },
            categories: getAllCategories(),
        };

        const xml = buildCapsXml(caps);
        reply.header('Content-Type', 'application/xml');
        reply.send(xml);
    }

    /**
     * Handle search request (general, TV, or movie)
     */
    async handleSearch(req: FastifyRequest, reply: FastifyReply): Promise<void> {
        try {
            const params = req.query as unknown as NewznabSearchParams;

            // Validate API key
            if (params.apikey !== this.config.newznab.apiKey) {
                this.sendError(reply, NEWZNAB_ERRORS.INCORRECT_USER_CREDENTIALS, 'Invalid API key');
                return;
            }

            // Mock response for NZBHydra connection check (q=mp3)
            if (params.q === 'mp3') {
                const mockItem: NewznabItem = {
                    title: 'Test Audio MP3 320kbps',
                    guid: {
                        value: 'mock-mp3',
                        isPermaLink: false,
                    },
                    link: `${this.config.server.baseUrl}/details/mock-mp3`,
                    comments: `${this.config.server.baseUrl}/details/mock-mp3`,
                    // Use a fixed RFC-2822 date string to guarantee XML validity
                    pubDate: 'Fri, 31 Jan 2025 12:00:00 +0000',
                    category: 'Audio > MP3',
                    description: 'Mock audio item for connection check',
                    enclosure: {
                        url: `${this.config.server.baseUrl}/api?t=get&id=mock-mp3`,
                        length: 5000000,
                        type: 'application/x-nzb'
                    },
                    attributes: [
                        { name: 'category', value: '3010' },
                        { name: 'size', value: '5000000' }
                    ]
                };

                this.sendSearchResults(reply, [mockItem], 0, 1);
                return;
            }

            // Determine which types to search
            const typesToSearch: ('movie' | 'show')[] = [];
            if (params.t === 'movie') {
                typesToSearch.push('movie');
            } else if (params.t === 'tvsearch') {
                typesToSearch.push('show');
            } else {
                // Generic search: search both
                typesToSearch.push('movie', 'show');
            }

            // Execute searches in parallel
            const searchPromises = typesToSearch.map(async (type) => {
                const orionoidParams = this.buildOrionoidParams(params, type);
                try {
                    const response = await this.orionoidClient.searchStreams(orionoidParams);
                    return { type, data: response.data, error: null };
                } catch (err) {
                    return { type, data: null, error: err };
                }
            });

            const results = await Promise.all(searchPromises);

            // Collect all streams
            let allStreams: { stream: OrionoidStream, type: 'movie' | 'show' }[] = [];
            let totalCount = 0;

            for (const result of results) {
                if (result.data && result.data.streams) {
                    const type = result.type;
                    const streams = result.data.streams.map(s => ({ stream: s, type }));

                    // Cache streams for future lookup (Details, Download)
                    result.data.streams.forEach(stream => {
                        this.cache.set(stream.id, stream);
                        // Also cache by hash if available
                        if (stream.file.hash) {
                            this.cache.set(stream.file.hash, stream);
                        }
                    });

                    allStreams = allStreams.concat(streams);
                    // Sum up totals (approximate)
                    totalCount += result.data.count.total;
                }
            }

            // Filter by category if specified
            if (params.cat) {
                const requestedCategories = params.cat.split(',');
                allStreams = allStreams.filter(item => {
                    const streamCategories = this.getStreamCategories(item.stream, item.type);
                    return matchesCategory(streamCategories, requestedCategories);
                });
            }

            // Transform to Newznab items
            const items = allStreams.map(item => {
                const imdbId = item.type === 'movie'
                    ? results.find(r => r.type === 'movie')?.data?.movie?.id.imdb
                    : results.find(r => r.type === 'show')?.data?.show?.id.imdb;

                const tvdbId = item.type === 'show'
                    ? results.find(r => r.type === 'show')?.data?.show?.id.tvdb
                    : undefined;

                return transformStreamToNewznabItem(
                    item.stream,
                    item.type,
                    this.config.server.baseUrl,
                    imdbId,
                    tvdbId
                );
            });

            // Sort merged results by date (newest first)
            items.sort((a, b) => {
                return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
            });

            // Apply offset/limit manually since we merged results
            const limit = params.limit ? parseInt(String(params.limit), 10) : this.config.features.defaultResults;
            const offset = params.offset ? parseInt(String(params.offset), 10) : 0;

            const pagedItems = items.slice(offset, offset + limit);

            this.sendSearchResults(reply, pagedItems, offset, totalCount);

        } catch (error) {
            console.error('Search error:', error);
            this.sendError(reply, NEWZNAB_ERRORS.API_ERROR, (error as Error).message);
        }
    }

    /**
     * Handle details request
     */
    async handleDetails(req: FastifyRequest, reply: FastifyReply): Promise<void> {
        try {
            const params = req.query as unknown as NewznabSearchParams;

            // Validate API key
            if (params.apikey !== this.config.newznab.apiKey) {
                this.sendError(reply, NEWZNAB_ERRORS.INCORRECT_USER_CREDENTIALS, 'Invalid API key');
                return;
            }

            if (!params.guid) {
                this.sendError(reply, NEWZNAB_ERRORS.MISSING_PARAMETER, 'Missing guid parameter');
                return;
            }

            // Extract stream ID from GUID
            const streamId = this.extractStreamId(params.guid);

            // Fetch stream details from Orionoid
            // Check cache first
            const stream: OrionoidStream | undefined = this.cache.get(streamId);

            if (!stream) {
                // Return 500 as requested for strict mode
                this.sendError(reply, NEWZNAB_ERRORS.API_ERROR, 'Item not found in cache. Please search again.');
                return;
            }

            // Transform to Newznab item
            const item = transformStreamToNewznabItem(
                stream,
                'movie',
                this.config.server.baseUrl
            );

            const xml = buildDetailsXml(item, this.config.newznab.serverName);
            reply.header('Content-Type', 'application/xml');
            reply.send(xml);
        } catch (error) {
            console.error('Details error:', error);
            this.sendError(reply, NEWZNAB_ERRORS.API_ERROR, (error as Error).message);
        }
    }

    /**
     * Handle NZB download request
     */
    async handleGet(req: FastifyRequest, reply: FastifyReply): Promise<void> {
        console.log(`[Newznab] handleGet called. Query:`, req.query, `User-Agent:`, req.headers['user-agent']);
        try {
            const params = req.query as unknown as NewznabSearchParams;

            if (!params.id) {
                this.sendError(reply, NEWZNAB_ERRORS.MISSING_PARAMETER, 'Missing id parameter');
                return;
            }

            const streamId = params.id;
            let nzbData: Buffer;

            let stream: OrionoidStream | undefined = this.cache.get(streamId);

            if (!stream) {
                this.sendError(reply, NEWZNAB_ERRORS.API_ERROR, 'Item not found in cache. Please search again.');
                return;
            }

            const downloadId = stream?.file?.hash ||
                (stream?.links && stream.links.length > 0 ? stream.links[0] : streamId);

            console.log(`[Newznab] Downloading container. StreamID: ${streamId}, Hash: ${stream?.file?.hash}, Link: ${stream?.links?.[0]}, Using: ${downloadId}`);

            // If downloadId is a URL (external link), download directly
            if (downloadId.startsWith('http')) {
                console.log(`[Newznab] Direct download from external link: ${downloadId}`);
                const response = await fetch(downloadId);
                if (!response.ok) {
                    throw new Error(`External download failed: ${response.status} ${response.statusText}`);
                }
                const buffer = await response.arrayBuffer();
                nzbData = Buffer.from(buffer);
            } else {
                // Otherwise use Orionoid proxy
                nzbData = await this.orionoidClient.downloadContainer(downloadId);
            }

            // Generate filename
            let filename = stream?.file?.name ? `${stream.file.name}.nzb` : `${streamId}.nzb`;

            if (req.query && (req.query as any).name) {
                filename = `${(req.query as any).name}.nzb`;
            }

            // Send NZB file
            reply.header('Content-Type', 'application/x-nzb');
            reply.header('Content-Disposition', `attachment; filename="${filename}"`);
            reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            reply.header('Pragma', 'no-cache');
            reply.header('Expires', '0');
            reply.send(nzbData);
        } catch (error) {
            console.error('Download error:', (error as Error).message);
            this.sendError(reply, NEWZNAB_ERRORS.API_ERROR, (error as Error).message);
        }
    }

    /**
     * Build Orionoid search parameters from Newznab parameters
     */
    private buildOrionoidParams(params: NewznabSearchParams, overrideType?: 'movie' | 'show'): Partial<OrionoidSearchParams> {
        const orionoidParams: Partial<OrionoidSearchParams> = {
            type: overrideType || (params.t === 'movie' ? 'movie' : 'show'),
        };

        // IMDB ID
        if (params.imdbid) {
            orionoidParams.idimdb = params.imdbid.replace('tt', '');
        }

        // TVDB ID
        if (params.tvdbid) {
            orionoidParams.idtvdb = params.tvdbid;
        }

        // TMDb ID
        if (params.tmdbid) {
            orionoidParams.idtmdb = params.tmdbid;
        }

        // Trakt ID
        if (params.traktid) {
            orionoidParams.idtrakt = params.traktid;
        }

        // TVRage ID
        if (params.rid) {
            orionoidParams.idtvrage = params.rid;
        }

        // Season/Episode
        if (params.season) {
            orionoidParams.numberseason = parseInt(params.season.replace(/^S/i, ''), 10);
        }

        if (params.ep) {
            orionoidParams.numberepisode = parseInt(params.ep.replace(/^E/i, ''), 10);
        }

        // Query
        if (params.q) {
            orionoidParams.query = params.q === 'mp3' ? '1080p' : params.q;
        }

        // Limit - Hard limit to 20
        const limit = 20;
        orionoidParams.limitcount = limit;

        // Offset
        if (params.offset) {
            orionoidParams.limitoffset = params.offset;
        }

        // Stream type (usenet only if configured)
        orionoidParams.streamtype = 'usenet';

        // Preferred languages - sneak it in!
        if (this.config.features.preferredLanguages) {
            orionoidParams.sortLanguages = this.config.features.preferredLanguages;
        }

        orionoidParams.sortvalue = 'timeadded';
        orionoidParams.sortorder = 'descending';

        return orionoidParams;
    }

    /**
     * Get stream categories for filtering
     */
    private getStreamCategories(stream: OrionoidStream, contentType: 'movie' | 'show'): string[] {
        return mapToNewznabCategories(stream, contentType);
    }

    /**
     * Extract stream ID from GUID
     */
    private extractStreamId(guid: string): string {
        // GUID format: http://baseurl/details/STREAM_ID
        const parts = guid.split('/');
        return parts[parts.length - 1];
    }

    /**
     * Send search results XML
     */
    private sendSearchResults(reply: FastifyReply, items: NewznabItem[], offset: number, total: number): void {
        const xml = buildSearchResultsXml(items, offset, total, this.config.newznab.serverName, this.config.server.baseUrl);
        reply.header('Content-Type', 'application/xml');
        reply.send(xml);
    }

    /**
     * Send error XML
     */
    private sendError(reply: FastifyReply, code: string, description: string): void {
        const xml = buildErrorXml({ code, description });
        reply.header('Content-Type', 'application/xml');
        reply.send(xml);
    }
}
