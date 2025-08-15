export const typeDefs = `
    type ProductCard {
        id: ID!
        title: String!
        product_details: String
        image: String
    }
    type Product {
        id: ID!
        title: String!
        seller_id: Int!
        rating: Float
        mrp: Float
        current_price: Float
        image: String
        offers: [String!]!
        tags: [String!]!
        highlights: [String!]!
        product_details: String
        manufacturer_details: String
        marketer_details: String
        country_of_origin: String
        expires_on_or_after: String
        created_at: String
        seller: SellerInfo!
    }
    type SellerInfo {
        company_name: String!
    }
    type ProductBrief {
        id: ID!
        title: String!
        product_details: String
        tags: [String!]!
        image: String
        mrp: Float
        current_price: Float
    }

    type GetProductsPaginatedResponse {
        items: [ProductBrief!]!
        nextCursor: Int
    }
    input CreateProductInput {
        title: String!
        seller_id: Int!
        rating: Float
        mrp: Float
        image: String
        current_price: Float
        offers: [String!]
        tags: [String!]
        highlights: [String!]
        product_details: String
        manufacturer_details: String
        marketer_details: String
        country_of_origin: String
        expires_on_or_after: String
    }
    type ProductUpload {
        id: Int!
        title: String!
        seller_id: Int!
        rating: Float
        mrp: Float
        image: String
        current_price: Float
        offers: [String!]
        tags: [String!]
        highlights: [String!]
        product_details: String
        manufacturer_details: String
        marketer_details: String
        country_of_origin: String
        expires_on_or_after: String
        created_at: String!
    }
`