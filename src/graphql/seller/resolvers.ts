import { prismaClient as prisma} from "../../lib/db";
import { GraphQLError } from "graphql";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "../../lib/bucket";
import { DocumentType } from "@prisma/client";

const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const JWT_SECRET = process.env.JWT_SECRET!;

type DocumentInput = {
    url: string,
    sellerId: string,
    type: DocumentType,
}

const queries = {
    getUploadUrl: async (_: any, { filename, type, sellerId }: { filename: string, type: string, sellerId: string }) => {
        const key = `seller/${sellerId}/${type}/${filename}`;
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: "application/octet-stream",
        });
        const url = await getSignedUrl(r2Client, command, {
            expiresIn: 60 * 5,
        });
        return { url, key };
    },

    currentStep: async (_: any, { sellerId }: { sellerId: number }) => {
      const seller = await prisma.seller.findUnique({
        where: { id: sellerId },
        include: { documents: true, stores: true },
      });

      if (!seller) {
        return { curStep: 0 };
      }
      if (!seller.email) return { curStep: 0 };
      const hasGSTDoc = seller.documents.some(doc => doc.type === 'GST_CERTIFICATE');
      if (!seller.gstin || !hasGSTDoc) return { curStep: 1 };

      const hasPharmacistInfo = seller.stores.some(
        store => store.pharmacistName && store.pharmacistRegNo
      );

      if (!hasPharmacistInfo) return { curStep: 2 };

      const hasAddressDetails = seller.stores.some(
        store => store.pincode && store.city
        );

      if (!hasAddressDetails) return { curStep: 3 };
      return { curStep: 4 };
        }
}

const mutations = {
    createSeller: async (_:any, { email, password, phone } : { email: string, password: string, phone: string }) => {
        if (!phone || !password) {
            throw new Error('Phone and password are required');
        }
        const existing = await prisma.seller.findFirst({
            where: {
            OR: [{ phone }, { email }],
            },
        });
        if (existing) {
            throw new Error('Seller with this phone/email already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const seller = await prisma.seller.create({
            data: {
            password: hashedPassword,
            phone,
            email,
            },
        });

        const token = jwt.sign({ sellerId: seller.id }, JWT_SECRET, {
            expiresIn: '30d',
        });

        return {
            token,
        };
    },
    
    updateGST: async (_: any, { gstNumber, documentGST }: { gstNumber: string; documentGST: DocumentInput }) => {
        try {
            const { url, sellerId, type } = documentGST;

            if (!gstNumber || !url || !sellerId || !type) {
            throw new GraphQLError("All fields (gstNumber, url, sellerId, type) are required.");
            }

            const sellerExists = await prisma.seller.findUnique({
            where: { id: parseInt(sellerId) },
            });

            if (!sellerExists) {
            throw new GraphQLError(`Seller with ID ${sellerId} not found.`);
            }

            await prisma.seller.update({
            where: { id: parseInt(sellerId) },
            data: {
                gstin: gstNumber,
                documents: {
                create: {
                    url,
                    type,
                },
                },
            },
            });

            return  `GST updated for seller ID ${sellerId}`;

        } catch (error) {
            if (error instanceof GraphQLError) throw error;
            console.error("updateGST error:", error);
            throw new GraphQLError("Failed to update GST. Please try again.");
        }
    },

    createSellerStore: async (_: any,{
        sellerId,
        storeName,
        pharmacistName,
        pharmacistRegNo,
        inTime,
        outTime,
        workingDays,
        acceptsReturns,
        address,
        city,
        state,
        pincode,
        latitude,
        longitude,
    }: {
        sellerId: number;
        storeName: string;
        pharmacistName?: string;
        pharmacistRegNo?: string;
        inTime?: string;
        outTime?: string;
        workingDays?: string[];
        acceptsReturns?: boolean;
        address?: string;
        city?: string;
        state?: string;
        pincode?: string;
        latitude?: number;
        longitude?: number;
    },
    ) => {
    const sellerExists = await prisma.seller.findUnique({
        where: { id: sellerId },
    });

    if (!sellerExists) {
        throw new Error('Seller not found');
    }

    const storeTimings = inTime && outTime ? `${inTime}-${outTime}` : undefined;

    await prisma.sellerStore.create({
        data: {
        sellerId,
        storeName,
        pharmacistName,
        pharmacistRegNo,
        storeTimings,
        workingDays: workingDays?.join(','),
        acceptsReturns: acceptsReturns ?? false,
        address,
        city,
        state,
        pincode,
        latitude,
        longitude,
        },
    });

    return 'Store created successfully';
    }

}

export const resolvers = { queries, mutations }