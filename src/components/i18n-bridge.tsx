'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { setAuthErrorMessage } from '@/lib/auth-error-message';

/**
 * 把「授权失效」提示的文案注册到模块级，供 `lib/api.ts` 的客户端 fetch 使用。
 * 必须挂在 `NextIntlClientProvider` 内部。
 */
export function I18nBridge() {
  const t = useTranslations('Common');

  useEffect(() => {
    setAuthErrorMessage((status, detail) =>
      t('authExpired', { status, detail: detail ?? '' })
    );
  }, [t]);

  return null;
}
