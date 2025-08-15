import { OAuth2Client } from "google-auth-library";
import { prismaClient } from "../lib/db";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID!);

export async function verifyGoogleToken(token: string) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID!,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error("Google account has no email");
  }

  return {
    email: payload.email,
    name: payload.name || null,
    picture: payload.picture || null,
  };
}

export async function doctorGoogleOAuth(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ message: "Token is required" });
      return;
    }

    const { email } = await verifyGoogleToken(token);

    let doctor = await prismaClient.doctor.findUnique({ where: { email } });
    if (!doctor) {
      doctor = await prismaClient.doctor.create({
        data: { email, isGoogleLogin: true },
      });
    }

    const appToken = jwt.sign({ id: doctor.id, role: "doctor" }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });

    res.cookie("doctorToken", appToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ id: doctor.id, email: doctor.email, registrationComplete: doctor.registrationComplete });
  } catch (err) {
    console.error("Doctor Google Auth Error:", err);
    res.status(401).json({ message: "Invalid Google token" });
  }
}

// export async function userGoogleAuth(req: Request, res: Response): Promise<void> {
//   try {
//     const { token } = req.body;
//     if (!token) {
//       res.status(400).json({ message: "Token is required" });
//       return;
//     }

//     const { email } = await verifyGoogleToken(token);

//     let user = await prismaClient.doctor.findUnique({ where: { email } });
//     if (!user) {
//       user = await prismaClient.user.create({
//         data: { email, isGoogleLogin: true },
//       });
//     }

//     const appToken = jwt.sign({ id: user.id, role: "doctor" }, process.env.JWT_SECRET!, {
//       expiresIn: "7d",
//     });

//     res.cookie("doctorToken", appToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "lax",
//       maxAge: 7 * 24 * 60 * 60 * 1000,
//     });

//     res.status(200).json({ id: user.id, email: user.email });
//   } catch (err) {
//     console.error("Doctor Google Auth Error:", err);
//     res.status(401).json({ message: "Invalid Google token" });
//   }
// }