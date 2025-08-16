export const queries = `
    hello: String
    getDoctorDetails(id: Int!): Doctor
    currentStepDoctor(DoctorId: Int!): curStep
    getDoctorDocUrl(filename: String!, type: String!): PresignedUrl!
`