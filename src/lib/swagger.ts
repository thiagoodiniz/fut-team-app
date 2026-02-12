import swaggerJsDoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { version } from '../../package.json'

const options: swaggerJsDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'FutTeam API Documentation',
            version,
            description: 'API for managing football teams, matches, players, and stats.',
        },
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
    apis: ['./src/app.ts', './src/routes.ts', './src/modules/**/*.ts'],
}

const swaggerSpec = swaggerJsDoc(options)

export { swaggerUi, swaggerSpec }
