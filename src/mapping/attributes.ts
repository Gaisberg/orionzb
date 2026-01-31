import { NewznabAttribute } from '../newznab/types.js';
import { OrionoidStream } from '../orionoid/types.js';

import { parseTorrentTitle } from '@viren070/parse-torrent-title';

/**
 * Map Orionoid stream to Newznab attributes
 */
export function mapToNewznabAttributes(
    stream: OrionoidStream,
    categories: string[],
    contentType: 'movie' | 'show',
    imdbId?: string,
    tvdbId?: string
): NewznabAttribute[] {
    const attributes: NewznabAttribute[] = [];
    const filename = stream.file.name || '';
    const info = parseTorrentTitle(filename);

    // Categories
    categories.forEach(cat => {
        attributes.push({ name: 'category', value: cat });
    });

    // Size
    if (stream.file.size) {
        attributes.push({ name: 'size', value: stream.file.size.toString() });
    }

    // Season / Episode from Parser
    if (contentType === 'show') {
        if (info.seasons && info.seasons.length > 0) {
            attributes.push({ name: 'season', value: info.seasons[0].toString() });
        }

        if (info.episodes && info.episodes.length > 0) {
            attributes.push({ name: 'episode', value: info.episodes[0].toString() });
        }

        // TV rage ID (if available)
        if (tvdbId) {
            attributes.push({ name: 'tvdbid', value: tvdbId });
        }
    }

    // IMDB ID
    if (imdbId) {
        attributes.push({ name: 'imdb', value: imdbId });
    }

    // Grabs (popularity)
    if (stream.popularity.count) {
        attributes.push({ name: 'grabs', value: stream.popularity.count.toString() });
    }

    // Seeders (for torrents)
    if (stream.stream.type === 'torrent' && stream.stream.seeds) {
        attributes.push({ name: 'seeders', value: stream.stream.seeds.toString() });
        // Estimate peers as seeders * 2
        attributes.push({ name: 'peers', value: (stream.stream.seeds * 2).toString() });
    }

    // Usenet date
    if (stream.time.added) {
        const date = new Date(stream.time.added * 1000);
        attributes.push({ name: 'usenetdate', value: date.toUTCString() });
    }

    // Group (for usenet)
    if (stream.stream.type === 'usenet') {
        // Use parser group if available, otherwise generic
        const group = info.group || 'alt.binaries.orion';
        attributes.push({ name: 'group', value: group });
    }

    // Video quality (Prefer parser, fallback to Orionoid)
    if (info.resolution) {
        attributes.push({ name: 'video', value: info.resolution });
    } else if (stream.video.quality) {
        attributes.push({ name: 'video', value: stream.video.quality });
    }

    // Video codec
    if (info.codec) {
        attributes.push({ name: 'codec', value: info.codec });
    } else if (stream.video.codec) {
        attributes.push({ name: 'codec', value: stream.video.codec });
    }

    // Audio
    if (info.channels && info.channels.length > 0) {
        attributes.push({ name: 'audio', value: info.channels[0] });
    } else if (stream.audio.channels) {
        attributes.push({ name: 'audio', value: stream.audio.channels.toString() });
    }

    // Language
    if (info.languages && info.languages.length > 0) {
        attributes.push({ name: 'language', value: info.languages.join(',') });
    } else if (stream.audio.languages && stream.audio.languages.length > 0) {
        attributes.push({ name: 'language', value: stream.audio.languages.join(',') });
    }

    // Subtitles - Parser doesn't explicitly separate subs from "languages" often, 
    // but we can look for specific flags if we want. For now, we'll keep Orionoid's data for subs as it's separate.
    if (stream.subtitle.languages && stream.subtitle.languages.length > 0) {
        attributes.push({ name: 'subs', value: stream.subtitle.languages.join(',') });
    }

    return attributes;
}
