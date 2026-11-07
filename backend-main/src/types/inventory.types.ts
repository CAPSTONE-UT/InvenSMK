import type {
  CategoryListQuery,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../schemas/category.schema.js";
import type { DashboardQuery } from "../schemas/dashboard.schema.js";
import type { CreateItemInput, ItemListQuery, UpdateItemInput } from "../schemas/item.schema.js";
import type {
  CreateLoanInput,
  LoanListQuery,
  MyLoanQuery,
  ReturnLoanInput,
} from "../schemas/loan.schema.js";
import type { CreateUserInput, UpdateUserInput, UserListQuery } from "../schemas/user.schema.js";
import type { Paginated } from "../utils/pagination.js";
import type { AccountStatus, AuthenticatedUser, UserRole } from "./auth.types.js";

export const itemConditions = ["good", "minor_damage", "damaged"] as const;
export const itemStatuses = ["available", "borrowed", "damaged"] as const;
export const loanStatuses = ["active", "returned"] as const;
export const conditionLogEvents = ["registered", "borrowed", "returned", "updated"] as const;

export type ItemCondition = (typeof itemConditions)[number];
export type ItemStatus = (typeof itemStatuses)[number];
export type LoanStatus = (typeof loanStatuses)[number];
export type ConditionLogEvent = (typeof conditionLogEvents)[number];

/** Status barang diturunkan dari kondisi bila barang tidak sedang dipinjam. */
export function statusForCondition(condition: ItemCondition): ItemStatus {
  return condition === "damaged" ? "damaged" : "available";
}

// ---------------------------------------------------------------------------
// Payload (kontrak JSON, snake_case)
// ---------------------------------------------------------------------------

export interface CategoryRef {
  id: string;
  name: string;
}

export interface CategoryPayload extends CategoryRef {
  description: string | null;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface PersonRef {
  user_id: string;
  full_name: string;
  staff_id: string;
  school_unit: string;
}

export interface OfficerRef {
  user_id: string;
  full_name: string;
}

export interface ItemRef {
  id: string;
  barcode: string;
  name: string;
  category: CategoryRef;
}

export interface ItemPayload extends ItemRef {
  location: string | null;
  condition: ItemCondition;
  status: ItemStatus;
  acquired_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanPayload {
  id: string;
  status: LoanStatus;
  is_overdue: boolean;
  overdue_days: number;
  returned_late: boolean;
  borrowed_at: string;
  due_at: string;
  returned_at: string | null;
  notes: string | null;
  return_condition: ItemCondition | null;
  return_notes: string | null;
  item: ItemRef;
  borrower: PersonRef;
  officer: OfficerRef;
  return_officer: OfficerRef | null;
  created_at: string;
  updated_at: string;
}

export type ActiveLoanSummary = Omit<LoanPayload, "item">;

export interface ItemDetailPayload extends ItemPayload {
  active_loan: ActiveLoanSummary | null;
}

export interface ConditionLogPayload {
  id: string;
  loan_id: string | null;
  condition: ItemCondition;
  event: ConditionLogEvent;
  notes: string | null;
  recorded_at: string;
  recorded_by: OfficerRef | null;
}

export interface ItemHistoryPayload {
  item: ItemDetailPayload;
  loans: LoanPayload[];
  condition_logs: ConditionLogPayload[];
}

export interface ManagedUserPayload {
  user_id: string;
  full_name: string;
  email: string;
  staff_id: string;
  school_unit: string;
  role: UserRole;
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface WeeklyLoanBucket {
  week_start: string;
  week_end: string;
  total: number;
}

export interface DashboardSummaryPayload {
  generated_at: string;
  items: {
    total: number;
    available: number;
    borrowed: number;
    damaged: number;
  };
  categories: {
    total: number;
  };
  loans: {
    active: number;
    overdue: number;
    borrowed_this_month: number;
  };
  weekly_loans: WeeklyLoanBucket[];
  overdue_loans: LoanPayload[];
}

// ---------------------------------------------------------------------------
// Service interfaces
// ---------------------------------------------------------------------------

export interface CategoryService {
  listCategories(query: CategoryListQuery): Promise<Paginated<CategoryPayload>>;
  getCategory(id: string): Promise<CategoryPayload>;
  createCategory(input: CreateCategoryInput): Promise<CategoryPayload>;
  updateCategory(id: string, input: UpdateCategoryInput): Promise<CategoryPayload>;
  deleteCategory(id: string): Promise<void>;
}

export interface ItemService {
  listItems(query: ItemListQuery): Promise<Paginated<ItemPayload>>;
  getItem(id: string): Promise<ItemDetailPayload>;
  getItemByBarcode(barcode: string): Promise<ItemDetailPayload>;
  getItemHistory(id: string): Promise<ItemHistoryPayload>;
  createItem(input: CreateItemInput, actor: AuthenticatedUser): Promise<ItemDetailPayload>;
  updateItem(id: string, input: UpdateItemInput, actor: AuthenticatedUser): Promise<ItemDetailPayload>;
  deleteItem(id: string): Promise<void>;
}

export interface LoanService {
  listLoans(query: LoanListQuery): Promise<Paginated<LoanPayload>>;
  listMyLoans(identity: AuthenticatedUser, query: MyLoanQuery): Promise<Paginated<LoanPayload>>;
  getLoan(id: string, identity: AuthenticatedUser): Promise<LoanPayload>;
  createLoan(input: CreateLoanInput, actor: AuthenticatedUser): Promise<LoanPayload>;
  returnLoan(id: string, input: ReturnLoanInput, actor: AuthenticatedUser): Promise<LoanPayload>;
}

export interface UserService {
  listUsers(query: UserListQuery): Promise<Paginated<ManagedUserPayload>>;
  getUser(id: string): Promise<ManagedUserPayload>;
  createUser(input: CreateUserInput): Promise<ManagedUserPayload>;
  updateUser(id: string, input: UpdateUserInput, actor: AuthenticatedUser): Promise<ManagedUserPayload>;
}

export interface DashboardService {
  getSummary(query: DashboardQuery): Promise<DashboardSummaryPayload>;
}
