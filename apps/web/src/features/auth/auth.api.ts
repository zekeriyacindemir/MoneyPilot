import { apiClient } from '@/lib/api/client';
import type { AuthResponse, LoginRequest, PreferencesRequest, ProfileRequest, RegisterRequest, Session, User } from './auth.types';

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

export async function updateProfile(request: ProfileRequest): Promise<User> { return (await apiClient.patch<User>('/auth/profile', request)).data; }
export async function updatePreferences(request: PreferencesRequest): Promise<User> { return (await apiClient.patch<User>('/auth/preferences', request)).data; }
export async function changePassword(request: { currentPassword: string; newPassword: string }): Promise<void> { await apiClient.patch('/auth/password', request); }
export async function getSessions(): Promise<Session[]> { return (await apiClient.get<Session[]>('/auth/sessions')).data; }
export async function revokeSession(id: string): Promise<void> { await apiClient.delete(`/auth/sessions/${id}`); }
export async function deleteAccount(currentPassword: string): Promise<void> { await apiClient.delete('/auth/account', { data: { currentPassword } }); }
export async function downloadExport(format: 'json' | 'csv'): Promise<void> { const response = await apiClient.get(`/auth/export?format=${format}`, { responseType: 'blob' }); const url = URL.createObjectURL(response.data as Blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `moneypilot-backup.${format === 'csv' ? 'zip' : 'json'}`; anchor.click(); URL.revokeObjectURL(url); }
