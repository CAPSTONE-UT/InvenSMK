export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ApiError<TDetails = ApiErrorDetail[]> {
  code: string;
  details?: TDetails;
}

export interface BaseResponse<T = never> {
  success: boolean;
  message?: string;
  data?: T;
  error?: ApiError;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export type UserRole = 'staff' | 'inventory_officer' | 'admin';
export type AccountStatus = 'active' | 'inactive';

export interface UserSession {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_at: number;
}

export interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  staff_id: string;
  school_unit: string;
  role: UserRole;
  account_status: AccountStatus;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  password: string;
  staff_id: string;
  school_unit: string;
}

export interface LoginData {
  session: UserSession;
  user: UserProfile;
}

export interface RegisterData {
  user_id: string;
  email: string;
  email_verification_required: boolean;
  session?: UserSession;
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export interface PageQuery {
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export type ItemCondition = 'good' | 'minor_damage' | 'damaged';
export type ItemStatus = 'available' | 'borrowed' | 'damaged';
export type LoanStatus = 'active' | 'returned';
export type LoanStatusFilter = 'all' | 'active' | 'overdue' | 'returned';
export type ConditionLogEvent = 'registered' | 'borrowed' | 'returned' | 'updated';

export interface CategoryRef {
  id: string;
  name: string;
}

export interface Category extends CategoryRef {
  description: string | null;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryInput {
  name: string;
  description: string | null;
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

export interface Item extends ItemRef {
  location: string | null;
  condition: ItemCondition;
  status: ItemStatus;
  acquired_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Loan {
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

export type ActiveLoan = Omit<Loan, 'item'>;

export interface ItemDetail extends Item {
  active_loan: ActiveLoan | null;
}

export interface ItemInput {
  barcode?: string;
  name: string;
  category_id: string;
  location: string | null;
  condition: ItemCondition;
  acquired_at: string | null;
  notes: string | null;
}

export interface ItemQuery extends PageQuery {
  q?: string;
  category_id?: string;
  status?: ItemStatus;
  condition?: ItemCondition;
}

export interface ConditionLog {
  id: string;
  loan_id: string | null;
  condition: ItemCondition;
  event: ConditionLogEvent;
  notes: string | null;
  recorded_at: string;
  recorded_by: OfficerRef | null;
}

export interface ItemHistory {
  item: ItemDetail;
  loans: Loan[];
  condition_logs: ConditionLog[];
}

export interface LoanQuery extends PageQuery {
  status?: LoanStatusFilter;
  item_id?: string;
  borrower_id?: string;
  borrowed_from?: string;
  borrowed_to?: string;
}

export interface LoanCreateInput {
  item_id: string;
  borrower_id: string;
  due_at: string;
  notes: string | null;
}

export interface LoanReturnInput {
  condition: ItemCondition;
  notes: string | null;
}

/** Detail error 409 saat barang yang dipinjam tidak tersedia (U-09). */
export interface ItemUnavailableDetails {
  item_status: ItemStatus | null;
  active_loan: ActiveLoan | null;
}

// ---------------------------------------------------------------------------
// Users & dashboard
// ---------------------------------------------------------------------------

export interface ManagedUser extends UserProfile {
  created_at: string;
  updated_at: string;
}

export interface UserQuery extends PageQuery {
  q?: string;
  role?: UserRole;
  account_status?: AccountStatus;
}

export interface UserCreateInput extends RegisterRequest {
  role: UserRole;
}

export interface UserUpdateInput {
  full_name?: string;
  school_unit?: string;
  role?: UserRole;
  account_status?: AccountStatus;
}

export interface WeeklyLoanBucket {
  week_start: string;
  week_end: string;
  total: number;
}

export interface DashboardSummary {
  generated_at: string;
  items: { total: number; available: number; borrowed: number; damaged: number };
  categories: { total: number };
  loans: { active: number; overdue: number; borrowed_this_month: number };
  weekly_loans: WeeklyLoanBucket[];
  overdue_loans: Loan[];
}
