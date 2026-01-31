import { loadConfig, validateConfig } from './config.js';
import { createServer } from './server.js';

/**
 * Main application entry point
 */
async function main() {
    try {

        // Load and validate configuration
        const config = loadConfig();
        validateConfig(config);

        // Create and start server
        const app = createServer(config);

        await app.listen({ port: config.server.port, host: config.server.host });

        // Graceful shutdown
        const shutdown = async () => {
            await app.close();
            process.exit(0);

            // Force shutdown after 10 seconds
            setTimeout(() => {
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

// Run the application
main();
