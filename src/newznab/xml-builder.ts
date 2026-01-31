import { XMLBuilder } from 'fast-xml-parser';
import { NewznabCaps, NewznabItem, NewznabError } from './types.js';

const xmlBuilder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
    suppressEmptyNode: true,
});

/**
 * Build capabilities XML response
 */
export function buildCapsXml(caps: NewznabCaps): string {
    const capsObj = {
        '?xml': {
            '@_version': '1.0',
            '@_encoding': 'UTF-8',
        },
        caps: {
            server: {
                '@_version': caps.server.version,
                '@_title': caps.server.title,
                '@_strapline': caps.server.strapline,
                '@_email': caps.server.email || '',
                '@_url': caps.server.url,
                '@_image': caps.server.image || '',
            },
            limits: {
                '@_max': caps.limits.max,
                '@_default': caps.limits.default,
            },
            retention: {
                '@_days': caps.retention.days,
            },
            registration: {
                '@_available': caps.registration.available,
                '@_open': caps.registration.open,
            },
            searching: {
                search: {
                    '@_available': caps.searching.search.available,
                    '@_supportedParams': caps.searching.search.supportedParams,
                },
                'tv-search': {
                    '@_available': caps.searching['tv-search'].available,
                    '@_supportedParams': caps.searching['tv-search'].supportedParams,
                },
                'movie-search': {
                    '@_available': caps.searching['movie-search'].available,
                    '@_supportedParams': caps.searching['movie-search'].supportedParams,
                },
            },
            categories: {
                category: caps.categories.map(cat => ({
                    '@_id': cat.id,
                    '@_name': cat.name,
                    ...(cat.description && { '@_description': cat.description }),
                    ...(cat.subcat && {
                        subcat: cat.subcat.map(sub => ({
                            '@_id': sub.id,
                            '@_name': sub.name,
                            ...(sub.description && { '@_description': sub.description }),
                        })),
                    }),
                })),
            },
        },
    };

    return xmlBuilder.build(capsObj);
}

/**
 * Build search results XML response
 */
export function buildSearchResultsXml(
    items: NewznabItem[],
    offset: number,
    total: number,
    serverTitle: string,
    serverUrl: string
): string {
    const rssObj = {
        '?xml': {
            '@_version': '1.0',
            '@_encoding': 'UTF-8',
        },
        rss: {
            '@_version': '2.0',
            '@_xmlns:atom': 'http://www.w3.org/2005/Atom',
            '@_xmlns:newznab': 'http://www.newznab.com/DTD/2010/feeds/attributes/',
            channel: {
                title: serverTitle,
                description: `${serverTitle} API Results`,
                link: serverUrl,
                language: 'en-us',
                'atom:link': {
                    '@_href': `${serverUrl}/api?t=search`, // Approximate self link
                    '@_rel': 'self',
                    '@_type': 'application/rss+xml',
                },
                'newznab:response': {
                    '@_offset': offset,
                    '@_total': total,
                },
                ...(items.length > 0 && {
                    item: items.map(item => ({
                        title: item.title,
                        guid: {
                            '#text': item.guid.value,
                            '@_isPermaLink': item.guid.isPermaLink,
                        },
                        link: item.link,
                        ...(item.comments && { comments: item.comments }),
                        pubDate: item.pubDate,
                        category: item.category,
                        ...(item.description && { description: item.description }),
                        enclosure: {
                            '@_url': item.enclosure.url,
                            '@_length': item.enclosure.length,
                            '@_type': item.enclosure.type,
                        },
                        'newznab:attr': item.attributes.map(attr => ({
                            '@_name': attr.name,
                            '@_value': attr.value,
                        })),
                    })),
                }),
            },
        },
    };

    return xmlBuilder.build(rssObj);
}

/**
 * Build error XML response
 */
export function buildErrorXml(error: NewznabError): string {
    const errorObj = {
        '?xml': {
            '@_version': '1.0',
            '@_encoding': 'UTF-8',
        },
        error: {
            '@_code': error.code,
            '@_description': error.description,
        },
    };

    return xmlBuilder.build(errorObj);
}

/**
 * Build details XML response (single item)
 */
export function buildDetailsXml(item: NewznabItem, serverTitle: string): string {
    const rssObj = {
        '?xml': {
            '@_version': '1.0',
            '@_encoding': 'UTF-8',
        },
        rss: {
            '@_version': '2.0',
            '@_xmlns:atom': 'http://www.w3.org/2005/Atom',
            '@_xmlns:newznab': 'http://www.newznab.com/DTD/2010/feeds/attributes/',
            channel: {
                title: serverTitle,
                description: `${serverTitle} API Results`,
                link: '',
                language: 'en-us',
                item: {
                    title: item.title,
                    guid: {
                        '#text': item.guid.value,
                        '@_isPermaLink': item.guid.isPermaLink,
                    },
                    link: item.link,
                    ...(item.comments && { comments: item.comments }),
                    pubDate: item.pubDate,
                    category: item.category,
                    ...(item.description && { description: item.description }),
                    enclosure: {
                        '@_url': item.enclosure.url,
                        '@_length': item.enclosure.length,
                        '@_type': item.enclosure.type,
                    },
                    'newznab:attr': item.attributes.map(attr => ({
                        '@_name': attr.name,
                        '@_value': attr.value,
                    })),
                },
            },
        },
    };

    return xmlBuilder.build(rssObj);
}
