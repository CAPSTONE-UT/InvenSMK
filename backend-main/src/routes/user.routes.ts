import { type RequestHandler, Router } from "express";

import { UserController } from "../controllers/user.controller.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { roleGroups } from "../types/auth.types.js";
import type { UserService } from "../types/inventory.types.js";

export function createUserRouter(userService: UserService, authMiddleware: RequestHandler): Router {
  const controller = new UserController(userService);
  const router = Router();
  const adminOnly = requireRole(...roleGroups.admin);
  // Petugas membutuhkan daftar pengguna untuk memilih peminjam (hanya baca).
  const operators = requireRole(...roleGroups.operators);

  router.use(authMiddleware);
  router.get("/", operators, controller.list);
  router.get("/:id", operators, controller.get);
  router.post("/", adminOnly, controller.create);
  router.put("/:id", adminOnly, controller.update);

  return router;
}
