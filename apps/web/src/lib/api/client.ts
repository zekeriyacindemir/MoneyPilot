import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearAccessToken, getAccessToken, setAccessToken } from './access-token';
import { notifyAuthenticationFailure } from './auth-events';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const refreshExcludedEndpoints = new Set([
  '/auth/login',
  '/auth/logout',
  '/auth/refresh',
  '/auth/register',
]);

let refreshPromise: Promise<string> | null = null;

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((configuration) => {
  const accessToken = getAccessToken();

  if (accessToken) {
    configuration.headers.Authorization = `Bearer ${accessToken}`;
  }

  return configuration;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const configuration = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !configuration ||
      configuration._retry ||
      refreshExcludedEndpoints.has(configuration.url ?? '')
    ) {
      return Promise.reject(error);
    }

    configuration._retry = true;

    try {
      const accessToken = await refreshAccessToken();
      configuration.headers.Authorization = `Bearer ${accessToken}`;

      return apiClient.request(configuration);
    } catch {
      return Promise.reject(error);
    }
  },
);

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ accessToken: string }>('/auth/refresh', undefined, {
        baseURL: process.env.NEXT_PUBLIC_API_URL,
        withCredentials: true,
      })
      .then((response) => {
        setAccessToken(response.data.accessToken);

        return response.data.accessToken;
      })
      .catch((error: unknown) => {
        clearAccessToken();
        notifyAuthenticationFailure();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
