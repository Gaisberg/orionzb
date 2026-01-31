import Fastify, { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { Config } from './config.js';
import { OrionoidClient } from './orionoid/client.js';

import { NewznabHandlers } from './newznab/handlers.js';
import { newznabRouter } from './newznab/router.js';

/**
 * Create and configure Fastify server
 */
export function createServer(config: Config): FastifyInstance {
  const app = Fastify({
    logger: true, // Native logger is better
    disableRequestLogging: false
  });

  // Register Swagger (OpenAPI 3.0)
  app.register(swagger, {
    openapi: {
      info: {
        title: config.newznab.serverName,
        description: config.newznab.serverDescription,
        version: '1.0.0'
      },
      servers: [
        {
          url: `http://${config.server.host === '0.0.0.0' ? 'localhost' : config.server.host}:${config.server.port}`
        }
      ]
    }
  });

  app.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    },
    staticCSP: false, // Disable CSP for local dev to avoid blank page
  });

  // CORS - Fastify has its own CORS plugin, but manual header injection works too for simple cases
  app.addHook('onRequest', (_req, reply, done) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type');
    done();
  });

  // Initialize services
  const orionoidClient = new OrionoidClient(config.orionoid);
  const newznabHandlers = new NewznabHandlers(orionoidClient, config);

  // Register routes
  app.register(newznabRouter, { handlers: newznabHandlers });

  // Root endpoint
  app.get('/', async (_req, reply) => {
    reply.redirect('/documentation');
  });

  // Details route (redirect)
  app.get('/details/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    reply.redirect(`/api?t=details&guid=${id}&apikey=${config.newznab.apiKey}`);
  });

  return app;
}
