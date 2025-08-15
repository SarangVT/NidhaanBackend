import express from "express"
import { expressMiddleware } from '@as-integrations/express5';
import cors from "cors"
import bodyParser from "body-parser"
import createApolloGraphQlServer from "./graphql";
import { router } from "./routes";
import type { Request, Response } from "express";

async function serverInit() {
    const app = express()
    const PORT = Number(process.env.PORT) || 8000;
    app.use(express.json())

    app.use(cors({
        origin: "http://localhost:3000",
        credentials: true 
    }));
    app.use(bodyParser.json());

    app.use(
    '/v1/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware<{
        res: Response;
    }>(await createApolloGraphQlServer(), {
        context: async ({ req, res }) => ({ req, res }),
    })    );
    app.use('/', router);
    app.listen(PORT, () => console.log(`Server started at ${PORT}`));
}

serverInit();
