import { NewznabItem } from '../newznab/types.js';
import { OrionoidStream } from '../orionoid/types.js';
import { mapToNewznabCategories } from './categories.js';
import { mapToNewznabAttributes } from './attributes.js';

/**
 * Transform Orionoid stream to Newznab item
 */
export function transformStreamToNewznabItem(
    stream: OrionoidStream,
    contentType: 'movie' | 'show',
    baseUrl: string,
    imdbId?: string,
    tvdbId?: string
): NewznabItem {
    // Map categories
    const categories = mapToNewznabCategories(stream, contentType);

    // Build title from filename
    const title = stream.file.name || 'Unknown';

    // Use stream ID for GUID/DETAILS to ensure reliable lookup
    const detailsId = stream.id;

    // Generate GUID (Base32 ID for details lookup)
    const guidValue = detailsId;
    const detailsLink = `${baseUrl}/details/${detailsId}`;

    // Build download link (Hash for container download)
    // Use Hash if available (most reliable), otherwise use Orion ID.
    // Do NOT use the full external link as ID in the URL, as it causes issues with clients like Hydra.
    // The handler will resolve the external link from the ID if needed.
    const downloadId = stream.file.hash || stream.id;

    // Add name parameter to ensure correct filename during download
    const encodedName = encodeURIComponent(title);
    const downloadLink = `${baseUrl}/api?t=get&id=${encodeURIComponent(downloadId)}&name=${encodedName}`;

    // Publication date
    const pubDate = new Date(stream.time.added * 1000).toUTCString();

    // Category string (human readable)
    const categoryStr = contentType === 'movie' ? 'Movies' : 'TV';

    // Description
    const description = buildDescription(stream, contentType);

    // Map attributes
    const attributes = mapToNewznabAttributes(stream, categories, contentType, imdbId, tvdbId);

    return {
        title,
        guid: {
            value: guidValue,
            isPermaLink: false,
        },
        link: detailsLink, // Link points to details page
        comments: detailsLink,
        pubDate,
        category: categoryStr,
        description,
        enclosure: {
            url: downloadLink,
            length: stream.file.size || 0,
            type: 'application/x-nzb',
        },
        attributes,
    };
}

/**
 * Build a description for the item
 */
function buildDescription(stream: OrionoidStream, _contentType: 'movie' | 'show'): string {
    const parts: string[] = [];

    // Quality
    if (stream.video.quality) {
        parts.push(`Quality: ${stream.video.quality}`);
    }

    // Codec
    if (stream.video.codec) {
        parts.push(`Codec: ${stream.video.codec}`);
    }

    // Audio
    if (stream.audio.channels) {
        const audioStr = stream.audio.channels === 2 ? 'Stereo' :
            stream.audio.channels === 6 ? '5.1' :
                stream.audio.channels === 8 ? '7.1' :
                    `${stream.audio.channels}ch`;
        parts.push(`Audio: ${audioStr}`);
    }

    // Language
    if (stream.audio.languages && stream.audio.languages.length > 0) {
        parts.push(`Language: ${stream.audio.languages.join(', ')}`);
    }

    // Size
    if (stream.file.size) {
        const sizeGB = (stream.file.size / (1024 * 1024 * 1024)).toFixed(2);
        parts.push(`Size: ${sizeGB} GB`);
    }

    // Release type
    if (stream.meta.release) {
        parts.push(`Release: ${stream.meta.release}`);
    }

    // Seeds (for torrents)
    if (stream.stream.type === 'torrent' && stream.stream.seeds) {
        parts.push(`Seeds: ${stream.stream.seeds}`);
    }

    return parts.join(' | ');
}
