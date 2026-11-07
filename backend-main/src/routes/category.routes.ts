import { type RequestHandler, Router } from "express";

import { CategoryController } from "../controllers/category.controller.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { roleGroups } from "../types/auth.types.js";
import type { CategoryService } from "../types/inventory.types.js";

export function createCategoryRouter(categoryService: CategoryService, authMiddleware: RequestHandler): Router {
  const controller = new CategoryController(categoryService);
  const router = Router();
  const adminOnly = requireRole(...roleGroups.admin);
  const everyone = requireRole(...roleGroups.everyone);

  router.use(authMiddleware);
  router.get("/", everyone, controller.list);
  router.get("/:id", everyone, controller.get);
  router.post("/", adminOnly, controller.create);
  router.put("/:id", adminOnly, controller.update);
  router.delete("/:id", adminOnly, controller.remove);

  return router;
}
