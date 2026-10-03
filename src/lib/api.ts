import { toast } from 'sonner';

import { getAuthToken } from '@/lib/token-manager';

let lastAuthErrorToastAt = 0;
const AUTH_ERROR_TOAST_INTERVAL_MS = 5000;

/**
 * 每次发起请求时实时取 token（Clerk 内部有缓存，开销可忽略），
 * 不再读任何自维护的全局缓存 —— 那种缓存会在过期边界上返回 null，
 * 导致请求不带 Authorization 头而被后端判 401。
 */
async function buildHeaders(existingHeaders?: HeadersInit) {
  const headers = new Headers(existingHeaders);
  const token = await getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

/**
 * Clerk JWT fetch wrapper.
 * Automatically attaches the Authorization header and shows a toast on 401/403
 * instead of redirecting, so users can decide when to sign in again.
 */
export async function clerkFetch(input: RequestInfo, init?: RequestInit) {
  const headers = await buildHeaders(init?.headers);
  const requestInit: RequestInit = { ...init, headers };

  const response = await fetch(input, requestInit);

  if (
    (response.status === 401 || response.status === 403) &&
    typeof window !== 'undefined'
  ) {
    const now = Date.now();
    if (now - lastAuthErrorToastAt > AUTH_ERROR_TOAST_INTERVAL_MS) {
      lastAuthErrorToastAt = now;
      // 带上后端返回的原因：
      // "Not authenticated" = 请求根本没带 Authorization 头；
      // "无效的认证凭据"     = 带了头但 token 校验失败（过期/签名/用户未绑定）。
      const detail = await response
        .clone()
        .json()
        .then((body: unknown) =>
          body && typeof body === 'object' && 'detail' in body
            ? String((body as { detail: unknown }).detail)
            : undefined
        )
        .catch(() => undefined);
      toast.error(
        `授权可能已失效（${response.status}${detail ? ` · ${detail}` : ''}），请重新登录。如果多次出现此提示，重新登录即可。`
      );
    }
  }

  return response;
}

// 保留旧的 authFetch 供现有代码使用（过渡期兼容）
export async function authFetch(input: RequestInfo, init?: RequestInit) {
  return clerkFetch(input, init);
}
