import { GraphQLError } from "graphql";
import { prismaClient } from "../../lib/db";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import express from 'express';

const JWT_SECRET = process.env.JWT_SECRET!;

const queries = {
    getDoctorDetails: async (_parent: any, args: { id: number }) => {
    const data = await prismaClient.doctor.findUnique({
        where: { id: args.id },
    });
    return data;
    },
}

const mutations = {
    createDoctor: async (_: any, { email, password, phone }: { email?: string, password: string, phone?: string }, { res }: { res: express.Response }) => {
        const doctor = await prismaClient.doctor.create({
            data: {
                email: email ?? null,
                password,
                phone: phone || null,
                isGoogleLogin: false,
                registrationComplete: false
            }
        });
        const appToken = jwt.sign({ id: doctor.id, role: "doctor" }, process.env.JWT_SECRET!, {
        expiresIn: "7d",
        });
        res.cookie("doctorToken", appToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        return res.status(200).json({ id: doctor.id, email: doctor.email, registrationComplete: doctor.registrationComplete });
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
        { email, phone, password }: { email?: string; phone?: string; password: string }
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

            const token = jwt.sign(
            {
                doctorId: doctor.id,
                email: doctor.email,
                phone: doctor.phone,
            },
            JWT_SECRET,
            { expiresIn: '7d' }
            );

    return {
        token,
        doctor: {
            id: doctor.id,
            firstName: doctor.name,
            email: doctor.email,
            phone: doctor.phone,
        }
    };
    } catch (error: any) {
        console.error("Login error:", error);
        throw new GraphQLError(error.message || 'An unexpected error occurred.', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
    }
    },
}

export const resolvers = { queries, mutations }