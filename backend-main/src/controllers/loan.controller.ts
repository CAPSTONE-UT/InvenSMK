import type { Request, Response } from "express";

import { requireAuth } from "../middleware/rbac.middleware.js";
import { idParamSchema } from "../schemas/common.schema.js";
import {
  createLoanSchema,
  loanListQuerySchema,
  myLoanQuerySchema,
  returnLoanSchema,
} from "../schemas/loan.schema.js";
import type { LoanService } from "../types/inventory.types.js";
import { sendSuccess } from "../utils/api-response.js";
import { parseInput } from "../utils/validation.js";

export class LoanController {
  public constructor(private readonly loanService: LoanService) {}

  public list = async (request: Request, response: Response): Promise<void> => {
    const query = parseInput(loanListQuerySchema, request.query);
    sendSuccess(response, 200, await this.loanService.listLoans(query));
  };

  public listMine = async (request: Request, response: Response): Promise<void> => {
    const identity = requireAuth(request);
    const query = parseInput(myLoanQuerySchema, request.query);
    sendSuccess(response, 200, await this.loanService.listMyLoans(identity, query));
  };

  public get = async (request: Request, response: Response): Promise<void> => {
    const identity = requireAuth(request);
    const { id } = parseInput(idParamSchema, request.params);
    sendSuccess(response, 200, await this.loanService.getLoan(id, identity));
  };

  public create = async (request: Request, response: Response): Promise<void> => {
    const actor = requireAuth(request);
    const input = parseInput(createLoanSchema, request.body);
    sendSuccess(response, 201, await this.loanService.createLoan(input, actor), "Peminjaman berhasil dicatat");
  };

  public returnItem = async (request: Request, response: Response): Promise<void> => {
    const actor = requireAuth(request);
    const { id } = parseInput(idParamSchema, request.params);
    const input = parseInput(returnLoanSchema, request.body);
    sendSuccess(response, 200, await this.loanService.returnLoan(id, input, actor), "Pengembalian berhasil dicatat");
  };
}
