export const mutations = `
    createUser(firstName: String!, lastName: String!, email: String!, password: String!, phone: String!): AuthPayload
    verifyUser(email: String, password: String!, phone: String): AuthPayload
`