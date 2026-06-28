# Nidhaan Backend

![Node.js](https://img.shields.io/badge/Node.js-Backend-339933)
![Express](https://img.shields.io/badge/Express-5-black)
![Apollo GraphQL](https://img.shields.io/badge/Apollo-GraphQL-311c87)
![Prisma](https://img.shields.io/badge/Prisma-6.9-2d3748)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6)
![License](https://img.shields.io/badge/License-MIT-green)

The Nidhaan backend is an Express 5 and Apollo GraphQL server written in TypeScript. It provides patient, pharmacy product, seller, and doctor APIs backed by Prisma/PostgreSQL, with JWT-based authentication, Google doctor OAuth, Meilisearch product search, and Cloudflare R2 presigned upload support.

## Features

- Express server with JSON body parsing, cookie parsing, and CORS.
- Apollo GraphQL endpoint mounted at `/v1/graphql`.
- REST endpoint for doctor Google OAuth login.
- Patient registration/login, addresses, and cart operations.
- Product search, product details, cursor pagination, and product creation.
- Seller registration, onboarding progress, GST document metadata, store creation, and presigned upload URLs.
- Doctor registration/login, Google OAuth login, onboarding profile updates, document metadata, bank details, schedules, slots, appointments, and public doctor discovery.
- PostgreSQL persistence through Prisma.
- Cloudflare R2-compatible S3 client for presigned upload URLs.
- Meilisearch integration for product search.
- Docker Compose file for local Meilisearch.

## Tech Stack

- Runtime: Node.js
- Language: TypeScript
- Server: Express 5
- GraphQL: Apollo Server 4, GraphQL 16
- ORM: Prisma Client
- Database: PostgreSQL
- Search: Meilisearch
- Authentication: JWT, bcrypt, Google Auth Library
- File storage: Cloudflare R2 through AWS SDK S3 client
- Utilities: Day.js, Axios, cookie-parser, body-parser, cors

## Folder Organization

```text
backend/
├── prisma/
│   ├── schema.prisma              # Active Prisma schema
│   └── migrations/                # Database migrations
├── src/
│   ├── controllers/
│   │   └── googleOAuthController.ts
│   ├── graphql/
│   │   ├── doctor/                # Active doctor GraphQL module
│   │   ├── products/              # Active product GraphQL module
│   │   ├── seller/                # Active seller GraphQL module
│   │   ├── user/                  # Active user GraphQL module
│   │   ├── addresses/             # Present but not mounted in active schema
│   │   ├── orders/                # Present but not mounted in active schema
│   │   ├── product_reviews/       # Present but not mounted in active schema
│   │   ├── template/              # Present but not mounted in active schema
│   │   └── index.ts               # Active Apollo schema composition
│   ├── lib/
│   │   ├── bucket/index.ts        # Cloudflare R2 S3 client
│   │   ├── db.ts                  # Prisma client
│   │   ├── db.js                  # Meilisearch upload utility
│   │   └── dbuploader.js          # Meilisearch upload utility
│   ├── routes/
│   │   ├── googleLogin.ts         # REST route for doctor Google login
│   │   └── index.ts               # Root Express router
│   └── index.ts                   # Express server entrypoint
├── docker-compose.yml             # Local Meilisearch service
├── package.json
└── tsconfig.json
```

## Server Architecture

`src/index.ts` creates the Express app, configures middleware, starts Apollo Server, mounts GraphQL at `/v1/graphql`, mounts the REST router at `/`, and listens on `process.env.PORT` or `8000`.

The Apollo schema is composed in `src/graphql/index.ts` from four active modules:

- `user`
- `products`
- `seller`
- `doctor`

Each active GraphQL domain exposes:

- `typedefs.ts`
- `queries.ts`
- `mutations.ts`
- `resolvers.ts`
- `index.ts`

Resolvers call Prisma directly. There is no separate service layer in the current source; business logic lives inside controllers and GraphQL resolvers.

## Middleware

| Middleware | Purpose | Source |
| --- | --- | --- |
| `bodyParser.json()` | Parses JSON request bodies. | `src/index.ts` |
| `cookieParser()` | Parses cookies for doctor auth flows. | `src/index.ts` |
| `cors({ origin: "http://localhost:3000", credentials: true })` | Allows the local frontend to send credentialed requests. | `src/index.ts` |
| `expressMiddleware(apolloServer)` | Mounts Apollo Server and passes `{ req, res }` into GraphQL context. | `src/index.ts` |

## Authentication

### Patients

Patient authentication is implemented through GraphQL:

- `createUser`
- `verifyUser`

Passwords are hashed with bcrypt. Successful authentication returns a JWT signed with `JWT_SECRET` and a 7-day expiration. The JWT payload includes `userId`, `email`, and `phone`.

Current patient address/cart resolvers accept `userId` as an argument and do not verify the JWT server-side.

### Doctors

Doctor authentication is implemented through:

- GraphQL `createDoctor`
- GraphQL `verifyDoctor`
- REST `POST /google/login/doctor`

Successful doctor auth signs `{ id, role: "doctor" }` with `JWT_SECRET`, sets an HttpOnly `doctorToken` cookie, and returns the doctor ID, email, and registration status.

Doctor-private GraphQL resolvers verify `req.cookies.doctorToken`.

### Sellers

Seller registration is implemented through GraphQL `createSeller`. It hashes the password with bcrypt and returns a JWT signed with `JWT_SECRET` containing `sellerId`, expiring in 30 days.

Current seller onboarding resolvers accept `sellerId` or document metadata arguments and do not verify the seller JWT server-side.

## Authorization

Authorization is limited in the current implementation:

- Doctor-private operations verify the `doctorToken` cookie and use the decoded doctor ID.
- Public doctor/product operations do not require authentication.
- User address/cart operations rely on a supplied `userId`.
- Seller onboarding operations rely on a supplied `sellerId`.
- No role-based authorization middleware is implemented.

## Database

The backend uses Prisma with PostgreSQL. The active schema is `prisma/schema.prisma`, and the datasource reads `DATABASE_URL`.

### Models

| Model | Table | Purpose |
| --- | --- | --- |
| `User` | `tblusers` | Patient account, auth fields, profile fields, orders, addresses, cart items, appointments. |
| `UserAddress` | `tbluseraddresses` | Patient saved address and default-address flag. |
| `Seller` | `tblsellers` | Seller account, password, GSTIN, notification preference, status, products, stores, documents. |
| `SellerStore` | `tblsellerstores` | Store/pharmacy details, pharmacist info, timings, address, coordinates, return policy. |
| `SellerDocument` | `tblsellerdocuments` | Seller document type and uploaded URL. |
| `Product` | `tblproducts` | Pharmacy product catalog fields, seller relation, reviews, orders, cart items. |
| `ProductReview` | `tblproductreviews` | Product ratings and review text. |
| `CustomProperty` | `tblcustomproperties` | Product custom key/value properties. |
| `Order` | `tblorders` | User order, seller store, total, status, payment method/status, items. |
| `OrderItem` | `tblorderitems` | Product line items within orders. |
| `CartItem` | `tblcartitems` | User/product cart item with unique `(userId, productId)`. |
| `Doctor` | `tbldoctors` | Doctor account/profile, bank fields, booking pause flag, specialities, slots, certificates, appointments. |
| `Speciality` | `tblspeciality` | Doctor speciality names. |
| `DoctorSpeciality` | `tbldoctorspeciality` | Many-to-many doctor/speciality join. |
| `DoctorCertificate` | `tbldoctorcertificates` | Doctor uploaded document metadata. |
| `DoctorSlotRule` | `tbldoctorslotrules` | Weekly recurring availability rules. |
| `DoctorSlotOverride` | `tbldoctorslotoverrides` | Date-specific availability overrides. |
| `Appointment` | `tblappointments` | Doctor appointment with user, date, time, duration, status, and amount. |

### Enums

- `Gender`: `Male`, `Female`, `Other`
- `NotificationMethod`: `APP`, `WHATSAPP`, `SMS`, `EMAIL`
- `DocumentType`: `DRUG_LICENSE`, `GST_CERTIFICATE`, `PHARMACIST_CERTIFICATE`, `PAN_CARD`, `OTHER`
- `SellerStatus`: `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`
- `OrderStatus`: `PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`, `CANCELLED`
- `PaymentStatus`: `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED`
- `AppointmentStatus`: `SCHEDULED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`

## File Storage

The shared R2 client is defined in `src/lib/bucket/index.ts`:

- S3-compatible `S3Client`
- region `auto`
- Cloudflare R2 endpoint hardcoded in source
- credentials from `R2_ACCESS_KEY` and `R2_SECRET_KEY`

Presigned upload URLs are generated with `PutObjectCommand` and `getSignedUrl`.

| Flow | Key format | Resolver |
| --- | --- | --- |
| Seller document upload | `seller/{sellerId}/{type}/{filename}` | `getUploadUrl` |
| Doctor document upload | `doctors/{doctorId}/{type}/{filename}` | `getDoctorDocUrl` |

`src/graphql/products/uploadR2.ts` is a standalone utility script for uploading local product/medicine images to R2 using `CLOUDFLARE_*` environment variables.

## Validation

Validation is implemented manually in resolvers/controllers:

- Required-field checks for user signup, user login, seller signup, seller GST update, doctor login, and Google token body.
- Duplicate user handling through Prisma unique constraint error `P2002`.
- Duplicate doctor/seller checks with Prisma queries.
- bcrypt password comparison for patient, seller, and doctor credential flows.
- Doctor schedule update checks for conflicts with existing scheduled appointments.
- GraphQL schema types enforce basic required/optional field shape.

There is no dedicated validation library, DTO layer, or request schema middleware in the current backend.

## Environment Variables

| Variable | Used by | Required for | Notes |
| --- | --- | --- | --- |
| `PORT` | `src/index.ts` | Server listen port | Defaults to `8000`. |
| `NODE_ENV` | doctor auth cookie config | Secure cookie flag | `secure` is true when `NODE_ENV === "production"`. |
| `DATABASE_URL` | Prisma schema | PostgreSQL connection | Required by Prisma. |
| `JWT_SECRET` | user, seller, doctor auth | JWT signing and verification | Required for auth flows. |
| `GOOGLE_CLIENT_ID` | Google OAuth controller | Doctor Google token verification | Used as OAuth audience. |
| `GOOGLE_CLIENT_SECRET` | `.env` file | OAuth setup | Present in env file; not referenced by active source. |
| `GOOGLE_REDIRECT_URI` | `.env` file | OAuth setup | Present in env file; not referenced by active source. |
| `FRONTEND_REDIRECT_URI` | `.env` file | OAuth setup | Present in env file; not referenced by active source. |
| `R2_ACCESS_KEY` | R2 client | Seller/doctor presigned uploads | Required by `src/lib/bucket/index.ts`. |
| `R2_SECRET_KEY` | R2 client | Seller/doctor presigned uploads | Required by `src/lib/bucket/index.ts`. |
| `R2_BUCKET_NAME` | seller/doctor resolvers | Presigned upload bucket | Required by upload URL resolvers. |
| `MEILI_MASTER_KEY` | `.env`, Docker Compose | Local Meilisearch | Docker Compose sets a local key. |
| `MEILISEARCH_HOST` | `src/lib/db.js` | Meilisearch upload utility | Not used by active product search resolver. |
| `MEILISEARCH_API_KEY` | `src/lib/db.js` | Meilisearch upload utility | Not used by active product search resolver. |
| `CLOUDFLARE_ACCOUNT_ID` | `uploadR2.ts` | Product image upload utility | Used to construct R2 endpoint. |
| `CLOUDFLARE_ACCESS_KEY_ID` | `uploadR2.ts` | Product image upload utility | Used by standalone script. |
| `CLOUDFLARE_SECRET_ACCESS_KEY` | `uploadR2.ts` | Product image upload utility | Used by standalone script. |
| `CLOUDFLARE_BUCKET_NAME` | `uploadR2.ts` | Product image upload utility | Used by standalone script. |

## Deployment

### Build

The TypeScript compiler is configured with:

- `rootDir: ./src`
- `outDir: ./build`
- `module: commonjs`
- `target: es2016`
- `strict: true`

There is no `build` script in `package.json`. Build manually with:

```bash
npx tsc
```

### Start

```bash
npm start
```

This runs:

```bash
node build/index.js
```

### Development

```bash
npm run dev
```

This runs `tsc-watch --onSuccess "npm start"`.

### Local Meilisearch

```bash
docker compose up -d
```

The Compose file starts Meilisearch on port `7700` with persistent `meili_data`.

### Production Notes

- Set all required environment variables in the deployment environment.
- Run Prisma migrations against the production PostgreSQL database.
- Compile TypeScript before starting the server.
- Update CORS origin from `http://localhost:3000` to the production frontend origin.
- Ensure `NODE_ENV=production` when using secure doctor cookies over HTTPS.
- Replace hardcoded local URLs/API keys with environment variables before exposing production services.

## Security Notes

- Passwords are hashed with bcrypt before storage.
- Doctor auth cookies are HttpOnly and conditionally secure in production.
- CORS is restricted to `http://localhost:3000` with credentials enabled.
- Several sensitive or deployment-specific values are hardcoded in source, including local Meilisearch credentials and an R2 endpoint.
- User and seller GraphQL operations currently trust caller-supplied IDs and do not enforce ownership checks.
- Seller JWTs are issued but not verified by seller onboarding resolvers.
- Some resolver errors are logged to stdout, and doctor resolvers log token-related values; remove sensitive logging before production.
- No rate limiting, CSRF protection, request-size limits beyond default body parser behavior, or centralized authorization middleware is implemented in the current source.

## API Reference

### Base URL

```text
http://localhost:8000
```

### REST Endpoints

#### Doctor Google OAuth Login

| Field | Value |
| --- | --- |
| Method | `POST` |
| Route | `/google/login/doctor` |
| Purpose | Verify a Google ID token, find or create a doctor, set a `doctorToken` cookie, and return doctor registration state. |
| Authentication required | No existing app auth required; requires a valid Google ID token. |

Request body:

```json
{
  "token": "google-id-token"
}
```

Query parameters: none.

Successful response:

```json
{
  "id": 1,
  "email": "doctor@example.com",
  "registrationComplete": false
}
```

Error responses:

```json
{ "message": "Token is required" }
```

```json
{ "message": "Invalid Google token" }
```

### GraphQL Endpoint

| Field | Value |
| --- | --- |
| Method | `POST` |
| Route | `/v1/graphql` |
| Purpose | Execute GraphQL queries and mutations. |
| Request body | `{ "query": "...", "variables": { ... } }` |
| Query parameters | None |
| Response | Standard GraphQL JSON response with `data` and/or `errors`. |
| Authentication required | Depends on operation. Doctor-private operations require `doctorToken` cookie. |

## GraphQL API Reference

### Queries

| Query | Purpose | Arguments | Response | Authentication required |
| --- | --- | --- | --- | --- |
| `getUserAddresses` | Fetch saved addresses for a user. | `userId: Int!` | `[Address]` | No token verification; requires `userId`. |
| `getUserCartItems` | Fetch cart items and product summary fields for a user. | `userId: Int!` | `[CartItem]` | No token verification; requires `userId`. |
| `getUserCartCount` | Count cart items for a user. | `userId: Int!` | `Int!` | No token verification; requires `userId`. |
| `searchProducts` | Search products in Meilisearch. | `q: String!` | `[ProductCard!]!` | No. |
| `getProductDetails` | Fetch one product and seller relation by product ID. | `productId: Int!` | `Product!` | No. |
| `getProductsPaginated` | Fetch products ordered by newest with cursor pagination. | `cursor: Int`, `limit: Int!` | `GetProductsPaginatedResponse!` | No. |
| `getUploadUrl` | Generate seller document presigned upload URL. | `filename: String!`, `type: String!`, `sellerId: String!` | `PresignedUrl!` | No token verification; requires `sellerId`. |
| `currentStep` | Compute seller onboarding step from seller documents/stores. | `sellerId: Int!` | `curStep` | No token verification; requires `sellerId`. |
| `getDoctorInfo` | Fetch public doctor booking/profile info. | `id: Int!` | `DoctorBooking` | No. |
| `getDoctorDetails` | Fetch authenticated doctor profile details. | None | `Doctor` | Yes, `doctorToken` cookie. |
| `getDoctorSchedule` | Fetch authenticated doctor's slot rules and overrides. | None | `DoctorSchedule` | Yes, `doctorToken` cookie. |
| `getDoctorSlotsForDate` | Expand doctor slot rules for a date and mark scheduled slots as taken. | `input: DoctorSlotsForDateInput!` | `DoctorSlotsForDateResponse!` | No. |
| `currentStepDoctor` | Validate doctor exists and return current onboarding step. | `DoctorId: Int!` | `curStep` | No token verification; requires `DoctorId`. |
| `getDoctorDocUrl` | Generate authenticated doctor document presigned upload URL. | `filename: String!`, `type: String!` | `PresignedUrl!` | Yes, `doctorToken` cookie. |
| `doctorAppointments` | Fetch authenticated doctor's appointments by status. | `status: AppointmentStatus!` | `[Appointment!]!` | Yes, `doctorToken` cookie. |
| `upcomingAppointments` | Fetch upcoming scheduled appointments and today's scheduled count. | `limit: Int!` | `UpcomingAppointmentsResponse!` | Yes, `doctorToken` cookie. |
| `fetchDoctorsBySpeciality` | Fetch doctor cards for matching speciality names. | `specialities: [String!]` | `[DoctorCard!]!` | No. |

### Mutations

| Mutation | Purpose | Arguments | Response | Authentication required |
| --- | --- | --- | --- | --- |
| `createUser` | Create a patient account, hash password, and return JWT. | `firstName`, `lastName`, `email`, `password`, `phone` | `AuthPayload` | No. |
| `verifyUser` | Verify patient email/phone and password, then return JWT. | `email`, `phone`, `password` | `AuthPayload` | No. |
| `createUserAddress` | Create a saved address for a user; optionally unset previous default. | `userId`, optional address fields, `isDefault` | `Boolean!` | No token verification; requires `userId`. |
| `setDefaultAddress` | Mark one address as default and unset previous default for that user. | `addressId: Int!` | `Boolean` | No token verification; requires `addressId`. |
| `addCartItem` | Upsert or increment a cart item. | `userId: Int!`, `productId: Int!`, `quantity: Int` | `Boolean` | No token verification; requires `userId`. |
| `removeCartItem` | Remove a cart item. | `userId: Int!`, `productId: Int!` | `Boolean` | No token verification; requires `userId`. |
| `createProduct` | Create a product record. | `input: CreateProductInput!` | `ProductUpload!` | No. |
| `createSeller` | Create seller account, hash password, and return seller JWT. | `phone`, `email`, `password` | `SellerAuthPayload` | No. |
| `updateGST` | Save seller GSTIN and seller document metadata. | `gstNumber`, `documentGST` | `String` | No token verification; requires `sellerId` in `documentGST`. |
| `createSellerStore` | Create seller store/pharmacy details. | `sellerId`, `storeName`, optional store fields | `String` | No token verification; requires `sellerId`. |
| `createSellerBankDetails` | Declared in GraphQL schema. | `sellerId`, `isPrimary`, `accountHolderName`, `bankAccountNumber`, `bankIFSCCode` | `String` | No resolver implementation found in active source. |
| `createDoctor` | Create doctor account, hash password, set `doctorToken` cookie. | `name`, `email`, `password`, `phone` | `AuthDoctorResponse` | No. |
| `createBasicDetails` | Update doctor profile details and replace specialities. | `id`, `name`, `qualifications`, `specializations`, `location`, `hospital`, `fees`, `desc`, `languages`, `experience` | `DoctorCreationRes` | No token verification; requires doctor `id`. |
| `verifyDoctor` | Verify doctor email/phone and password, set `doctorToken` cookie. | `email`, `phone`, `password` | `AuthDoctorResponse` | No. |
| `uploadDoctorDocument` | Save authenticated doctor certificate metadata and optional GST number. | `document`, `gstNumber` | `Int!` | Yes, `doctorToken` cookie. |
| `updateDoctorBankDetails` | Save authenticated doctor bank details. | `accountHolderName`, `bankAccountNumber`, `bankIFSCCode` | `Int!` | Yes, `doctorToken` cookie. |
| `saveDoctorSchedule` | Replace authenticated doctor's weekly rules and overrides after conflict checks. | `rules`, `overrides` | `SaveDoctorScheduleResponse!` | Yes, `doctorToken` cookie. |

### Main GraphQL Types

#### User Types

```graphql
type AuthPayload {
  token: String!
  user: User!
}

type User {
  id: Int!
  firstName: String!
  lastName: String!
  email: String!
  phone: String!
}

type Address {
  id: Int!
  userId: Int!
  name: String
  phone: String
  pincode: String
  address: String
  locality: String
  city: String
  state: String
  landmark: String
  isDefault: Boolean
  createdAt: String
  updatedAt: String
}

type CartItem {
  id: Int!
  userId: Int!
  productId: Int!
  quantity: Int!
  product: CartProduct!
}
```

#### Product Types

```graphql
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

type GetProductsPaginatedResponse {
  items: [ProductBrief!]!
  nextCursor: Int
}
```

#### Seller Types

```graphql
type SellerAuthPayload {
  token: String!
}

type PresignedUrl {
  url: String!
  key: String!
}

type curStep {
  curStep: Int
}

enum DocumentType {
  DRUG_LICENSE
  GST_CERTIFICATE
  PHARMACIST_CERTIFICATE
  PAN_CARD
  OTHER
}
```

#### Doctor Types

```graphql
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

type DoctorCard {
  id: Int!
  name: String
  experience: String
  languages: [String]
  qualifications: String
  specializations: [String!]
  location: String
  hospital: String
  fees: Int
  availability: String
  image: String
  showInstantBooking: Boolean
}

type DoctorSchedule {
  rules: [AvailableSlot!]!
  overrides: [SlotOverride!]!
}

type DoctorSlotsForDateResponse {
  slots: [Slot!]!
  pauseAllBookings: Boolean!
}

enum AppointmentStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
  NO_SHOW
}
```

## Available Scripts

| Script | Command | Description |
| --- | --- | --- |
| `start` | `node build/index.js` | Starts the compiled backend. |
| `dev` | `tsc-watch --onSuccess "npm start"` | Watches TypeScript and restarts after successful compilation. |