export const queries = `
    getUserAddresses(userId: Int!): [Address]
    getUserCartItems(userId: Int!): [CartItem]
    getUserCartCount(userId: Int!): Int!
`