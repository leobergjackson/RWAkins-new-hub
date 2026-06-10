/**
 * Swagger UI documentation routes.
 *
 * - GET /api/docs      — Swagger UI interactive explorer
 * - GET /api/docs/json — Raw OpenAPI 3.0 JSON specification
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateSwaggerSpec } from '../swagger.js';
import { logger } from '../utils/logger.js';

/**
 * Register Swagger UI documentation routes on the given Express router.
 */
export function registerDocsRoutes(router: Router): void {
  // Generate spec once at startup
  const spec = generateSwaggerSpec();

  // Serve raw JSON spec at /api/docs/json
  router.get('/docs/json', (_req, res) => {
    res.json(spec);
  });

  // Serve Swagger UI at /api/docs
  // swagger-ui-express needs setup + serve as middleware
  const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
    customCss: `
      .swagger-ui .topbar { background-color: #0a0e1a; }
      .swagger-ui .topbar .download-url-wrapper { display: none; }
      .swagger-ui .info .title { color: #85c742; }
      .swagger-ui .scheme-container { background-color: #111827; }
    `,
    customSiteTitle: 'AeroFyta API Docs',
    customfavIcon: 'https://raw.githubusercontent.com/agdanish/aerofyta/main/dashboard/public/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 2,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  };

  router.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(spec as swaggerUi.JsonObject, swaggerUiOptions),
  );

  logger.info('Swagger UI docs registered at /api/docs, JSON spec at /api/docs/json');
}
