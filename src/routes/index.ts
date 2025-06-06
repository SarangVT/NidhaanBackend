import { Router } from "express";
import { GoogleOAuthController } from "../controllers/googleOAuthController";

export const router = Router()
router.use("/google/callback", GoogleOAuthController)