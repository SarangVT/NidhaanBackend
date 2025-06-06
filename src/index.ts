import express from "express"
import { expressMiddleware } from '@as-integrations/express5';
import cors from "cors"
import bodyParser from "body-parser"
import createApolloGraphQlServer from "./graphql";
import { router } from "./routes";

async function serverInit() {
    const app = express()
    const PORT = Number(process.env.PORT) || 8000;
    app.use(express.json())

    app.use(cors());
    app.use(bodyParser.json());

    app.use('/', router)

    app.use(
    '/v1/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(await createApolloGraphQlServer()),
    );

    app.listen(PORT, () => console.log(`Server started at ${PORT}`));
}

serverInit();
