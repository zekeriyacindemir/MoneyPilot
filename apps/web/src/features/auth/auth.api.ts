import { apiClient } from '@/lib/api/client';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from './auth.types';

export async function register(request: RegisterRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/register', request);

  return response.data;
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/login', request);

  return response.data;
}

export async function refresh(): Promise<{ accessToken: string }> {
  const response = await apiClient.post<{ accessToken: string }>('/auth/refresh');

  return response.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function logoutAll(): Promise<void> {
  await apiClient.post('/auth/logout-all');
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<User>('/auth/me');

  return response.data;
}
