import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

export interface OrionoidConfig {
    appKey?: string;
    userKey?: string;
    token?: string;
}

export interface ServerConfig {
    port: number;
    host: string;
    baseUrl: string;
}

export interface NewznabConfig {
    apiKey: string;
    serverName: string;
    serverDescription: string;
}

export interface FeaturesConfig {
    cacheTTL: number;
    maxResults: number;
    defaultResults: number;
    preferredLanguages: string;
}

export interface Config {
    orionoid: OrionoidConfig;
    server: ServerConfig;
    newznab: NewznabConfig;
    features: FeaturesConfig;
}

/**
 * Load configuration from config.json or environment variables
 */
export function loadConfig(): Config {
    // Try to load from config.json first
    const configPath = path.join(process.cwd(), 'config.json');

    if (fs.existsSync(configPath)) {
        const configFile = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(configFile) as Config;
    }

    // Fall back to environment variables
    return {
        orionoid: {
            appKey: process.env.ORIONOID_APP_KEY || '',
            userKey: process.env.ORIONOID_USER_KEY,
            token: process.env.ORIONOID_TOKEN,
        },
        server: {
            port: parseInt(process.env.SERVER_PORT || '5000', 10),
            host: process.env.SERVER_HOST || '0.0.0.0',
            baseUrl: process.env.SERVER_BASE_URL || 'http://localhost:5000',
        },
        newznab: {
            apiKey: process.env.NEWZNAB_API_KEY || '',
            serverName: process.env.NEWZNAB_SERVER_NAME || 'OrionZB',
            serverDescription: process.env.NEWZNAB_SERVER_DESCRIPTION || 'Orionoid Newznab API',
        },
        features: {
            cacheTTL: parseInt(process.env.CACHE_TTL || '86400', 10),
            maxResults: parseInt(process.env.MAX_RESULTS || '100', 10),
            defaultResults: parseInt(process.env.DEFAULT_RESULTS || '50', 10),
            preferredLanguages: process.env.PREFERRED_LANGUAGES || 'en',
        },
    };
}

/**
 * Validate configuration
 */
export function validateConfig(config: Config): void {
    // Check if we have either token OR (appKey + userKey)
    const hasToken = !!config.orionoid.token;
    const hasKeys = !!config.orionoid.appKey && !!config.orionoid.userKey;

    if (!hasToken && !hasKeys) {
        throw new Error('Either Orionoid token OR (app key + user key) is required');
    }

    if (!config.newznab.apiKey) {
        throw new Error('Newznab API key is required');
    }

    if (config.features.maxResults < 1 || config.features.maxResults > 500) {
        throw new Error('Max results must be between 1 and 500');
    }

    if (config.features.defaultResults < 1 || config.features.defaultResults > config.features.maxResults) {
        throw new Error('Default results must be between 1 and max results');
    }
}
