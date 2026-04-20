import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { cookies } from 'next/headers';

// 定义合法的 Locale 类型（例如 "en" | "zh"）
type Locale = (typeof routing.locales)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  const cookieStore = await cookies();

  let locale = cookieStore.get('NEXT_INTL_LOCALE')?.value;

  if (!locale) {
    const requested = await requestLocale;
    locale = requested;
  }

  // 验证 locale 是否合法，避免使用 any
  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});