export const mutations = `
  createDoctor(name: String!, email: String!, password: String!, phone: String!): AuthDoctorResponse
  createBasicDetails(
    id: Int!,
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
  verifyDoctor(email: String, password: String!, phone: String): AuthDoctorResponse
  uploadDoctorDocument(document: DoctorDocumentInput!, gstNumber: String): Int!
  updateDoctorBankDetails(accountHolderName: String!, bankAccountNumber: String!, bankIFSCCode: String!): Int!
  saveDoctorSchedule(rules: [DoctorSlotRuleInput!]!, overrides: [DoctorSlotOverrideInput!]!): SaveDoctorScheduleResponse!
`;