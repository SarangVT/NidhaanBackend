export const queries = `
    getUploadUrl(filename: String!, type: String!, sellerId: String!): PresignedUrl!
    currentStep(sellerId: Int!): curStep
`