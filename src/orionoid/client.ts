import fetch from 'node-fetch';
import { OrionoidConfig } from '../config.js';
import {
    OrionoidSearchParams,
    OrionoidSearchResponse,
    OrionoidErrorResponse,
} from './types.js';

const ORIONOID_API_URL = 'https://api.orionoid.com';

export class OrionoidClient {
    private appKey?: string;
    private userKey?: string;

    constructor(config: OrionoidConfig) {
        this.appKey = config.appKey;
        this.userKey = config.userKey;
    }

    /**
     * Search for streams on Orionoid
     */
    async searchStreams(params: Partial<OrionoidSearchParams>): Promise<OrionoidSearchResponse> {
        const searchParams: OrionoidSearchParams = {
            mode: 'stream',
            action: 'retrieve',
            ...this.getAuthParams(),
            ...params,
        } as OrionoidSearchParams;

        const response = await this.makeRequest(searchParams);
        return response as OrionoidSearchResponse;
    }

    /**
     * Get a specific stream by ID
     */
    async getStreamById(id: string): Promise<OrionoidSearchResponse> {
        const params: any = {};

        // If ID is 32 chars (Orionoid ID), pass it as 'idorion'
        // If ID is 40 chars (SHA1), pass it as 'filehash'
        // Otherwise treat as text query
        if (id.length === 32) {
            params.idorion = id;
        } else if (id.length === 40) {
            params.filehash = id;
        } else {
            params.query = id;
        }

        params.limitcount = 1;

        return this.searchStreams(params);
    }

    /**
     * Download a container (NZB or torrent file)
     */
    async downloadContainer(id: string): Promise<Buffer> {
        const params = {
            mode: 'container',
            action: 'download',
            ...this.getAuthParams(),
            id,
        };

        console.log(`[Orionoid] Downloading container: ${id}`);
        // Log parameters for debugging
        console.log(`[Orionoid] Params: mode=${params.mode}, action=${params.action}, id=${params.id}`);

        // Use GET request with query parameters
        const url = this.buildUrl(params);

        const response = await fetch(url, {
            method: 'GET',
        });

        // Note: We've relaxed error checking here because:
        // 1. External links might return different status codes
        // 2. Content-Type headers might be misleading (e.g. application/json for a file)

        if (!response.ok) {
            console.warn(`[Orionoid] Download response status: ${response.status} ${response.statusText}`);
            // We continue processing even if status is not OK, as it might contain valid data
        }

        const contentType = response.headers.get('content-type');

        // Check if response is explicitly an error JSON from Orionoid
        if (contentType?.includes('application/json')) {
            try {
                // Peek at the body to see if it's an error structure
                const clone = response.clone();
                const error = await clone.json() as OrionoidErrorResponse;
                if (error && error.result && error.result.status === 'error') {
                    throw new Error(`Orionoid error: ${error.result.description}`);
                }
            } catch (e) {
                // Not a valid error JSON, or we want to treat it as file content
                console.warn('[Orionoid] Received JSON content type, but parsing as file content due to loose checks.');
            }
        }

        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer);
    }

    /**
     * Get container hashes
     */
    async getContainerHashes(links: string[]): Promise<Record<string, string>> {
        const params = {
            mode: 'container',
            action: 'hash',
            ...this.getAuthParams(),
        };

        const formData = new URLSearchParams(params as Record<string, string>);
        links.forEach(link => {
            formData.append('links[]', link);
        });

        const response = await fetch(ORIONOID_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        const data = await response.json() as any;

        if (data.result.status === 'error') {
            throw new Error(`Orionoid error: ${data.result.description}`);
        }

        return data.data.hashes;
    }

    /**
     * Make a request to the Orionoid API
     */
    private async makeRequest(params: Record<string, any>): Promise<OrionoidSearchResponse | OrionoidErrorResponse> {
        const url = this.buildUrl(params);

        const response = await fetch(url, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json() as OrionoidSearchResponse | OrionoidErrorResponse;

        if (data.result.status === 'error') {
            // Check for "No Streams Found" - this is not a fatal error for Newznab/Hydra
            // Orionoid returns type "streammissing" when no results are found
            if (data.result.type === 'streammissing' || data.result.description?.includes('No Streams Found')) {
                // Return an empty search response
                return {
                    name: data.name,
                    version: data.version,
                    result: {
                        status: 'success', // Fake success for our internal logic
                        type: 'streammissing',
                        description: data.result.description,
                        message: data.result.message
                    },
                    data: {
                        type: params.type as 'movie' | 'show' || 'movie',
                        count: {
                            total: 0,
                            requested: params.limitcount || 0,
                            retrieved: 0
                        },
                        streams: [],
                        requests: {
                            total: 0,
                            daily: {
                                limit: 0,
                                used: 0,
                                remaining: 0
                            }
                        }
                    }
                } as OrionoidSearchResponse;
            }

            // Provide helpful message for token expiration
            if (data.result.type === 'apitokenexpired' || data.result.description?.includes('Token Expired')) {
                throw new Error(
                    `Orionoid API error: ${data.result.description} - ${data.result.message}\n\n` +
                    `Your authentication credentials have expired or are invalid.\n` +
                    `Please check ORIONOID_APP_KEY and ORIONOID_USER_KEY in your .env file.`
                );
            }

            throw new Error(`Orionoid API error: ${data.result.description} - ${data.result.message}`);
        }

        return data;
    }

    /**
     * Build URL with query parameters
     */
    private buildUrl(params: Record<string, any>): string {
        const searchParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
            }
        });

        return `${ORIONOID_API_URL}?${searchParams.toString()}`;
    }

    /**
     * Get authentication parameters
     */
    private getAuthParams(): { keyapp: string; keyuser: string } {
        if (this.appKey && this.userKey) {
            return {
                keyapp: this.appKey,
                keyuser: this.userKey,
            };
        }

        throw new Error('No valid authentication credentials provided');
    }
}
