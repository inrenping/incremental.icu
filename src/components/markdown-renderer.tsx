'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn(
      /* 核心：prose 负责亮色模式，dark:prose-invert 负责暗色模式自动反色 */
      /* prose-slate 是一种色调（可选: prose-zinc, prose-stone 等），prose-sm/base/lg 可以控制基础字号 */
      "prose prose-slate dark:prose-invert max-w-none text-base leading-relaxed",
      /* 选填：微调排版中超链接和图片的全局样式 */
      "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
      "prose-img:rounded-2xl prose-img:border prose-img:border-border/60 prose-img:mx-auto",
      className
    )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}