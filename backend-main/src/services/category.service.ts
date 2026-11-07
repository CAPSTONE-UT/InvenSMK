import { createAdminSupabaseClient } from "../config/supabase.js";
import type {
  CategoryListQuery,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../schemas/category.schema.js";
import type { CategoryPayload, CategoryService } from "../types/inventory.types.js";
import { ConflictError, NotFoundError } from "../utils/api-error.js";
import type { Paginated } from "../utils/pagination.js";
import { categorySelect, toCategoryPayload } from "./inventory.mappers.js";
import { compact, databaseError, fetchPage, isPgError, pgErrorCodes } from "./supabase-helpers.js";

const categoryNotFound = "Kategori tidak ditemukan";
const duplicateName = "Nama kategori sudah digunakan";

export class SupabaseCategoryService implements CategoryService {
  public async listCategories(query: CategoryListQuery): Promise<Paginated<CategoryPayload>> {
    const client = createAdminSupabaseClient();
    return fetchPage(
      "categories.list",
      query.page,
      query.limit,
      (from, to) => {
        let builder = client.from("categories").select(categorySelect, { count: "exact" });
        if (query.q !== undefined) builder = builder.ilike("name", `%${query.q}%`);
        return builder.order("name").order("id").range(from, to);
      },
      toCategoryPayload,
    );
  }

  public async getCategory(id: string): Promise<CategoryPayload> {
    const client = createAdminSupabaseClient();
    const { data, error } = await client
      .from("categories")
      .select(categorySelect)
      .eq("id", id)
      .maybeSingle();

    if (error !== null) throw databaseError("categories.get", error);
    if (data === null) throw new NotFoundError(categoryNotFound);
    return toCategoryPayload(data);
  }

  public async createCategory(input: CreateCategoryInput): Promise<CategoryPayload> {
    const client = createAdminSupabaseClient();
    const { data, error } = await client
      .from("categories")
      .insert({ name: input.name, description: input.description })
      .select(categorySelect)
      .single();

    if (error !== null) {
      if (isPgError(error, pgErrorCodes.uniqueViolation)) throw new ConflictError(duplicateName);
      throw databaseError("categories.create", error);
    }
    return toCategoryPayload(data);
  }

  public async updateCategory(id: string, input: UpdateCategoryInput): Promise<CategoryPayload> {
    const client = createAdminSupabaseClient();
    const { data, error } = await client
      .from("categories")
      .update(compact({ name: input.name, description: input.description }))
      .eq("id", id)
      .select(categorySelect)
      .maybeSingle();

    if (error !== null) {
      if (isPgError(error, pgErrorCodes.uniqueViolation)) throw new ConflictError(duplicateName);
      throw databaseError("categories.update", error);
    }
    if (data === null) throw new NotFoundError(categoryNotFound);
    return toCategoryPayload(data);
  }

  public async deleteCategory(id: string): Promise<void> {
    const client = createAdminSupabaseClient();
    const { data, error } = await client
      .from("categories")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error !== null) {
      if (isPgError(error, pgErrorCodes.foreignKeyViolation)) {
        throw new ConflictError("Kategori masih memiliki barang dan tidak dapat dihapus");
      }
      throw databaseError("categories.delete", error);
    }
    if (data === null) throw new NotFoundError(categoryNotFound);
  }
}
