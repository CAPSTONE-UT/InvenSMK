import type { Request, Response } from "express";

import { requireAuth } from "../middleware/rbac.middleware.js";
import { idParamSchema } from "../schemas/common.schema.js";
import {
  barcodeParamSchema,
  createItemSchema,
  itemListQuerySchema,
  updateItemSchema,
} from "../schemas/item.schema.js";
import type { ItemService } from "../types/inventory.types.js";
import { sendSuccess } from "../utils/api-response.js";
import { parseInput } from "../utils/validation.js";

export class ItemController {
  public constructor(private readonly itemService: ItemService) {}

  public list = async (request: Request, response: Response): Promise<void> => {
    const query = parseInput(itemListQuerySchema, request.query);
    sendSuccess(response, 200, await this.itemService.listItems(query));
  };

  public get = async (request: Request, response: Response): Promise<void> => {
    const { id } = parseInput(idParamSchema, request.params);
    sendSuccess(response, 200, await this.itemService.getItem(id));
  };

  public getByBarcode = async (request: Request, response: Response): Promise<void> => {
    const { code } = parseInput(barcodeParamSchema, request.params);
    sendSuccess(response, 200, await this.itemService.getItemByBarcode(code));
  };

  public history = async (request: Request, response: Response): Promise<void> => {
    const { id } = parseInput(idParamSchema, request.params);
    sendSuccess(response, 200, await this.itemService.getItemHistory(id));
  };

  public create = async (request: Request, response: Response): Promise<void> => {
    const actor = requireAuth(request);
    const input = parseInput(createItemSchema, request.body);
    sendSuccess(response, 201, await this.itemService.createItem(input, actor), "Barang berhasil ditambahkan");
  };

  public update = async (request: Request, response: Response): Promise<void> => {
    const actor = requireAuth(request);
    const { id } = parseInput(idParamSchema, request.params);
    const input = parseInput(updateItemSchema, request.body);
    sendSuccess(response, 200, await this.itemService.updateItem(id, input, actor), "Barang berhasil diperbarui");
  };

  public remove = async (request: Request, response: Response): Promise<void> => {
    const { id } = parseInput(idParamSchema, request.params);
    await this.itemService.deleteItem(id);
    sendSuccess(response, 200, undefined, "Barang berhasil dihapus");
  };
}
