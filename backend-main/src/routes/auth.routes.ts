import { type RequestHandler, Router } from "express";

import { AuthController } from "../controllers/auth.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { loginSchema, refreshSchema, registerSchema } from "../schemas/auth.schema.js";
import type { AuthService } from "../types/auth.types.js";

export function createAuthRouter(authService: AuthService, authMiddleware: RequestHandler): Router {
  const authController = new AuthController(authService);
  const router = Router();

  router.post("/register", validateBody(registerSchema), authController.register);
  router.post("/login", validateBody(loginSchema), authController.login);
  router.post("/refresh", validateBody(refreshSchema), authController.refresh);
  router.post("/logout", authMiddleware, authController.logout);
  router.get("/profile", authMiddleware, authController.getProfile);

  return router;
}
