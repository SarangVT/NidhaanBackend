import { prismaClient } from "../../lib/db";
import { GraphQLError } from "graphql";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';

const JWT_SECRET = process.env.JWT_SECRET!;

const queries = {

}

// const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// async function verifyGoogleToken(idToken: string) {
//   const ticket = await client.verifyIdToken({
//     idToken,
//     audience: process.env.GOOGLE_CLIENT_ID,
//   });
//   return ticket.getPayload();
// }

const mutations = {
    createUser: async (
    __: any,
    {
        firstName,
        lastName,
        email,
        password,
        phone,
    }: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        phone: string;
    }
    ) => {
    try {
        if (!email || !firstName || !lastName || !phone || !password) {
        throw new GraphQLError("All the details are required.", {
            extensions: { code: "BAD_USER_INPUT" },
        });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const fullUser = await prismaClient.user.create({
        data: {
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phone,
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
        },
        });

        const token = jwt.sign(
        { userId: fullUser.id, email: fullUser.email },
        JWT_SECRET,
        { expiresIn: "7d" }
        );

        return {
        token,
        user: fullUser,
        };
    } catch (error: any) {
        if (error.code === "P2002") {
        throw new GraphQLError(
            `User with this ${error.meta?.target?.join(", ")} already exists.`,
            {
            extensions: {
                code: "BAD_USER_INPUT",
                field: error.meta?.target,
            },
            }
        );
        }

        throw new GraphQLError("An unexpected error occurred.", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
    }
    },

    verifyUser: async (_: any,
    { email, phone, password }: { email?: string; phone?: string; password: string }
    ) => {
    try {
        if ((!email && !phone) || !password) {
        throw new GraphQLError("Either email or phone and password must be provided.", {
            extensions: { code: 'BAD_USER_INPUT' },
        });
        }

        const user = await prismaClient.user.findFirst({
        where: {
            OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
            ],
        },
        });

        if (!user) {
        throw new GraphQLError("User not found.", {
            extensions: { code: 'BAD_USER_INPUT' },
        });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
        throw new GraphQLError("Invalid password.", {
            extensions: { code: 'BAD_USER_INPUT' },
        });
        }

        const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            phone: user.phone,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
        );

        return {
        token,
        user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
        }
        };
    } catch (error: any) {
        console.error("Login error:", error);
        throw new GraphQLError(error.message || 'An unexpected error occurred.', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
    }
    },

    // googleLogin: async (__: any, { idToken }: { idToken: string }) => {
    // try {
    //   const payload = await verifyGoogleToken(idToken);
    //   if (!payload?.email) {
    //     throw new GraphQLError('Unable to retrieve email from Google', {
    //       extensions: { code: 'BAD_USER_INPUT' },
    //     });
    //   }

    //   const user = await prismaClient.user.findUnique({
    //     where: { email: payload.email },
    //   });

    //   if (!user) {
    //     const userResponse = {
    //         id: '',
    //         firstName: '',
    //         lastName: '',
    //         email: '',
    //         phone: '',
    //     };
    //     return {
    //         token: '',
    //         user: userResponse,
    //         needsSignup: true,
    //     };
    //   }

    //  const token = jwt.sign({ userId: user.id, email: user.email, phone: user.phone }, JWT_SECRET, {expiresIn: '7d'});

    //   return {
    //     token,
    //     user: {
    //         id: user.id,
    //         firstName: user.firstName,
    //         lastName: user.lastName,
    //         email: user.email,
    //         phone: user.phone,
    //     },
    //     needsSignup: false
    //   };

    // } catch (err) {
    //   throw new GraphQLError('Google login failed', {
    //     extensions: { code: 'INTERNAL_SERVER_ERROR' },
    //   });
    // }
    // }

}

export const resolvers = { queries, mutations }