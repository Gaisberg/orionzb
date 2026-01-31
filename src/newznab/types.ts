/**
 * Newznab API Types
 * Based on the Newznab API specification
 */

export interface NewznabSearchParams {
    t: 'caps' | 'search' | 'tvsearch' | 'movie' | 'details' | 'get';
    apikey?: string;
    q?: string;
    limit?: number;
    cat?: string;
    offset?: number;
    maxage?: number;
    imdbid?: string;
    tvdbid?: string;
    tmdbid?: string;
    traktid?: string;
    tvmazeid?: string;
    rid?: string;
    season?: string;
    ep?: string;
    extended?: '1' | '0';
    del?: '1' | '0';
    o?: 'json' | 'xml';
    id?: string;
    guid?: string;
}

export interface NewznabAttribute {
    name: string;
    value: string;
}

export interface NewznabItem {
    title: string;
    guid: {
        value: string;
        isPermaLink: boolean;
    };
    link: string;
    comments?: string;
    pubDate: string;
    category: string;
    description?: string;
    enclosure: {
        url: string;
        length: number;
        type: string;
    };
    attributes: NewznabAttribute[];
}

export interface NewznabCategory {
    id: string;
    name: string;
    description?: string;
    subcat?: NewznabCategory[];
}

export interface NewznabCaps {
    server: {
        version: string;
        title: string;
        strapline: string;
        email?: string;
        url: string;
        image?: string;
    };
    limits: {
        max: number;
        default: number;
    };
    retention: {
        days: number;
    };
    registration: {
        available: 'yes' | 'no';
        open: 'yes' | 'no';
    };
    searching: {
        search: {
            available: 'yes' | 'no';
            supportedParams: string;
        };
        'tv-search': {
            available: 'yes' | 'no';
            supportedParams: string;
        };
        'movie-search': {
            available: 'yes' | 'no';
            supportedParams: string;
        };
        'audio-search'?: {
            available: 'yes' | 'no';
            supportedParams: string;
        };
    };
    categories: NewznabCategory[];
}

export interface NewznabError {
    code: string;
    description: string;
}

// Standard Newznab category IDs
export const NEWZNAB_CATEGORIES = {
    MOVIES: '2000',
    MOVIES_FOREIGN: '2010',
    MOVIES_OTHER: '2020',
    MOVIES_SD: '2030',
    MOVIES_HD: '2040',
    MOVIES_UHD: '2045',
    MOVIES_BLURAY: '2050',
    MOVIES_3D: '2060',

    TV: '5000',
    TV_FOREIGN: '5020',
    TV_SD: '5030',
    TV_HD: '5040',
    TV_UHD: '5045',
    TV_OTHER: '5050',
    TV_SPORT: '5060',
    TV_ANIME: '5070',
    TV_DOCUMENTARY: '5080',
} as const;

// Newznab error codes
export const NEWZNAB_ERRORS = {
    INCORRECT_USER_CREDENTIALS: '100',
    ACCOUNT_SUSPENDED: '101',
    INSUFFICIENT_PRIVILEGES: '102',
    REGISTRATION_DENIED: '103',
    REGISTRATIONS_CLOSED: '104',
    INVALID_EMAIL: '105',

    MISSING_PARAMETER: '200',
    INCORRECT_PARAMETER: '201',
    API_ERROR: '202',
    FUNCTION_NOT_AVAILABLE: '203',

    NO_SUCH_ITEM: '300',
    ITEM_ALREADY_EXISTS: '301',
} as const;
