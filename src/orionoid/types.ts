/**
 * Orionoid API Types
 * Based on the official Orionoid API documentation
 */

export interface OrionoidSearchParams {
    mode: 'stream';
    action: 'retrieve';
    keyapp?: string;
    keyuser?: string;
    type: 'movie' | 'show';
    query?: string;
    idorion?: string;
    idimdb?: string;
    idtmdb?: string;
    idtvdb?: string;
    idtvrage?: string;
    idtrakt?: string;
    idslug?: string;
    numberseason?: number;
    numberepisode?: number;
    limitcount?: number;
    limitretry?: number;
    limitoffset?: number;
    limitpage?: number;
    streamtype?: string; // 'torrent' | 'usenet' | 'hoster'
    audiolanguages?: string;
    videoquality?: string;
    sortvalue?: string;
    sortorder?: 'ascending' | 'descending';
    [key: string]: string | number | undefined;
}

export interface OrionoidTime {
    added: number;
    updated: number;
}

export interface OrionoidFile {
    hash: string;
    name: string;
    size: number;
    pack: boolean;
}

export interface OrionoidMeta {
    release: string | null;
    uploader: string | null;
    edition: string | null;
}

export interface OrionoidVideo {
    quality: string;
    codec: string;
    '3d': boolean;
}

export interface OrionoidAudio {
    type: string;
    channels: number;
    system: string | null;
    codec: string | null;
    languages: string[];
}

export interface OrionoidSubtitle {
    type: string | null;
    languages: string[];
}

export interface OrionoidPopularity {
    count: number;
    percent: number;
}

export interface OrionoidStreamInfo {
    type: 'torrent' | 'usenet' | 'hoster';
    source: string;
    hoster: string | null;
    seeds: number;
    time: number;
}

export interface OrionoidAccess {
    direct: boolean;
    premiumize?: boolean;
    offcloud?: boolean;
    torbox?: boolean;
    debrider?: boolean;
    easydebrid?: boolean;
    realdebrid?: boolean;
    debridlink?: boolean;
    alldebrid?: boolean;
}

export interface OrionoidStream {
    id: string;
    time: OrionoidTime;
    links: string[];
    stream: OrionoidStreamInfo;
    access: OrionoidAccess;
    file: OrionoidFile;
    meta: OrionoidMeta;
    video: OrionoidVideo;
    audio: OrionoidAudio;
    subtitle: OrionoidSubtitle;
    popularity: OrionoidPopularity;
}

export interface OrionoidMovieInfo {
    id: {
        orion: string;
        imdb?: string;
        tmdb?: string;
    };
    time: OrionoidTime;
    meta: {
        title: string;
        year: number;
    };
    popularity: OrionoidPopularity;
}

export interface OrionoidShowInfo {
    id: {
        orion: string;
        imdb?: string;
        tvdb?: string;
        tvrage?: string;
        trakt?: string;
    };
    time: OrionoidTime;
    meta: {
        title: string;
        year: number;
    };
    popularity: OrionoidPopularity;
}

export interface OrionoidCount {
    total: number;
    requested: number;
    retrieved: number;
}

export interface OrionoidRequests {
    total: number;
    daily: {
        limit: number;
        used: number;
        remaining: number;
    };
}

export interface OrionoidSearchResponse {
    name: string;
    version: string;
    result: {
        status: 'success' | 'error';
        type: string;
        description: string;
        message: string;
    };
    data?: {
        type: 'movie' | 'show';
        movie?: OrionoidMovieInfo;
        show?: OrionoidShowInfo;
        count: OrionoidCount;
        streams: OrionoidStream[];
        requests: OrionoidRequests;
    };
}

export interface OrionoidErrorResponse {
    name: string;
    version: string;
    result: {
        status: 'error';
        type: string;
        description: string;
        message: string;
    };
}
