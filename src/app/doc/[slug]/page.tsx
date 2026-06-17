'use client';

import { useEffect, useState, use } from 'react';
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import MarkdownRenderer from "@/components/markdown-renderer";
interface DocPageProps {
  params: Promise<{ slug: string }>;
}
export default function docPage({ params }: DocPageProps) {
  const { layout } = useLayout();
  const { slug } = use(params);
  const [mdContent, setMdContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  useEffect(() => {
    fetch(`/docs/${slug}.md`)
      .then((res) => {
        if (!res.ok) throw new Error('文档加载失败');
        return res.text();
      })
      .then((data) => {
        setMdContent(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setMdContent('# 加载失败');
        setIsLoading(false);
      });
  }, []);
  return (
    <div className={cn(
      "flex flex-col gap-8 p-6 mx-auto bg-slate-50/50 dark:bg-background flex-1 text-sm transition-all duration-300",
      layout === "fixed" ? "w-full max-w-7xl" : "w-full max-w-none"
    )}>

      <section className="space-y-4">
        <div className="text-left space-y-5 px-8 py-7 bg-muted/20 dark:bg-muted/10 rounded-2xl border border-border/50 text-base text-foreground/90 leading-relaxed">
          <div className="space-y-4 text-foreground">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground animate-pulse">
                正在加载文档内容...
              </div>
            ) : (
              <MarkdownRenderer content={mdContent} />
            )}
          </div>
        </div>
      </section >
    </div>
  );
}