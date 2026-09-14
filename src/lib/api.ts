import { toast } from 'sonner';

import { getClerkToken } from '@/lib/token-manager';

let lastAuthErrorToastAt = 0;
const AUTH_ERROR_TOAST_INTERVAL_MS = 5000;

function buildHeaders(existingHeaders?: HeadersInit) {
  const headers = new Headers(existingHeaders);
  // 优先使用 Clerk JWT，fallback 到旧 localStorage token（过渡期兼容）
  const clerkToken = getClerkToken();
  if (clerkToken) {
    headers.set('Authorization', `Bearer ${clerkToken}`);
  } else {
    // 旧 localStorage token（过渡期兼容，后续可移除）
    if (typeof window !== 'undefined') {
      const legacyToken = localStorage.getItem('accessToken');
      if (legacyToken) {
        headers.set('Authorization', `Bearer ${legacyToken}`);
      }
    }
  }
  return headers;
}

/**
 * Clerk JWT fetch wrapper.
 * Automatically attaches the Authorization header and shows a toast on 401/403
 * instead of redirecting, so users can decide when to sign in again.
 */
export async function clerkFetch(input: RequestInfo, init?: RequestInit) {
  const headers = buildHeaders(init?.headers);
  const requestInit: RequestInit = { ...init, headers };

  const response = await fetch(input, requestInit);

  if (
    (response.status === 401 || response.status === 403) &&
    typeof window !== 'undefined'
  ) {
    const now = Date.now();
    if (now - lastAuthErrorToastAt > AUTH_ERROR_TOAST_INTERVAL_MS) {
      lastAuthErrorToastAt = now;
      toast.error(
        `授权可能已失效（${response.status} ${response.statusText}），请重新登录。如果多次出现此提示，重新登录即可。`
      );
    }
  }

  return response;
}

// 保留旧的 authFetch 供现有代码使用（过渡期兼容）
export async function authFetch(input: RequestInfo, init?: RequestInit) {
  return clerkFetch(input, init);
}
