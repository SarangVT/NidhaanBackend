export const typeDefs = `
    enum NotificationMethod {
        WHATSAPP
        SMS
        EMAIL
    }
    type SellerAuthPayload {
        token: String!
    }
    enum DocumentType {
        DRUG_LICENSE
        GST_CERTIFICATE
        PHARMACIST_CERTIFICATE
        PAN_CARD
        OTHER
    }
    input DocumentInput {
        url: String!,
        type: DocumentType,
        sellerId: String
    }
    type PresignedUrl {
        url: String!
        key: String!
    }
    type curStep{
        curStep: Int
    }
`