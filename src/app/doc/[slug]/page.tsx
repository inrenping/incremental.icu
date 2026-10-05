'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import MarkdownRenderer from "@/components/markdown-renderer";
import { DocSidebar } from "@/components/dash/doc-sidebar";

interface DocPageProps {
  params: Promise<{ slug: string }>;
}
export default function DocPage({ params }: DocPageProps) {
  const t = useTranslations('DocPage');
  const { layout } = useLayout();
  const { slug } = use(params);
  const [doc, setDoc] = useState<{ slug: string; content: string; failed: boolean } | null>(null);
  const [toc, setToc] = useState<{ id: string; text: string }[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  // 状态按 slug 记录，切页时无需手动 reset（slug 变了就当作重新加载中）
  const isCurrent = doc?.slug === slug;
  const mdContent = isCurrent ? doc.content : '';
  const isLoading = !isCurrent;
  const loadFailed = isCurrent && doc.failed;

  useEffect(() => {
    let cancelled = false;
    fetch(`/docs/${slug}.md`)
      .then((res) => {
        if (!res.ok) throw new Error('doc fetch failed');
        return res.text();
      })
      .then((data) => {
        if (!cancelled) setDoc({ slug, content: data, failed: false });
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setDoc({ slug, content: '', failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // 当 Markdown 内容加载并渲染后，从 DOM 中提取所有 h2 并设置 ID
  useEffect(() => {
    if (!isLoading && contentRef.current) {
      const headers = contentRef.current.querySelectorAll('h2');
      const items = Array.from(headers).map((header, index) => {
        const text = header.textContent || '';
        // 生成符合 URL 规范的 ID
        const id = text.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]/g, '') || `section-${index}`;

        header.id = id; // 手动注入 ID 以供跳转
        return { id, text };
      });
      setToc(items);
    }
  }, [isLoading, mdContent]);

  // 平滑滚动跳转函数
  const scrollToAnchor = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // 考虑到顶部固定导航栏的偏移量
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      // 更新 URL hash
      window.history.pushState(null, '', `#${id}`);
    }
  };

  return (
    <div className={cn(
      "flex flex-row gap-12 p-6 mx-auto bg-slate-50/50 dark:bg-background flex-1 text-sm transition-all duration-300",
      layout === "fixed" ? "w-full max-w-7xl" : "w-full max-w-none"
    )}>
      {/* 左侧自定义导航菜单 */}
      <DocSidebar />

      {/* 中间正文内容 */}
      <div className="flex-1 min-w-0" ref={contentRef}>
        <section className="space-y-4">
          <div className="text-left space-y-5 px-8 py-7 bg-muted/20 dark:bg-muted/10 rounded-2xl border border-border/50 text-base text-foreground/90 leading-relaxed">
            <div className="space-y-4 text-foreground">
              {isLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground animate-pulse">
                  {t('loading')}
                </div>
              ) : loadFailed ? (
                <div className="flex items-center justify-center py-10 text-destructive">
                  {t('loadFailed')}
                </div>
              ) : (
                <MarkdownRenderer content={mdContent} />
              )}
            </div>
          </div>
        </section >
      </div>

      {/* 右侧目录栏 (仅在大屏幕显示) */}
      {!isLoading && toc.length > 0 && (
        <aside className="hidden xl:block w-64 shrink-0">
          <div className="sticky top-10 space-y-4">
            <div className="font-semibold text-foreground/70 uppercase tracking-wider text-[11px] px-4">
              {t('toc')}
            </div>
            <nav className="flex flex-col border-l border-border/60">
              {toc.map((item, index) => (
                <a
                  key={index}
                  href={`#${item.id}`}
                  onClick={(e) => scrollToAnchor(e, item.id)}
                  className="block pl-4 py-2 text-muted-foreground hover:text-primary hover:border-l hover:border-primary -ml-px transition-all duration-200"
                >
                  {item.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      )}
    </div>
  );
}