import { api } from './axios';
import type {
  BaseResponse,
  Category,
  CategoryInput,
  DashboardSummary,
  Item,
  ItemDetail,
  ItemHistory,
  ItemInput,
  ItemQuery,
  Loan,
  LoanCreateInput,
  LoanQuery,
  LoanReturnInput,
  LoanStatusFilter,
  ManagedUser,
  PageQuery,
  Paginated,
  UserCreateInput,
  UserQuery,
  UserUpdateInput,
} from '@/types/api';

/** Mengambil `data` dari envelope standar; respons tanpa data dianggap error. */
async function unwrap<T>(request: Promise<{ data: BaseResponse<T> }>): Promise<T> {
  const response = await request;
  if (!response.data.success || response.data.data === undefined) {
    throw new Error(response.data.message || 'Respons API tidak memuat data.');
  }
  return response.data.data;
}

/** Membuang parameter kosong agar tidak dikirim sebagai `?q=`. */
function params<T extends object>(query: T) {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

export const categoryService = {
  list: (query: PageQuery & { q?: string } = {}) =>
    unwrap(api.get<BaseResponse<Paginated<Category>>>('/api/v1/categories', { params: params(query) })),
  get: (id: string) => unwrap(api.get<BaseResponse<Category>>(`/api/v1/categories/${id}`)),
  create: (input: CategoryInput) => unwrap(api.post<BaseResponse<Category>>('/api/v1/categories', input)),
  update: (id: string, input: Partial<CategoryInput>) =>
    unwrap(api.put<BaseResponse<Category>>(`/api/v1/categories/${id}`, input)),
  remove: (id: string) => api.delete<BaseResponse>(`/api/v1/categories/${id}`),
};

export const itemService = {
  list: (query: ItemQuery = {}) =>
    unwrap(api.get<BaseResponse<Paginated<Item>>>('/api/v1/items', { params: params(query) })),
  get: (id: string) => unwrap(api.get<BaseResponse<ItemDetail>>(`/api/v1/items/${id}`)),
  getByBarcode: (code: string) =>
    unwrap(api.get<BaseResponse<ItemDetail>>(`/api/v1/items/code/${encodeURIComponent(code.trim())}`)),
  history: (id: string) => unwrap(api.get<BaseResponse<ItemHistory>>(`/api/v1/items/${id}/history`)),
  create: (input: ItemInput) => unwrap(api.post<BaseResponse<ItemDetail>>('/api/v1/items', input)),
  update: (id: string, input: Partial<ItemInput>) =>
    unwrap(api.put<BaseResponse<ItemDetail>>(`/api/v1/items/${id}`, input)),
  remove: (id: string) => api.delete<BaseResponse>(`/api/v1/items/${id}`),
};

export const loanService = {
  list: (query: LoanQuery = {}) =>
    unwrap(api.get<BaseResponse<Paginated<Loan>>>('/api/v1/loans', { params: params(query) })),
  mine: (query: PageQuery & { status?: LoanStatusFilter } = {}) =>
    unwrap(api.get<BaseResponse<Paginated<Loan>>>('/api/v1/loans/me', { params: params(query) })),
  get: (id: string) => unwrap(api.get<BaseResponse<Loan>>(`/api/v1/loans/${id}`)),
  create: (input: LoanCreateInput) => unwrap(api.post<BaseResponse<Loan>>('/api/v1/loans', input)),
  returnItem: (id: string, input: LoanReturnInput) =>
    unwrap(api.post<BaseResponse<Loan>>(`/api/v1/loans/${id}/return`, input)),
};

export const userService = {
  list: (query: UserQuery = {}) =>
    unwrap(api.get<BaseResponse<Paginated<ManagedUser>>>('/api/v1/users', { params: params(query) })),
  get: (id: string) => unwrap(api.get<BaseResponse<ManagedUser>>(`/api/v1/users/${id}`)),
  create: (input: UserCreateInput) => unwrap(api.post<BaseResponse<ManagedUser>>('/api/v1/users', input)),
  update: (id: string, input: UserUpdateInput) =>
    unwrap(api.put<BaseResponse<ManagedUser>>(`/api/v1/users/${id}`, input)),
};

export const dashboardService = {
  summary: (query: { weeks?: number; overdue_limit?: number } = {}) =>
    unwrap(api.get<BaseResponse<DashboardSummary>>('/api/v1/dashboard/summary', { params: params(query) })),
};
