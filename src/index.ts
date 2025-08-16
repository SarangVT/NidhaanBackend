import express from "express";
import { expressMiddleware } from "@as-integrations/express5";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import createApolloGraphQlServer from "./graphql";
import { router } from "./routes";
import type { Response, Request as ExpressRequest } from "express";

export interface RequestWithCookies extends ExpressRequest {
  cookies: Record<string, string>;
}

async function serverInit() {
  const app = express();
  const PORT = Number(process.env.PORT) || 8000;

  app.use(bodyParser.json());
  app.use(cookieParser());
  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );

  const apolloServer = await createApolloGraphQlServer();

  app.use(
    "/v1/graphql",
    expressMiddleware<{ req: RequestWithCookies; res: Response }>(apolloServer, {
      context: async ({ req, res }) => ({ req: req as RequestWithCookies, res }),
    })
  );

  app.use("/", router);
  app.listen(PORT, () => console.log(`Server started at ${PORT}`));
}

serverInit();
