'use client';

import { useLayout } from "@/hooks/use-layout";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export default function privacyPage() {
  const { layout } = useLayout();

  return (
    <div className={cn(
      "flex flex-col gap-8 p-6 mx-auto bg-slate-50/50 dark:bg-background flex-1 text-sm transition-all duration-300",
      layout === "fixed" ? "w-full max-w-7xl" : "w-full max-w-none"
    )}>
      <section className="space-y-4">
        <div className="text-left space-y-6 px-8 py-7 bg-muted/20 dark:bg-muted/10 rounded-2xl border border-border/50 text-base text-foreground/90 leading-relaxed">

          {/* 头部标题 */}
          <div className="border-b border-border/60 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-foreground">incremental.icu 隐私政策</h1>
            <p className="text-sm text-muted-foreground mt-2">更新日期：2026年6月13日</p>
            <p className="text-sm text-muted-foreground mt-2">生效日期：2026年6月13日</p>
          </div>

          {/* 导言 */}
          <p>
            本政策向您说明我们如何处理您的个人信息。
            <span className="font-semibold text-foreground"> 使用或继续使用我们的服务，即代表您同意我们按本政策收集和使用您的相关信息。</span>
          </p>

          {/* 1. 我们收集的信息 */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">1. 我们收集的信息</h2>
            <p>如果您不提供以下信息，可能无法正常注册或使用我们的部分服务：</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground dark:text-foreground/80">
              <li><strong className="text-foreground">账户信息：</strong>您在注册时提供的个人信息，例如电子邮件地址。</li>
              <li><strong className="text-foreground">第三方账号信息：</strong>您在绑定或使用第三方服务时，向我们提供的第三方账号信息（包括电子邮件及密码）。</li>
            </ul>
          </div>

          {/* 2. 信息的存储与安全 */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">2. 信息的存储与安全</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground dark:text-foreground/80">
              <li><strong className="text-foreground">存储方式：</strong>我们通过本地缓存、数据库和服务器日志等安全方式存储您的数据，存储期限仅为实现服务目的所必需的最短时间。</li>
              <li><strong className="text-foreground">安全保护：</strong>我们使用 SSL 加密等技术防止信息丢失或遭未经授权的访问。但请理解，互联网环境无法保证 100% 的绝对安全。</li>
              <li><strong className="text-foreground">停运处理：</strong>若产品停止运营，我们将通过公告或通知告知您，并依法删除您的个人信息或进行匿名化处理。</li>
            </ul>
          </div>

          {/* 3. 我们如何使用信息 */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">3. 我们如何使用信息</h2>
            <p>我们收集的信息主要用于以下用途：</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground dark:text-foreground/80">
              <li>向您提供身份验证、客户服务和安全防范；</li>
              <li>优化、设计新服务，或进行软件认证与升级管理；</li>
              <li>了解您的使用习惯，以提供语言、位置等个性化服务；</li>
              <li>投放与您相关的广告、评估广告效果，或邀请您参与产品调查。</li>
            </ul>
          </div>

          {/* 4. 信息共享与披露 */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">4. 信息共享与披露</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground dark:text-foreground/80">
              <li><strong className="text-foreground">原则：</strong>我们不会主动向第三方共享或转让您的个人信息，除非征得您的明示同意。</li>
              <li><strong className="text-foreground">广告合作伙伴：</strong>为了优化广告效果，我们可能会与广告主共享部分<span className="italic">去标识化（无法识别个人身份）</span>的数据。未经授权，绝不共享您的姓名或邮箱。</li>
              <li><strong className="text-foreground">业务变更：</strong>发生合并、收购或资产转让时，我们将要求新的控制者继续履行本政策。</li>
              <li><strong className="text-foreground">免授权例外：</strong>涉及国家安全、公共利益、犯罪侦查或维护生命财产等法定情形下，我们可能依法共享或披露信息而无需征得您的同意。</li>
            </ul>
          </div>

          {/* 5. 您的权利 */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">5. 您的权利</h2>
            <p>在您使用服务期间，您可以根据产品指引查询、更正、删除或撤回您的个人信息。</p>
            <p><strong className="text-foreground">账户注销：</strong>您可以随时申请注销账户。注销后，除法律另有规定外，我们将清空或匿名化处理您的全部个人信息。</p>
          </div>

          {/* 6. 条款变更与未成年人保护 */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">6. 条款变更与未成年人保护</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground dark:text-foreground/80">
              <li><strong className="text-foreground">政策修订：</strong>本政策可能适时修订。新版本发布时我们会进行提示，继续使用服务即代表您接受更新后的政策。</li>
              <li><strong className="text-foreground">未成年人保护：</strong>我们重视未成年人隐私。未满 18 周岁的未成年人应在父母或监护人的指导和同意下提交个人信息。</li>
            </ul>
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
      </section >
    </div>
  );
}