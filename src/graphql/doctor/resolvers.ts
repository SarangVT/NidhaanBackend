import { GraphQLError } from "graphql";
import { prismaClient } from "../../lib/db";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import express from 'express';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "../../lib/bucket";
import { RequestWithCookies } from "../..";

interface Context {
  req: RequestWithCookies;
}
const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const JWT_SECRET = process.env.JWT_SECRET!;

const queries = {
    getDoctorDetails: async (_parent: any, args: { id: number }) => {
    const data = await prismaClient.doctor.findUnique({
        where: { id: args.id },
    });
    return data;
    },
    currentStepDoctor: async (_parent: any, args: { DoctorId: number }) => {
        const doctor = await prismaClient.doctor.findUnique({
            where: { id: args.DoctorId },
        });
        if (!doctor) {
            throw new GraphQLError("Doctor not found", {
                extensions: { code: 'NOT_FOUND' },
            });
        }
        return { curStep:  1};
    },
    getDoctorDocUrl: async (_: any, { filename, type }: { filename: string; type: string }, { req }: Context) => {
        const token = req.cookies.doctorToken;
        if (!token) throw new Error("Unauthorized");

        let decoded: any;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!);
        } catch {
            throw new Error("Invalid token");
        }
        const doctorId = decoded.id.toString();
        const key = `doctors/${doctorId}/${type}/${filename}`;
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: "application/octet-stream",
        });
        const url = await getSignedUrl(r2Client, command, { expiresIn: 60 * 5 });
        return { url, key };
    },
}

const mutations = {
    createDoctor: async (_: any, { name, email, password, phone }: { name: string, email: string, password: string, phone: string }, { res }: { res: express.Response }) => {
        const existingDoctor = await prismaClient.doctor.findFirst({
            where: {
                OR: [
                    { email },
                    { phone }
                ]
            }
        });
        if (existingDoctor) {
            throw new Error("Email or phone already registered");
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const doctor = await prismaClient.doctor.create({
            data: {
                name,
                email,
                password: hashedPassword,
                phone,
                isGoogleLogin: false,
                registrationComplete: false
            }
        });
        const appToken = jwt.sign({ id: doctor.id, role: "doctor" }, process.env.JWT_SECRET!, {expiresIn: "7d",});
        res.cookie("doctorToken", appToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        return { id: doctor.id, email: doctor.email, registrationComplete: doctor.registrationComplete };
    },
    createBasicDetails: async(__: any, { name, id, qualifications, specializations, location, hospital, fees, desc, languages, experience }: { name: string, id: number, qualifications: string, specializations: string[], location: string, hospital: string, fees: number, desc: string, languages: string[], experience: string }) => {
        const doctor = await prismaClient.doctor.update({
            where: {id},
            data: { name, qualifications, specializations, location, hospital, fees, description: desc, languages, experience }
        });
        return {
            id: doctor.id
        };
    },
    verifyDoctor: async (_: any,
        { email, phone, password }: { email?: string; phone?: string; password: string }, { res }: { res: express.Response }
        ) => {
        try {
            if ((!email && !phone) || !password) {
            throw new GraphQLError("Either email or phone and password must be provided.", {
                extensions: { code: 'BAD_doctor_INPUT' },
            });
            }
            const doctor = await prismaClient.doctor.findFirst({
            where: {
                OR: [
                ...(email ? [{ email }] : []),
                ...(phone ? [{ phone }] : []),
                ],
            },
            });
            if (!doctor) {
            throw new GraphQLError("doctor not found.", {
                extensions: { code: 'BAD_doctor_INPUT' },
            });
            }
            if (!doctor.password) {
            throw new Error("You signed up using Google. Please log in with Google.");
            } else {
                const isMatch = await bcrypt.compare(password, doctor.password);
                if (!isMatch) {
                throw new GraphQLError("Invalid password.", {
                    extensions: { code: 'BAD_doctor_INPUT' },
                });
                }
            }
            const appToken = jwt.sign({ id: doctor.id, role: "doctor" }, process.env.JWT_SECRET!, {
            expiresIn: "7d",
            });
            res.cookie("doctorToken", appToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: "/"
            });
        return { id: doctor.id, email: doctor.email, registrationComplete: doctor.registrationComplete };
    } catch (error: any) {
        console.error("Login error:", error);
        throw new GraphQLError(error.message || 'An unexpected error occurred.', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
    }
    },
    uploadDoctorDocument: async (_: any, { document, gstNumber }: { document: { url: string; type: string }; gstNumber?: string }, { req }: Context) => {
        const token = req.cookies.doctorToken;
        console.log(token);
        if (!token) throw new Error("Unauthorized");
        let decoded: any;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!);
        } catch {
            throw new Error("Invalid token");
        }
        const doctorId = decoded.id;
        console.log(doctorId);
        try {
            if (document.type === "GST_CERTIFICATE" && gstNumber) {
            await prismaClient.doctor.update({ where: { id: doctorId }, data: { gstNumber } });
            }
            const newCertificate = await prismaClient.doctorCertificate.create({
            data: { type: document.type, url: document.url, doctorId: doctorId },
            });
            return newCertificate.id;
        } catch (err) {
            console.error("Error creating doctor certificate:", err);
            throw err;
        }
    },
    updateDoctorBankDetails: async (_: any, { accountHolderName, bankAccountNumber, bankIFSCCode }: { accountHolderName: string; bankAccountNumber: string; bankIFSCCode: string }, { req }: Context) => {
        const token = req.cookies.doctorToken
        if (!token) throw new Error("Unauthorized")
        let decoded: any
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!)
        } catch {
            throw new Error("Invalid token")
        }
        const doctorId = decoded.id
        try {
            const updatedDoctor = await prismaClient.doctor.update({
            where: { id: doctorId },
            data: {
                accountHolderName,
                bankAccountNumber,
                bankIFSCCode
            },
            })
            return updatedDoctor.id
        } catch (err) {
            console.error("Error updating doctor bank details:", err)
            throw err
        }
    },
}

export const resolvers = { queries, mutations }