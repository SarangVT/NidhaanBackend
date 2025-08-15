export const typeDefs = `
    type DoctorCreationRes {
        id: Int!
    }
    type AuthDoctorResponse {
        token: String!
        doctor: DoctorAuth!
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
`