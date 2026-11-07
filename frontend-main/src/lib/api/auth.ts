import { api } from './axios';
import type {
  BaseResponse,
  LoginData,
  LoginRequest,
  RegisterData,
  RegisterRequest,
  UserProfile,
} from '@/types/api';

export const authService = {
  checkHealth: () => api.get<BaseResponse<{ status: 'ok' }>>('/health'),

  login: (data: LoginRequest) => api.post<BaseResponse<LoginData>>('/api/v1/auth/login', data),

  register: (data: RegisterRequest) => api.post<BaseResponse<RegisterData>>('/api/v1/auth/register', data),

  getProfile: () => api.get<BaseResponse<UserProfile>>('/api/v1/auth/profile'),

  /** Token dapat dikirim eksplisit untuk mencabut session yang tidak disimpan (alur register). */
  logout: (accessToken?: string) =>
    api.post<BaseResponse>(
      '/api/v1/auth/logout',
      undefined,
      accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    ),
};
