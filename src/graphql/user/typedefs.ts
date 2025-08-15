export const typeDefs = `
    type AuthPayload {
        token: String!
        user: User!
    }
    type User {
        id: Int!
        firstName: String!
        lastName: String!
        email: String!
        phone: String!
    }
    type GoogleAuthPayload {
        token: String!
        user: User!
        needsSignup: Boolean!
    }
    type Address {
        id: Int!
        userId: Int!
        name: String
        phone: String
        pincode: String
        address: String
        locality: String
        city: String
        state: String
        landmark: String
        isDefault: Boolean
        createdAt: String
        updatedAt: String
    }
    type CartProduct {
        id: Int!
        title: String!
        mrp: Float
        current_price: Float
        image: String
    }
    type CartItem {
        id: Int!
        userId: Int!
        productId: Int!
        quantity: Int!
        product: CartProduct!
    }
`