export const mutations = `
  createSeller(
    phone: String!,
    email: String!,
    password: String!,
  ): SellerAuthPayload

  updateGST(
    gstNumber: String!,
    documentGST: DocumentInput
  ): String

  createSellerStore(
    sellerId: ID!
    storeName: String!
    pharmacistName: String
    pharmacistRegNo: String
    inTime: String
    outTime: String
    workingDays: [String!]
    acceptsReturns: Boolean
    address: String
    city: String
    state: String
    pincode: String
    latitude: Float
    longitude: Float
  ): String

  createSellerBankDetails(
    sellerId: ID!,
    isPrimary: Boolean,
    accountHolderName: String!,
    bankAccountNumber: String!,
    bankIFSCCode: String!
  ): String
`