import { ApolloServer } from "@apollo/server";
import { User } from "./user";
import { Product } from "./products";
import { Seller } from "./seller";

async function createApolloGraphQlServer() {
    const gqlserver = new ApolloServer({
    typeDefs: `
        ${User.typeDefs}
        ${Product.typeDefs}
        ${Seller.typeDefs}
        type Query {
            ${User.queries}
            ${Product.queries}
            ${Seller.queries}
        }
        type Mutation {
            ${User.mutations}
            ${Seller.mutations}
        }
    `,
    resolvers: {
        Query: {
            ...Product.resolvers.queries,
            ...User.resolvers.queries,
            ...Seller.resolvers.queries,
        },
        Mutation: {
            ...Product.resolvers.mutations,
            ...User.resolvers.mutations,
            ...Seller.resolvers.mutations,
        }
    },
    });

    await gqlserver.start();
    return gqlserver;
}

export default createApolloGraphQlServer;