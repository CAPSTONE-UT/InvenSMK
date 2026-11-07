import { type RequestHandler, Router } from "express";

import { LoanController } from "../controllers/loan.controller.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { roleGroups } from "../types/auth.types.js";
import type { LoanService } from "../types/inventory.types.js";

export function createLoanRouter(loanService: LoanService, authMiddleware: RequestHandler): Router {
  const controller = new LoanController(loanService);
  const router = Router();
  const operators = requireRole(...roleGroups.operators);
  const everyone = requireRole(...roleGroups.everyone);

  router.use(authMiddleware);
  router.get("/", operators, controller.list);
  router.get("/me", everyone, controller.listMine);
  router.get("/:id", everyone, controller.get);
  router.post("/", operators, controller.create);
  router.post("/:id/return", operators, controller.returnItem);

  return router;
}
