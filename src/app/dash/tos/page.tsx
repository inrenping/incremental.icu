'use client';

import { useLayout } from "@/hooks/use-layout";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
export default function tosPage() {
  const { layout } = useLayout();

  return (
    <div className={cn(
      "flex flex-col gap-8 p-6 mx-auto bg-slate-50/50 dark:bg-background flex-1 text-sm transition-all duration-300",
      layout === "fixed" ? "w-full max-w-7xl" : "w-full max-w-none"
    )}>

      <section className="space-y-4">
        <div className="text-left space-y-5 px-8 py-7 bg-muted/20 dark:bg-muted/10 rounded-2xl border border-border/50 text-base text-foreground/90 leading-relaxed">
          <div className="space-y-4 text-foreground">
            {/* 标题与日期 */}
            <div className="border-b border-border/60 pb-4 mb-6">
              <h1 className="text-2xl font-bold tracking-tight mb-2 text-foreground">incremental.icu 使用条款</h1>
              <p className="text-sm text-muted-foreground">更新日期：2026年6月13日</p>
              <p className="text-sm text-muted-foreground">生效日期：2026年6月13日</p>
            </div>

            {/* 导言 */}
            <div className="space-y-2">
              <p>
                欢迎使用 incremental.icu !</p>
              <p>
                本条款适用于您对 incremental.icu 网站的访问与使用。
                <span className="font-semibold text-foreground"> 使用本网站即代表您同意本条款；如不同意，请立即停止使用。</span>
              </p>
            </div>

            <hr className="border-border/40 my-4" />

            {/* 1. 条款变更 */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">1. 条款变更</h2>
              <p>我们保留随时修改本条款的权利。变更后继续使用本网站，即视为您接受新条款。请定期查看更新。</p>
            </div>

            {/* 2. 网站使用规范 */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">2. 网站使用规范</h2>
              <p>您不得利用本网站进行任何违法或侵权行为。严禁以下操作：</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground dark:text-foreground/80">
                <li><strong className="text-foreground">恶意技术手段：</strong>禁止使用爬虫、机器人、脚本等自动化工具或类似手动流程复制、监控本网站内容或结构。</li>
                <li><strong className="text-foreground">未经授权访问：</strong>禁止通过黑客攻击、破解密码等方式尝试访问未授权的系统或服务。</li>
                <li><strong className="text-foreground">网络攻击：</strong>禁止发起 DDoS、注入等任何形式破坏网络安全的攻击。</li>
              </ul>

              {/* 违规处理机制 - 引用样式占位 */}
              <div className="mt-3 p-4 bg-muted/50 dark:bg-muted/20 rounded-xl text-sm space-y-1">
                <p className="font-semibold text-foreground">违规处理：</p>
                <p>违规者将被<span className="font-semibold text-destructive dark:text-destructive-foreground">直接终止访问权限</span>。任何违规行为均构成不正当商业行为，我们有权申请法律禁令，并要求您承担全部合理的律师费及诉讼费用。</p>
              </div>
            </div>

            {/* 3. 第三方链接 */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">3. 第三方链接</h2>
              <p>本网站可能包含第三方网站链接。第三方内容及服务均由其独立提供，<span className="font-semibold text-foreground">其真实性、安全性由您自行评估并承担风险</span>，我们不承担任何连带责任。</p>
            </div>

            {/* 4. 隐私与安全 */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">4. 隐私与安全</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-foreground">隐私政策：</strong>个人信息的收集与使用详见我们的 <Link href="/dash/privacy">「隐私政策」</Link>。</li>
                <li><strong className="text-foreground">营销信息：</strong>我们或第三方广告商可能会依法向您发送促销或宣传信息。</li>
                <li><strong className="text-foreground">安全提示：</strong>网络传输并非绝对安全，信息存在被拦截的风险，我们无法保证数据传输的绝对机密性。</li>
              </ul>
            </div>

            {/* 5. 免责声明与责任限制 */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">5. 免责声明与责任限制</h2>
              <p><strong className="text-foreground">按“现状”提供：</strong>本网站服务基于“现状”（As Is）提供，我们不保证服务不中断、无差错。</p>
              <p><strong className="text-foreground">风险自担：</strong>您须对使用本网站的行为承担全部责任。如果您对本网站不满意，<span className="font-semibold text-foreground underline decoration-wavy decoration-destructive/50">唯一的补救措施是停止使用本网站。</span></p>
            </div>

            {/* 联系方式 */}
            <div className="pt-4 border-t border-border/60">
              <p className="text-sm text-foreground/80">
                如有任何问题，请通过
                <a href="mailto:inrenping@gmail.com" className="text-primary hover:underline font-medium ml-1">inrenping@gmail.com</a>
                与我们联系。
              </p>
            </div>

          </div>
        </div>
      </section >
    </div>
  );
}