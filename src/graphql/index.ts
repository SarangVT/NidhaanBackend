import { ApolloServer } from "@apollo/server";
import { User } from "./user";
import { Product } from "./products";

async function createApolloGraphQlServer() {
    const gqlserver = new ApolloServer({
    typeDefs: `
        ${User.typeDefs}
        ${Product.typeDefs}
        type Query {
            ${User.queries}
            ${Product.queries}
        }
        type Mutation {
            ${User.mutations}
        }
    `,
    resolvers: {
        Query: {
            ...Product.resolvers.queries,
            ...User.resolvers.queries,
        },
        Mutation: {
            ...Product.resolvers.mutations,
            ...User.resolvers.mutations,
        }
    },
    });

    await gqlserver.start();
    return gqlserver;
}

export default createApolloGraphQlServer;