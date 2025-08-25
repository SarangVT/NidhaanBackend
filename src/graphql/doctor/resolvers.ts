import { GraphQLError } from "graphql";
import { prismaClient } from "../../lib/db";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import express from 'express';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "../../lib/bucket";
import { RequestWithCookies } from "../..";
import {AppointmentStatus, Prisma } from "@prisma/client";
import { GraphQLResolveInfo } from 'graphql';
import dayjs from 'dayjs';
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter)
interface Context {
  req: RequestWithCookies;
}

interface SlotInput {
  start: string;
  end: string;
}

interface DoctorSlotRuleInput {
  dayOfWeek: number;
  slots: SlotInput[];
  duration: number | null;
}

interface DoctorSlotOverrideInput {
  date: string;
  slots: SlotInput[];
  duration: number | null;
}

const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const JWT_SECRET = process.env.JWT_SECRET!;
type SlotBlock = { start: string; end: string };
type SubSlot = { start: string; end: string; isTaken?: boolean };

const queries = {
   getDoctorSlotsForDate: async (
  _: any,
  args: { input: { doctorId: number; date: string } },
  _context: any,
  _info: GraphQLResolveInfo
): Promise<{ slots: SubSlot[]; pauseAllBookings: boolean }> => {
  const { doctorId, date } = args.input;
  const d = dayjs(date, "YYYY-MM-DD", true);
  if (!d.isValid()) return { slots: [], pauseAllBookings: false };

  // 1) fetch doctor with rules & appointments
  const doctor = await prismaClient.doctor.findUnique({
    where: { id: doctorId },
    include: {
      slotRules: true,
      appointments: true,
    },
  });
  if (!doctor) return { slots: [], pauseAllBookings: false };

  // 2) check if bookings paused
  if (doctor.pauseAllBookings) return { slots: [], pauseAllBookings: true };

  // 3) helpers
  const parseT = (t: string) => dayjs(t, "HH:mm", true);

  const toSubSlots = (block: { start: string; end: string }, duration: number): SubSlot[] => {
  if (!block?.start || !block?.end || duration <= 0) return [];
  const out: SubSlot[] = [];

  // Parse with the same date as requested
  let cur = dayjs(`${d.format("YYYY-MM-DD")} ${block.start}`, "YYYY-MM-DD HH:mm");
  const end = dayjs(`${d.format("YYYY-MM-DD")} ${block.end}`, "YYYY-MM-DD HH:mm");

  if (!cur.isValid() || !end.isValid()) return out;

  while (cur.add(duration, "minute").isSameOrBefore(end)) {
    const nxt = cur.add(duration, "minute");
    out.push({ start: cur.format("HH:mm"), end: nxt.format("HH:mm") });
    cur = nxt;
  }

  return out;
};
  const overlaps = (a: SubSlot, b: SubSlot) => {
    const aStart = parseT(a.start);
    const aEnd = parseT(a.end);
    const bStart = parseT(b.start);
    const bEnd = parseT(b.end);
    return aStart.isBefore(bEnd) && aEnd.isAfter(bStart);
  };

  // 4) get rules for this weekday
  const weekday = d.day();
  const rulesForDay = (doctor.slotRules || []).filter((r) => r.dayOfWeek === weekday);
  console.log("Rules for day:", rulesForDay);

  if (!rulesForDay.length) return { slots: [], pauseAllBookings: false };

  // 5) expand rules into subslots
  let allSub: SubSlot[] = [];
  for (const rule of rulesForDay) {
    let blocks: { start: string; end: string }[] = [];
    try {
      // If Prisma already returns objects, use them directly, else parse JSON
      blocks = Array.isArray(rule.slots) ? rule.slots : JSON.parse(rule.slots as unknown as string);
    } catch (err) {
      console.error("Failed to parse slots JSON for rule:", rule.id, err);
      continue;
    }
    console.log("Blocks from rule", rule.id, blocks);

    const dur = rule.duration || 0;
    for (const b of blocks) {
      const sub = toSubSlots(b, dur);
      console.log("Subslots from block", b, sub);
      allSub = allSub.concat(sub);
    }
  }

  console.log("All subslots before booked filter:", allSub);
  if (!allSub.length) return { slots: [], pauseAllBookings: false };

  // 6) booked appointments for this date
  const bookedAppointments = (doctor.appointments || []).filter(
    (a) => a.status === "SCHEDULED" && dayjs(a.date).isSame(d, "day")
  );
  console.log("Booked appointments:", bookedAppointments);

  const bookedSubSlots: SubSlot[] = bookedAppointments.map((a) => {
    const start = dayjs(`${dayjs(a.date).format("YYYY-MM-DD")} ${a.time}`, "YYYY-MM-DD HH:mm");
    return { start: start.format("HH:mm"), end: start.add(a.duration, "minute").format("HH:mm") };
  });

  // 7) mark slots taken
  let result: SubSlot[] = allSub.map((s) => ({
    ...s,
    isTaken: bookedSubSlots.some((b) => overlaps(s, b)),
  }));

  console.log("Final slots after marking taken:", result);

  // 8) filter past if today
  if (d.isSame(dayjs(), "day")) {
    const now = dayjs();
    result = result.filter((s) => parseT(s.start).isSameOrAfter(now));
  }

  return { slots: result, pauseAllBookings: false };
},


    getDoctorInfo: async (_: any, { id }: { id: number }, ctx: Context) => {
        const doctor = await prismaClient.doctor.findUnique({
            where: { id },
            select: {
            id: true,
            name: true,
            experience: true,
            languages: true,
            qualifications: true,
            location: true,
            hospital: true,
            fees: true,
            image: true,
            description: true,
            registrationNo: true,
            specialities: { select: { speciality: { select: { name: true } } } },
            }
        });
        if (!doctor) throw new Error("Doctor not found");
        const specializations = doctor.specialities?.map(s => s.speciality?.name).filter(Boolean) || [];
        return {
            ...doctor,
            specializations
        }
    },
    getDoctorDetails: async (_: any, __: any, { req }: Context) => {
        const token = req.cookies?.doctorToken;
        if (!token) throw new Error("Unauthorized");

        let decoded: any;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!);
        } catch {
            throw new Error("Invalid token");
        }
        const doctorId = decoded.id;

        const data = await prismaClient.doctor.findUnique({
            where: { id: doctorId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                experience: true,
                languages: true,
                qualifications: true,
                location: true,
                hospital: true,
                fees: true,
                image: true,
                description: true,
                specialities: {
                    select: {
                        speciality: {
                            select: { name: true }
                        }
                    }
                }
            },
        });
        if (!data) throw new Error("Doctor not found");
        return {
            ...data,
            specializations: data.specialities?.map(s => s.speciality?.name).filter(Boolean) || [],
        };
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
    doctorAppointments: async (_: any, { status }: { status: AppointmentStatus }, { req }: Context) => {
      const token = req.cookies.doctorToken
      if (!token) throw new Error("Unauthorized")

      let decoded: any
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET!)
      } catch {
        throw new Error("Invalid token")
      }
      const doctorId = decoded.id;
      const appointments = await prismaClient.appointment.findMany({
        where: {
          doctorId,
          status
        },
        include: {
          user: true
        },
        orderBy: {
          date: 'asc'
        }
      })
      return appointments.map(a => ({
        id: a.id,
        date: a.date.toISOString(),
        time: a.time,
        duration: a.duration,
        status: a.status,
        amount: a.amount,
        user: {
        id: a.user.id,
        name: `${a.user.firstName} ${a.user.lastName}`,
        phone: a.user.phone
        }
    }))
    },
    upcomingAppointments: async (_: any, { limit }: { limit: number }, { req }: Context) => {
        const token = req.cookies.doctorToken
        if (!token) throw new Error("Unauthorized")
        let decoded: any
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!)
        } catch {
            throw new Error("Invalid token")
        }
        const doctorId = decoded.id

        const today = new Date(); today.setHours(0,0,0,0)
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

        const [rows, todayCount] = await Promise.all([
            prismaClient.appointment.findMany({
            where: { doctorId, date: { gte: new Date() }, status: "SCHEDULED" },
            orderBy: { date: "asc" },
            take: limit,
            include: { user: true },
            }),
            prismaClient.appointment.count({
            where: { doctorId, date: { gte: today, lt: tomorrow }, status: "SCHEDULED" },
            }),
        ])
        return {
            todayCount,
            appointments: rows.map(a => ({
            id: a.id,
            date: a.date.toISOString(),
            time: a.time,
            status: a.status,
            user: {
                id: a.user.id,
                firstName: a.user.firstName,
                lastName: a.user.lastName,
                phone: a.user.phone,
            }
            })),
        }
    },
    fetchDoctorsBySpeciality: async (_: any, { specialities }: { specialities?: string[] }) => {
        if (!specialities || specialities.length === 0) return [];
        const doctors = await prismaClient.doctor.findMany({
            where: {
                specialities: {
                    some: {
                        speciality: {
                            name: { in: specialities }
                        }
                    }
                }
            },
            select: {
                id: true,
                name: true,
                experience: true,
                languages: true,
                qualifications: true,
                location: true,
                hospital: true,
                fees: true,
                image: true,
                specialities: {
                    select: {
                        speciality: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        return doctors.map(d => ({
            ...d,
            specializations: d.specialities.map(ds => ds.speciality.name),
            availability: "Available",       
            showInstantBooking: false        
        }));
    },
    getDoctorSchedule: async (_: any, __: any, { req }: Context) => {
        const token = req.cookies.doctorToken
        if (!token) throw new Error("Unauthorized")

        let decoded: any
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!)
        } catch {
            throw new Error("Invalid token")
        }
        const doctorId = decoded.id

        const rules = await prismaClient.doctorSlotRule.findMany({
            where: { doctorId },
            select: { dayOfWeek: true, slots: true, duration: true }
        })

        const overrides = await prismaClient.doctorSlotOverride.findMany({
            where: { doctorId },
            select: { date: true, slots: true, duration: true }
        })

        return {
            rules: rules.map(r => ({
            dayOfWeek: r.dayOfWeek,
            slots: r.slots as { start: string; end: string }[],
            duration: r.duration
            })),
            overrides: overrides.map(o => ({
            date: o.date.toISOString(),
            slots: o.slots as { start: string; end: string }[],
            duration: o.duration
            }))
        }
    }

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
    createBasicDetails: async (__: any, { name, id, qualifications, specializations, location, hospital, fees, desc, languages, experience }: { name: string, id: number, qualifications: string, specializations: string[], location: string, hospital: string, fees: number, desc: string, languages: string[], experience: string }) => {
    const specialityRecords = await Promise.all(
        specializations.map(async (s) =>
        prismaClient.speciality.upsert({ where: { name: s }, update: {}, create: { name: s } })
        )
    );
    const doctor = await prismaClient.doctor.update({
        where: { id },
        data: { name, qualifications, location, hospital, fees, description: desc, languages, experience, specialities: { deleteMany: {}, create: specialityRecords.map((spec) => ({ speciality: { connect: { id: spec.id } } })) } },
    });

    return { id: doctor.id };
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
    saveDoctorSchedule: async (_: any, args: { rules: DoctorSlotRuleInput[]; overrides: DoctorSlotOverrideInput[] }, { req }: Context) => {
        const token = req.cookies.doctorToken
        if (!token) throw new Error("Unauthorized")
        let decoded: any
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!)
        } catch {
            throw new Error("Invalid token")
        }
        const doctorId = decoded.id

        // Check for booked appointments conflicting with new rules/overrides
        const appointments = await prismaClient.appointment.findMany({
            where: {
            doctorId,
            status: "SCHEDULED"
            }
        })

        const hasConflict = (slots: { start: string; end: string }[], date?: Date) => {
            return appointments.some(app => {
            const appDate = new Date(app.date)
            if (date && appDate.toDateString() !== date.toDateString()) return false
            const appTime = app.time
            return slots.some(s => appTime >= s.start && appTime < s.end)
            })
        }

        for (const r of args.rules) {
            if (hasConflict(r.slots)) {
            throw new Error("Cannot update rules. Some slots already have booked appointments.")
            }
        }
        for (const o of args.overrides) {
            if (hasConflict(o.slots, new Date(o.date))) {
            throw new Error("Cannot update overrides. Some slots already have booked appointments.")
            }
        }

        // Replace existing rules for this doctor
        await prismaClient.doctorSlotRule.deleteMany({ where: { doctorId } })
        await prismaClient.doctorSlotRule.createMany({
            data: args.rules.map(r => ({
            doctorId,
            dayOfWeek: r.dayOfWeek,
            slots: r.slots as unknown as Prisma.InputJsonValue,
            duration: r.duration ?? 0
            }))
        })

        // Replace existing overrides for this doctor
        await prismaClient.doctorSlotOverride.deleteMany({ where: { doctorId } })
        await prismaClient.doctorSlotOverride.createMany({
            data: args.overrides.map(o => ({
            doctorId,
            date: new Date(o.date),
            slots: o.slots as unknown as Prisma.InputJsonValue,
            duration: o.duration ?? 0
            }))
        })

        return { success: true, message: "Schedule updated successfully" }
    }
}

export const resolvers = { queries, mutations }