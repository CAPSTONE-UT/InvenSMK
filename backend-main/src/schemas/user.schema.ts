import { z } from "zod";

import { accountStatuses, userRoles } from "../types/auth.types.js";
import {
  emailFieldSchema,
  fullNameFieldSchema,
  passwordFieldSchema,
  schoolUnitFieldSchema,
  staffIdFieldSchema,
} from "./auth.schema.js";
import {
  atLeastOneFieldMessage,
  hasAtLeastOneField,
  paginationQuerySchema,
  searchTermSchema,
} from "./common.schema.js";

export const userListQuerySchema = paginationQuerySchema.extend({
  q: searchTermSchema,
  role: z.enum(userRoles).optional(),
  account_status: z.enum(accountStatuses).optional(),
});

export const createUserSchema = z.strictObject({
  full_name: fullNameFieldSchema,
  email: emailFieldSchema,
  password: passwordFieldSchema,
  staff_id: staffIdFieldSchema,
  school_unit: schoolUnitFieldSchema,
  role: z.enum(userRoles).default("staff"),
});

export const updateUserSchema = z
  .strictObject({
    full_name: fullNameFieldSchema.optional(),
    school_unit: schoolUnitFieldSchema.optional(),
    role: z.enum(userRoles).optional(),
    account_status: z.enum(accountStatuses).optional(),
  })
  .refine(hasAtLeastOneField, atLeastOneFieldMessage);

export type UserListQuery = z.output<typeof userListQuerySchema>;
export type CreateUserInput = z.output<typeof createUserSchema>;
export type UpdateUserInput = z.output<typeof updateUserSchema>;
