/**
 * 授权失效提示的文案桥接。
 *
 * `lib/api.ts` 里的 `clerkFetch` 是普通客户端函数，拿不到 next-intl 的
 * `useTranslations`（hook）或 `getTranslations`（仅服务端可用）。
 * 这里用一个模块级可注入的格式化函数解决：
 * `<I18nBridge />`（挂在 NextIntlClientProvider 内）启动时把当前语言的
 * 格式化函数注册进来，之后任何模块都能拿到正确语言的文案。
 */

export type AuthErrorMessage = (status: number, detail?: string) => string;

let formatter: AuthErrorMessage | null = null;

/** 由 <I18nBridge /> 调用，注入当前语言的文案格式化函数。 */
export function setAuthErrorMessage(fn: AuthErrorMessage): void {
  formatter = fn;
}

/** 桥接尚未挂载（例如在并行渲染的最早期）时退化为最朴素的提示。 */
export function getAuthErrorMessage(status: number, detail?: string): string {
  if (formatter) return formatter(status, detail);
  return detail ? `(${status} · ${detail})` : `(${status})`;
}
