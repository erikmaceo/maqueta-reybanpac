// ===========================================================================
// API Gateway — Swagger / OpenAPI specification
// ===========================================================================

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CAM API Gateway',
      version: '1.0.0',
      description:
        'API Gateway para consumo de configuración de autorización y segregación por aplicaciones terceras.',
    },
    servers: [
      {
        url: '/api/v1/gateway',
        description: 'Gateway base path',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/gateway/*.ts'],
};

export const gatewaySpec = swaggerJsdoc(options);
