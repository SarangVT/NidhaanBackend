import { prismaClient } from "../../lib/db";
import { GraphQLError } from "graphql";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';

const JWT_SECRET = process.env.JWT_SECRET!;

const queries = {
    getUserAddresses: async (_: any, { userId }: { userId: number }) => {
    try {
        const user = await prismaClient.user.findUnique({
        where: { id: userId },
        });

        if (!user) {
        throw new GraphQLError("User not found", {
            extensions: { code: "NOT_FOUND" },
        });
        }

        const addresses = await prismaClient.userAddress.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        });

        return addresses;
    } catch (error: any) {
        console.error("Error fetching addresses:", error);
        throw new GraphQLError("Failed to fetch addresses", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
    }
    },
    getUserCartCount: async (_: any, { userId }: { userId: number }) => {
        return await prismaClient.cartItem.count({
            where: { userId },
        });
    },
    getUserCartItems: async (_: any, { userId }: { userId: number }) => {
        return await prismaClient.cartItem.findMany({
            where: { userId },
            select: {
            id: true,
            userId: true,
            productId: true,
            quantity: true,
            product: {
                select: {
                    id: true,
                    title: true,
                    mrp: true,
                    current_price: true,
                    image: true,
                },
            },
            },
        });
    },

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
    createUser: async (__: any,
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
        { userId: fullUser.id, email: fullUser.email, phone: fullUser.phone },
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
            userId: user.id,
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

    createUserAddress: async (_: any,
    args: {
        userId: number,
        name?: string,
        phone?: string,
        pincode?: string,
        address?: string,
        locality?: string,
        city?: string,
        state?: string,
        landmark?: string,
        isDefault?: boolean
    }
    ) => {
    try {
        const { userId, isDefault, ...rest } = args;
        if (!userId) {
            throw new GraphQLError("userId is required to create an address.", {
                extensions: { code: "BAD_USER_INPUT" },
            });
        }

        const user = await prismaClient.user.findUnique({ where: { id: userId } });
        if (!user) {
        throw new GraphQLError("User not found", {
            extensions: { code: "NOT_FOUND" },
        });
        }
        if (isDefault) {
            await prismaClient.userAddress.updateMany({
                where: {
                userId,
                isDefault: true,
                },
                data: {
                isDefault: false,
                },
            });
        }

        await prismaClient.userAddress.create({
        data: { userId, isDefault, ...rest }
        });
        return true;
    } catch (error: any) {
        console.error("Error creating user address:", error);
        throw new GraphQLError("Failed to create address", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
    }
    },
    setDefaultAddress: async (_: any, { addressId}: {addressId: number}) => {
        const address = await prismaClient.userAddress.findUnique({ where: { id: addressId } });
        if (!address) throw new Error("Address not found");
        await prismaClient.userAddress.updateMany({
            where: { userId: address.userId, isDefault: true },
            data: { isDefault: false },
        });
        await prismaClient.userAddress.update({
            where: { id: addressId },
            data: { isDefault: true },
        });
        return true;
    },
    addCartItem: async (_: any, { userId, productId, quantity = 1 }: { userId: number; productId: number; quantity?: number }) => {
        try {
            await prismaClient.cartItem.upsert({
            where: {
                userId_productId: {
                userId,
                productId,
                },
            },
            update: {
                quantity: { increment: quantity ?? 1 },
            },
            create: {
                userId,
                productId,
                quantity: quantity ?? 1,
            },
            });
            return true;
        } catch (err) {
            console.error("Failed to add to cart", err);
            return false;
        }
    },
    removeCartItem: async (_: any, { userId, productId }: { userId: number; productId: number }) => {
        try {
            await prismaClient.cartItem.delete({
            where: {
                userId_productId: {
                userId,
                productId,
                },
            },
            });
            return true;
        } catch (err) {
            console.error("Error removing cart item:", err);
            return false;
        }
    }

}

export const resolvers = { queries, mutations }