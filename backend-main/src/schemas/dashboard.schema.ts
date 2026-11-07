import { z } from "zod";

export const dashboardQuerySchema = z.object({
  weeks: z.coerce.number().int().min(1).max(12).default(4),
  overdue_limit: z.coerce.number().int().min(1).max(20).default(5),
});

export type DashboardQuery = z.output<typeof dashboardQuerySchema>;
