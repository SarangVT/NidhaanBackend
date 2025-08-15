import { Router } from "express";
import { doctorGoogleOAuth } from "../controllers/googleOAuthController";

export const googleLogin = Router()
googleLogin.post("/doctor", doctorGoogleOAuth);
