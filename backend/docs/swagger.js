const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger definition
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PropTech Platform API',
      version: '1.0.0',
      description: 'API documentation for the PropTech Platform',
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:4000',
        description: 'Development Server',
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
  },
  // Path to the API docs
  apis: [
    './routes/*.js', 
    // Add any other paths where you have your Swagger comments
  ],
};

// Initialize swagger-jsdoc
const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
  }),
  // Function to export docs to a JSON file
  exportJson: () => {
    return JSON.stringify(specs, null, 2);
  },
};