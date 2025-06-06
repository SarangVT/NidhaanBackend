import { Request, Response } from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { prismaClient } from "../lib/db.js";
import qs from "querystring";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;
const JWT_SECRET = process.env.JWT_SECRET!;
const FRONTEND_REDIRECT_URI = process.env.FRONTEND_REDIRECT_URI!;

export const GoogleOAuthController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const code = req.query.code as string | undefined;
  if (!code) {
    res.status(400).json({ error: "Missing code" });
    return;
  }

  try {
    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      qs.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token } = tokenRes.data;

    const userInfoRes = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const { email } = userInfoRes.data;

    const user = await prismaClient.user.findUnique({ where: { email } });

    if (!user) {
      // User needs to sign up
      res.json({
        needsSignup: true,
        token: '',
        user: null,
      });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      needsSignup: false,
      user,
      token,
    });
  } catch (err: any) {
    console.error("OAuth error:", err?.response?.data || err.message || err);
    res.status(500).json({ error: "OAuth failed" });
  }
};
