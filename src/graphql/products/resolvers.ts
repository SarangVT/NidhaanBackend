import { MeiliSearch } from "meilisearch"
import { prismaClient } from "../../lib/db"

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
    }

}

const mutations = {

}

export const resolvers = { queries, mutations }