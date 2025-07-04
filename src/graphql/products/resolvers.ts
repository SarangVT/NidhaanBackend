import { MeiliSearch } from "meilisearch"
import { prismaClient } from "../../lib/db"
import { GraphQLResolveInfo } from "graphql"

const client = new MeiliSearch({
  host: "http://localhost:7700",
  apiKey: "sarang",
})

const queries = {
    searchProducts: async (_: any, args: { q: string }) => {
      try {
        const index = client.index("products")
        const res = await index.search(args.q, { limit: 10 })
        return res.hits
      } catch (err) {
        console.error("Meilisearch error:", err)
        return []
      }
    },
    getProductDetails: async(__: any, {productId}: {productId: Number}) => {
      const product = await prismaClient.product.findUnique({
        where: { id: Number(productId) },
        include: {
          seller: true,
        },
      });
      return product;
    },
    getProductsPaginated: async (_: any, args: { cursor?: number; limit: number }, __: any, ___: GraphQLResolveInfo) => {
      const { cursor, limit } = args;
      const products = await prismaClient.product.findMany({
        take: limit + 1,
        ...(cursor && {
          skip: 1,
          cursor: {
            id: cursor,
          },
        }),
        orderBy: {
          created_at: "desc",
        },
        select: {
          id: true,
          title: true,
          product_details: true,
          tags: true,
          image: true,
          mrp: true,
          current_price: true,
        },
      });

      let nextCursor: number | null = null;
      if (products.length > limit) {
        nextCursor = products[limit].id;
        products.pop();
      }
      return {
        items: products,
        nextCursor,
      };
    },
}

const mutations = {

}

export const resolvers = { queries, mutations }