import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { cookies } from 'next/headers';

export default getRequestConfig(async ({ requestLocale }) => {
  const cookieStore = await cookies();

  // 首先从 cookie 读取用户选择的语言
  let locale = cookieStore.get('NEXT_INTL_LOCALE')?.value;

  // 如果 cookie 中没有，使用请求的 locale
  if (!locale) {
    locale = await requestLocale;
  }

  // 最后验证 locale 是否合法
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});