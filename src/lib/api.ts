import { storage } from '@/lib/storage';

let refreshPromise: Promise<boolean> | null = null;

function buildHeaders(existingHeaders?: HeadersInit) {
  const headers = new Headers(existingHeaders);
  const token = storage.get('accessToken');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = storage.get('refreshToken');
    if (!refreshToken) {
      storage.clearAuth();
      return false;
    }

    try {
      const url = `/api/v1/auth/refresh?refresh_token=${encodeURIComponent(refreshToken)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        storage.clearAuth();
        return false;
      }

      const data = await res.json();
      storage.set('accessToken', data.access_token);
      storage.set('refreshToken', data.refresh_token);
      return true;
    } catch (error) {
      console.error('刷新 token 失败:', error);
      storage.clearAuth();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function redirectToLogin() {
  if (typeof window !== 'undefined') {
    storage.clearAuth();
    window.location.assign('/login');
  }
}

export async function authFetch(input: RequestInfo, init?: RequestInit) {
  const headers = buildHeaders(init?.headers);
  const requestInit: RequestInit = {
    ...init,
    headers
  };

  let response = await fetch(input, requestInit);

  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    redirectToLogin();
    return response;
  }

  const retryHeaders = buildHeaders(init?.headers);
  const retryInit: RequestInit = {
    ...init,
    headers: retryHeaders
  };

  response = await fetch(input, retryInit);

  if (response.status === 401) {
    redirectToLogin();
  }

  return response;
}
