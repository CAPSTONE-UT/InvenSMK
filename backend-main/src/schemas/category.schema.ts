import { z } from "zod";

import {
  atLeastOneFieldMessage,
  hasAtLeastOneField,
  nullableText,
  paginationQuerySchema,
  searchTermSchema,
} from "./common.schema.js";

const categoryNameSchema = z.string().trim().min(2).max(80);

export const createCategorySchema = z.strictObject({
  name: categoryNameSchema,
  description: nullableText(500).default(null),
});

export const updateCategorySchema = z
  .strictObject({
    name: categoryNameSchema.optional(),
    description: nullableText(500).optional(),
  })
  .refine(hasAtLeastOneField, atLeastOneFieldMessage);

export const categoryListQuerySchema = paginationQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(100),
  q: searchTermSchema,
});

export type CreateCategoryInput = z.output<typeof createCategorySchema>;
export type UpdateCategoryInput = z.output<typeof updateCategorySchema>;
export type CategoryListQuery = z.output<typeof categoryListQuerySchema>;
