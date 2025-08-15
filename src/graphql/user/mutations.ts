export const mutations = `
    createUser(firstName: String!, lastName: String!, email: String!, password: String!, phone: String!): AuthPayload
    verifyUser(email: String, password: String!, phone: String): AuthPayload
    createUserAddress(userId: Int!, name: String, phone: String, pincode: String, address: String, locality: String, city: String, state: String, landmark: String, isDefault: Boolean): Boolean!
    setDefaultAddress(addressId: Int!): Boolean
    addCartItem(userId: Int!, productId: Int!, quantity: Int): Boolean
    removeCartItem(userId: Int!, productId: Int!): Boolean
`