import type { Request, Response } from "express";

import { requireAuth } from "../middleware/rbac.middleware.js";
import { idParamSchema } from "../schemas/common.schema.js";
import { createUserSchema, updateUserSchema, userListQuerySchema } from "../schemas/user.schema.js";
import type { UserService } from "../types/inventory.types.js";
import { sendSuccess } from "../utils/api-response.js";
import { parseInput } from "../utils/validation.js";

export class UserController {
  public constructor(private readonly userService: UserService) {}

  public list = async (request: Request, response: Response): Promise<void> => {
    const query = parseInput(userListQuerySchema, request.query);
    sendSuccess(response, 200, await this.userService.listUsers(query));
  };

  public get = async (request: Request, response: Response): Promise<void> => {
    const { id } = parseInput(idParamSchema, request.params);
    sendSuccess(response, 200, await this.userService.getUser(id));
  };

  public create = async (request: Request, response: Response): Promise<void> => {
    const input = parseInput(createUserSchema, request.body);
    sendSuccess(response, 201, await this.userService.createUser(input), "Pengguna berhasil dibuat");
  };

  public update = async (request: Request, response: Response): Promise<void> => {
    const actor = requireAuth(request);
    const { id } = parseInput(idParamSchema, request.params);
    const input = parseInput(updateUserSchema, request.body);
    sendSuccess(response, 200, await this.userService.updateUser(id, input, actor), "Pengguna berhasil diperbarui");
  };
}
