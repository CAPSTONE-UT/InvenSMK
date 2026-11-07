import type { Request, Response } from "express";

import {
  categoryListQuerySchema,
  createCategorySchema,
  updateCategorySchema,
} from "../schemas/category.schema.js";
import { idParamSchema } from "../schemas/common.schema.js";
import type { CategoryService } from "../types/inventory.types.js";
import { sendSuccess } from "../utils/api-response.js";
import { parseInput } from "../utils/validation.js";

// Express 5 meneruskan promise yang ditolak ke global error handler.
export class CategoryController {
  public constructor(private readonly categoryService: CategoryService) {}

  public list = async (request: Request, response: Response): Promise<void> => {
    const query = parseInput(categoryListQuerySchema, request.query);
    sendSuccess(response, 200, await this.categoryService.listCategories(query));
  };

  public get = async (request: Request, response: Response): Promise<void> => {
    const { id } = parseInput(idParamSchema, request.params);
    sendSuccess(response, 200, await this.categoryService.getCategory(id));
  };

  public create = async (request: Request, response: Response): Promise<void> => {
    const input = parseInput(createCategorySchema, request.body);
    sendSuccess(response, 201, await this.categoryService.createCategory(input), "Kategori berhasil dibuat");
  };

  public update = async (request: Request, response: Response): Promise<void> => {
    const { id } = parseInput(idParamSchema, request.params);
    const input = parseInput(updateCategorySchema, request.body);
    sendSuccess(response, 200, await this.categoryService.updateCategory(id, input), "Kategori berhasil diperbarui");
  };

  public remove = async (request: Request, response: Response): Promise<void> => {
    const { id } = parseInput(idParamSchema, request.params);
    await this.categoryService.deleteCategory(id);
    sendSuccess(response, 200, undefined, "Kategori berhasil dihapus");
  };
}
