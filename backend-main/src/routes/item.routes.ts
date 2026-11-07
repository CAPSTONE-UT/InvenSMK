import { type RequestHandler, Router } from "express";

import { ItemController } from "../controllers/item.controller.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { roleGroups } from "../types/auth.types.js";
import type { ItemService } from "../types/inventory.types.js";

export function createItemRouter(itemService: ItemService, authMiddleware: RequestHandler): Router {
  const controller = new ItemController(itemService);
  const router = Router();
  const adminOnly = requireRole(...roleGroups.admin);
  const operators = requireRole(...roleGroups.operators);

  router.use(authMiddleware);
  router.get("/", operators, controller.list);
  router.get("/code/:code", operators, controller.getByBarcode);
  router.get("/:id", operators, controller.get);
  router.get("/:id/history", operators, controller.history);
  router.post("/", adminOnly, controller.create);
  router.put("/:id", adminOnly, controller.update);
  router.delete("/:id", adminOnly, controller.remove);

  return router;
}
