export const queries = `
    searchProducts(q: String!): [ProductCard!]!
    getProductDetails(productId: Int!): Product!
`