export const mutations = `
  createDoctor(email: String, password: String!, phone: String): String
  createBasicDetails(
    name: String!
    qualifications: String!
    specializations: [String!]!
    location: String!
    hospital: String!
    fees: Int!
    desc: String!
    languages: [String!]!
    experience: String!
  ): DoctorCreationRes
  verifyDoctor(email: String!, password: String!, phone: String!): AuthDoctorResponse!

`;