import type { Request, Response } from "express";

import { dashboardQuerySchema } from "../schemas/dashboard.schema.js";
import type { DashboardService } from "../types/inventory.types.js";
import { sendSuccess } from "../utils/api-response.js";
import { parseInput } from "../utils/validation.js";

export class DashboardController {
  public constructor(private readonly dashboardService: DashboardService) {}

  public summary = async (request: Request, response: Response): Promise<void> => {
    const query = parseInput(dashboardQuerySchema, request.query);
    sendSuccess(response, 200, await this.dashboardService.getSummary(query));
  };
}
