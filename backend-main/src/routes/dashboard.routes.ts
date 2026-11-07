import { type RequestHandler, Router } from "express";

import { DashboardController } from "../controllers/dashboard.controller.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { roleGroups } from "../types/auth.types.js";
import type { DashboardService } from "../types/inventory.types.js";

export function createDashboardRouter(dashboardService: DashboardService, authMiddleware: RequestHandler): Router {
  const controller = new DashboardController(dashboardService);
  const router = Router();

  router.use(authMiddleware);
  router.get("/summary", requireRole(...roleGroups.admin), controller.summary);

  return router;
}
