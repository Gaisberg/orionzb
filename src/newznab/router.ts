import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { NewznabHandlers } from './handlers.js';

/**
 * Register Newznab API routes
 */
export interface NewznabRouterOptions {
    handlers: NewznabHandlers;
}

/**
 * Register Newznab API routes
 */
export async function newznabRouter(fastify: FastifyInstance, opts: NewznabRouterOptions) {
    const { handlers } = opts;

    // Schema for Query Parameters to generate Swagger docs
    const querySchema = {
        type: 'object',
        properties: {
            t: {
                type: 'string',
                enum: ['caps', 'search', 'tvsearch', 'movie', 'details', 'get'],
                description: 'Function to execute'
            },
            apikey: { type: 'string', description: 'API Key' },
            q: { type: 'string', description: 'Search query' },
            cat: { type: 'string', description: 'Categories (comma separated)' },
            limit: { type: 'integer', default: 50, description: 'Number of results' },
            offset: { type: 'integer', default: 0, description: 'Offset' },
            maxage: { type: 'integer', description: 'Max age in days' },
            season: { type: 'string', description: 'Season number' },
            ep: { type: 'string', description: 'Episode number' },
            imdbid: { type: 'string', description: 'IMDB ID' },
            tvdbid: { type: 'string', description: 'TVDB ID' },
            tmdbid: { type: 'string', description: 'TheMovieDB ID' },
            traktid: { type: 'string', description: 'Trakt ID' },
            rid: { type: 'string', description: 'TVRage ID' },
            id: { type: 'string', description: 'ID for get/details' },
            guid: { type: 'string', description: 'GUID for details' },
            name: { type: 'string', description: 'Filename for download' },
            extended: { type: 'string' },
            del: { type: 'string' },
            o: { type: 'string', enum: ['xml', 'json'] },

        },
        required: ['t']
    };

    // Main API endpoint
    fastify.get('/api', {
        schema: {
            description: 'Main Newznab API Endpoint',
            tags: ['Newznab'],
            querystring: querySchema,
            response: {
                200: {
                    content: {
                        'application/xml': {
                            schema: { type: 'string' }
                        },
                        'application/x-nzb': {
                            schema: { type: 'string', format: 'binary' }
                        }
                    }
                }
            }
        }
    }, async (req: FastifyRequest, reply: FastifyReply) => {
        const { t } = req.query as any;

        try {
            switch (t) {
                case 'caps':
                    await handlers.handleCaps(req, reply);
                    break;

                case 'search':
                case 'tvsearch':
                case 'movie':
                    await handlers.handleSearch(req, reply);
                    break;

                case 'details':
                    await handlers.handleDetails(req, reply);
                    break;

                case 'get':
                    await handlers.handleGet(req, reply);
                    break;

                default:
                    reply.status(400).send('Invalid function. Use t=caps, t=search, t=tvsearch, t=movie, t=details, or t=get');
            }
        } catch (error) {
            console.error('Router error:', error);
            reply.status(500).send('Internal server error');
        }
    });

    // Health check endpoint
    fastify.get('/health', {
        schema: {
            description: 'Health check',
            tags: ['System'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        service: { type: 'string' }
                    }
                }
            }
        }
    }, async (_req, reply) => {
        reply.send({ status: 'ok', service: 'orionzb' });
    });
}
