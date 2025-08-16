import { ApolloServer } from "@apollo/server";
import { User } from "./user";
import { Product } from "./products";
import { Seller } from "./seller";
import { Doctor } from "./doctor";
import type { Request, Response } from "express";

async function createApolloGraphQlServer() {
  const gqlserver = new ApolloServer<{ req: Request; res: Response }>({
    typeDefs: `
      ${User.typeDefs}
      ${Product.typeDefs}
      ${Seller.typeDefs}
      ${Doctor.typeDefs}
      type Query {
        ${User.queries}
        ${Product.queries}
        ${Seller.queries}
        ${Doctor.queries}
      }
      type Mutation {
        ${User.mutations}
        ${Seller.mutations}
        ${Product.mutations}
        ${Doctor.mutations}
      }
    `,
    resolvers: {
      Query: {
        ...Product.resolvers.queries,
        ...User.resolvers.queries,
        ...Seller.resolvers.queries,
        ...Doctor.resolvers.queries,
      },
      Mutation: {
        ...Product.resolvers.mutations,
        ...User.resolvers.mutations,
        ...Seller.resolvers.mutations,
        ...Doctor.resolvers.mutations,
      },
    },
  });

  await gqlserver.start();
  return gqlserver;
}

export default createApolloGraphQlServer;
