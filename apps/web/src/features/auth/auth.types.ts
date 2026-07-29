export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  defaultCurrency: Currency;
  budgetAlertsEnabled: boolean;
  savingsGoalAlertsEnabled: boolean;
  weeklySummaryEnabled: boolean;
}

export type Currency = 'TRY' | 'USD' | 'EUR' | 'GBP';
export interface Session { id: string; createdAt: string; lastUsedAt: string | null; expiresAt: string; current: boolean; }
export interface ProfileRequest { name?: string; email?: string; currentPassword?: string; }
export interface PreferencesRequest { defaultCurrency?: Currency; budgetAlertsEnabled?: boolean; savingsGoalAlertsEnabled?: boolean; weeklySummaryEnabled?: boolean; }

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  name: string;
}
