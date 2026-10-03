/**
 * 取当前请求要用的认证 token。
 *
 * 直接调用 Clerk 的 `getToken()`：它内部自带缓存与自动续期，返回的永远是
 * 「当下可用」的 token，所以我们不需要自己推断过期时间。
 *
 * 旧实现是「TokenProvider 每 50s 刷一次 → 写全局缓存 → 按固定 50s 判过期」，
 * 缓存寿命与刷新间隔相等，边界上 `getClerkToken()` 必然返回 null，
 * 请求就不带 Authorization 头；浏览器还会把后台标签页的 setInterval 节流到
 * 1 次/分钟，空窗期更长 —— 这就是生产上反复弹「授权可能已失效（401）」的原因。
 */
import { getToken } from "@clerk/nextjs";

/** 迁移到 Clerk 之前的旧 HS256 token，仅作为兼容回退保留。 */
const LEGACY_STORAGE_KEY = "accessToken";

export async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    const token = await getToken();
    if (token) return token;
  } catch {
    // 取不到（未登录 / Clerk 未就绪 / 离线）就落到下面的兼容回退
  }

  try {
    return window.localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return null;
  }
}
