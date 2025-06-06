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
`