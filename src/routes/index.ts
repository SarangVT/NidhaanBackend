import { Router } from "express";
import { googleLogin } from "./googleLogin";

export const router = Router()
router.use("/google/login", googleLogin);
