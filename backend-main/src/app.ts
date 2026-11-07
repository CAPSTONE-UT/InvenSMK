import cors from "cors";
import express, { type Express } from "express";

import { env } from "./config/env.js";
import { createAuthMiddleware } from "./middleware/auth.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { createAuthRouter } from "./routes/auth.routes.js";
import { createCategoryRouter } from "./routes/category.routes.js";
import { createDashboardRouter } from "./routes/dashboard.routes.js";
import { docsRouter, shouldExposeDocs } from "./routes/docs.routes.js";
import { createItemRouter } from "./routes/item.routes.js";
import { createLoanRouter } from "./routes/loan.routes.js";
import { createUserRouter } from "./routes/user.routes.js";
import { SupabaseAuthService } from "./services/auth.service.js";
import { SupabaseCategoryService } from "./services/category.service.js";
import { SupabaseDashboardService } from "./services/dashboard.service.js";
import { SupabaseItemService } from "./services/item.service.js";
import { SupabaseLoanService } from "./services/loan.service.js";
import { SupabaseUserService } from "./services/user.service.js";
import type { AuthService } from "./types/auth.types.js";
import type {
  CategoryService,
  DashboardService,
  ItemService,
  LoanService,
  UserService,
} from "./types/inventory.types.js";
import { sendSuccess } from "./utils/api-response.js";

export interface AppDependencies {
  authService: AuthService;
  categoryService: CategoryService;
  itemService: ItemService;
  loanService: LoanService;
  userService: UserService;
  dashboardService: DashboardService;
}

export function createDefaultDependencies(): AppDependencies {
  return {
    authService: new SupabaseAuthService(),
    categoryService: new SupabaseCategoryService(),
    itemService: new SupabaseItemService(),
    loanService: new SupabaseLoanService(),
    userService: new SupabaseUserService(),
    dashboardService: new SupabaseDashboardService(),
  };
}

export function createApp(dependencies: AppDependencies = createDefaultDependencies()): Express {
  const app = express();
  const authMiddleware = createAuthMiddleware(dependencies.authService);

  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_request, response) => {
    sendSuccess(response, 200, { status: "ok" });
  });

  app.use("/api/v1/auth", createAuthRouter(dependencies.authService, authMiddleware));
  app.use("/api/v1/categories", createCategoryRouter(dependencies.categoryService, authMiddleware));
  app.use("/api/v1/items", createItemRouter(dependencies.itemService, authMiddleware));
  app.use("/api/v1/loans", createLoanRouter(dependencies.loanService, authMiddleware));
  app.use("/api/v1/users", createUserRouter(dependencies.userService, authMiddleware));
  app.use("/api/v1/dashboard", createDashboardRouter(dependencies.dashboardService, authMiddleware));

  if (shouldExposeDocs(env.NODE_ENV)) {
    app.use("/api-docs", docsRouter);
  }
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app: Express = createApp();
