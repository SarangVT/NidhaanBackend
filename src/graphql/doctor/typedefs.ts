export const typeDefs = `
    type DoctorCreationRes {
        id: Int!
    }
    type AuthDoctorResponse {
        id: Int!
        registrationComplete: Boolean!
        email: String!
    }
    type Doctor {
        id: Int!
        name: String
        email: String!
        phone: String
        password: String
        experience: String
        languages: [String!]
        qualifications: String
        specializations: [String!]
        location: String
        hospital: String
        fees: Int
        image: String
        description: String
    }
    type DoctorAuth {
        id: Int!
        name: String!
        email: String!
        phone: String!
    }
    input DoctorDocumentInput {
        url: String!
        type: String!
    }
`