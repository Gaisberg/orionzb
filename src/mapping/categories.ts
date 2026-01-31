import { NEWZNAB_CATEGORIES } from '../newznab/types.js';
import { OrionoidStream } from '../orionoid/types.js';

/**
 * Map Orionoid stream to Newznab category IDs
 */
export function mapToNewznabCategories(stream: OrionoidStream, contentType: 'movie' | 'show'): string[] {
    const categories: string[] = [];

    // Base category
    if (contentType === 'movie') {
        categories.push(NEWZNAB_CATEGORIES.MOVIES);
    } else {
        categories.push(NEWZNAB_CATEGORIES.TV);
    }

    // Quality-based subcategory
    const quality = stream.video.quality.toLowerCase();

    if (contentType === 'movie') {
        if (quality.includes('8k') || quality.includes('hd8k')) {
            categories.push(NEWZNAB_CATEGORIES.MOVIES_UHD);
        } else if (quality.includes('6k') || quality.includes('hd6k')) {
            categories.push(NEWZNAB_CATEGORIES.MOVIES_UHD);
        } else if (quality.includes('4k') || quality.includes('hd4k') || quality.includes('2160p')) {
            categories.push(NEWZNAB_CATEGORIES.MOVIES_UHD);
        } else if (quality.includes('2k') || quality.includes('hd2k')) {
            categories.push(NEWZNAB_CATEGORIES.MOVIES_HD);
        } else if (quality.includes('1080') || quality.includes('hd1080')) {
            categories.push(NEWZNAB_CATEGORIES.MOVIES_HD);
        } else if (quality.includes('720') || quality.includes('hd720')) {
            categories.push(NEWZNAB_CATEGORIES.MOVIES_HD);
        } else if (quality.includes('sd')) {
            categories.push(NEWZNAB_CATEGORIES.MOVIES_SD);
        }

        // BluRay
        if (stream.meta.release?.toLowerCase().includes('bluray') ||
            stream.meta.release?.toLowerCase().includes('bdrip') ||
            stream.meta.release?.toLowerCase().includes('bdrmx')) {
            categories.push(NEWZNAB_CATEGORIES.MOVIES_BLURAY);
        }

        // 3D
        if (stream.video['3d']) {
            categories.push(NEWZNAB_CATEGORIES.MOVIES_3D);
        }
    } else {
        // TV categories
        if (quality.includes('8k') || quality.includes('hd8k')) {
            categories.push(NEWZNAB_CATEGORIES.TV_UHD);
        } else if (quality.includes('6k') || quality.includes('hd6k')) {
            categories.push(NEWZNAB_CATEGORIES.TV_UHD);
        } else if (quality.includes('4k') || quality.includes('hd4k') || quality.includes('2160p')) {
            categories.push(NEWZNAB_CATEGORIES.TV_UHD);
        } else if (quality.includes('2k') || quality.includes('hd2k')) {
            categories.push(NEWZNAB_CATEGORIES.TV_HD);
        } else if (quality.includes('1080') || quality.includes('hd1080')) {
            categories.push(NEWZNAB_CATEGORIES.TV_HD);
        } else if (quality.includes('720') || quality.includes('hd720')) {
            categories.push(NEWZNAB_CATEGORIES.TV_HD);
        } else if (quality.includes('sd')) {
            categories.push(NEWZNAB_CATEGORIES.TV_SD);
        }
    }

    // If no quality subcategory was added, add a default
    if (categories.length === 1) {
        if (contentType === 'movie') {
            categories.push(NEWZNAB_CATEGORIES.MOVIES_OTHER);
        } else {
            categories.push(NEWZNAB_CATEGORIES.TV_OTHER);
        }
    }

    return categories;
}

/**
 * Get all available Newznab categories
 */
export function getAllCategories() {
    return [
        {
            id: NEWZNAB_CATEGORIES.MOVIES,
            name: 'Movies',
            subcat: [
                { id: NEWZNAB_CATEGORIES.MOVIES_FOREIGN, name: 'Foreign' },
                { id: NEWZNAB_CATEGORIES.MOVIES_OTHER, name: 'Other' },
                { id: NEWZNAB_CATEGORIES.MOVIES_SD, name: 'SD' },
                { id: NEWZNAB_CATEGORIES.MOVIES_HD, name: 'HD' },
                { id: NEWZNAB_CATEGORIES.MOVIES_UHD, name: 'UHD' },
                { id: NEWZNAB_CATEGORIES.MOVIES_BLURAY, name: 'BluRay' },
                { id: NEWZNAB_CATEGORIES.MOVIES_3D, name: '3D' },
            ],
        },
        {
            id: NEWZNAB_CATEGORIES.TV,
            name: 'TV',
            subcat: [
                { id: NEWZNAB_CATEGORIES.TV_FOREIGN, name: 'Foreign' },
                { id: NEWZNAB_CATEGORIES.TV_SD, name: 'SD' },
                { id: NEWZNAB_CATEGORIES.TV_HD, name: 'HD' },
                { id: NEWZNAB_CATEGORIES.TV_UHD, name: 'UHD' },
                { id: NEWZNAB_CATEGORIES.TV_OTHER, name: 'Other' },
                { id: NEWZNAB_CATEGORIES.TV_SPORT, name: 'Sport' },
                { id: NEWZNAB_CATEGORIES.TV_ANIME, name: 'Anime' },
                { id: NEWZNAB_CATEGORIES.TV_DOCUMENTARY, name: 'Documentary' },
            ],
        },
    ];
}

/**
 * Check if a category matches the requested categories
 */
export function matchesCategory(streamCategories: string[], requestedCategories: string[]): boolean {
    if (requestedCategories.length === 0) {
        return true; // No filter, match all
    }

    // Check if any of the stream's categories match the requested ones
    return streamCategories.some(cat => requestedCategories.includes(cat));
}
