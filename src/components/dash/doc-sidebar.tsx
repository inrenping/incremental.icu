'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import docMenu from '@/lib/doc-menu.json';

/**
 * 文档 / 账号 / GPT 三个页面共用的左侧导航。
 * 文案走 DocPage 命名空间，doc-menu.json 只保存翻译键与链接。
 */
export function DocSidebar() {
  const t = useTranslations('DocPage');

  return (
    <aside className="hidden lg:block w-40 shrink-0">
      <div className="sticky top-10">
        <nav className="flex flex-col gap-4 text-muted-foreground/80">
          {docMenu.map((section, sectionIndex) => (
            <React.Fragment key={sectionIndex}>
              {section.divider && sectionIndex > 0 && (
                <div className="border-t border-border/60" />
              )}
              <div className="flex flex-col gap-3">
                {section.items.map((item, itemIndex) => (
                  <Link
                    key={itemIndex}
                    href={item.href}
                    className="hover:text-primary transition-colors"
                  >
                    {t(item.key)}
                  </Link>
                ))}
              </div>
            </React.Fragment>
          ))}
        </nav>
      </div>
    </aside>
  );
}
