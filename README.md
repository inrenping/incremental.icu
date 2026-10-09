# Incremental.icu

<p align="left">
  <a href="https://github.com/inrenping/incremental.icu/stargazers"><img src="https://img.shields.io/github/stars/inrenping/incremental.icu?style=flat&label=Stars&labelColor=1F2937&color=2563EB" alt="Stargazers"></a>
  <a href="https://github.com/inrenping/incremental.icu/network/members"><img src="https://img.shields.io/github/forks/inrenping/incremental.icu?style=flat&label=Forks&labelColor=1F2937&color=7C3AED" alt="Forks"></a>
  <a href="https://github.com/inrenping/incremental.icu/issues"><img src="https://img.shields.io/github/issues/inrenping/incremental.icu?style=flat&label=Issues&labelColor=1F2937&color=D97706" alt="Issues"></a>
</p>

**[incremental.icu](https://incremental.icu)** 是一款专为运动爱好者打造的跨平台数据同步工具。它能够连接佳明（Garmin）、高驰（Coros）与颂拓（Suunto）平台，通过各平台开放的接口同步数据，协助用户高效管理运动记录，特别适合同时使用多设备记录运动状态的用户。

创建这个工具的初衷，是为了解决佳明海内外版本数据不同步导致 Strava 和微信运动等数据国内平台只能二选一的问题。后来使用了高驰训练平台感觉不错，于是增加了高驰的平台支持；再后来手上换了颂拓手表，希望佳明的活动也能回流到颂拓，于是打通了颂拓的数据上传通道。

---

## ✨ 主要功能

### 数据同步

- **一键同步**：设定源平台与目标平台，手动拉取两端最新 10 条数据，进行差量同步后直接给出结果汇总。源与目标可跨品牌组合（佳明 → 高驰、佳明 → 颂拓、高驰 → 颂拓等）。
- **手动同步**：在数据列表中找到对应的数据记录，手动推送到指定平台，也可以下载原始 FIT 文件。
- **定时同步**：设定定时任务自动执行同步。每用户最多 10 个任务，每个任务一条「源 → 目标」同步配置，每天最多执行 3 次。

### 数据查看

- **跑量统计**：年度 / 月度跑量（次数、距离、时长、目标完成度）与近 30 天跑量柱状图，以「主数据源」账号为准。
- **运动日历**：按周查看运动分布。
- **睡眠数据**：佳明平台的月度睡眠报告（日历 + 时钟环形图）与每日分期详情。
- **心率数据**：佳明平台的每日心率（最高 / 最低 / 静息 / 近 7 日静息均值）与心率曲线对比。
- **体能指标**：佳明平台的训练状态·负荷、体能年龄、个人纪录与比赛成绩预测。

### AI 接入

- **MCP 接口**：通过 GPT Code 页面的授权码，把运动与心率数据接入支持 MCP 的客户端。
- **GPT 授权**：在 GPT Actions 授权页（`/dash/gpt`）生成授权码，把数据接入 ChatGPT。

## 🌐 支持平台

| 平台 | 支持状态 | 交互格式 |
| :--- | :---: | :--- |
| 佳明 (Garmin) 国内版 | ✅ 已支持 | `.FIT` |
| 佳明 (Garmin) 国际版 | ✅ 已支持 | `.FIT` |
| 高驰 (Coros) | ✅ 已支持 | `.FIT` |
| 颂拓 (Suunto) 国际版 | ✅ 已支持 | `.FIT` |
| 颂拓 (Suunto) 国内版 | ✅ 已支持 | `.FIT` |

平台之间可以任意指定「源 → 目标」：佳明国内版与国际版可以互相同步，高驰与颂拓也可以作为目标平台接收佳明活动。

心率与睡眠数据目前仅支持佳明平台。

### 颂拓数据同步说明

- **上传通道**：走颂拓官方 FIT 导入接口（`/apiserver/management/user/import/fit`），与佳明、高驰一致使用 `.FIT` 作为交换格式。
- **区域区分**：颂拓分为国际版（`intl`）与国内版（`cn`）两套集群，接口域名不同，账号密码互通但需按实际账号选择区域。
- **状态**：接口通道已打通，账号可在「账户管理」中接入。若同步失败，请到服务端日志确认返回码（`403` 表示鉴权失败，`404` 表示接口路径不对），并按返回码定位问题。

## 🚀 线上版本

访问 **[incremental.icu](https://incremental.icu)** 即可直接注册并开始管理您的运动数据。

- 服务状态：[status.incremental.icu](https://status.incremental.icu)
- 使用文档：[incremental.icu/doc/guide](https://incremental.icu/doc/guide)（源码位于 `public/docs/`）

---

## 🛠 开发者指南

如果您希望参与开发或自行部署本项目，请参考以下技术细节。

### 仓库构成

本项目由三个仓库组成：

| 仓库 | 职责 | 默认分支 |
| :--- | :--- | :--- |
| [`incremental.icu`](https://github.com/inrenping/incremental.icu)（本仓库） | Next.js 前端，部署于 Vercel | `main` |
| [`incremental-serve`](https://github.com/inrenping/incremental-serve) | FastAPI 后端，由 GitHub Actions SSH 部署 | `master` |
| [`incremental-mcp`](https://github.com/inrenping/incremental-mcp) | MCP 服务端点，与主站共享同一数据库 | — |

### 技术栈

**前端（本仓库）**

- **框架**: [Next.js 16 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/) + TypeScript
- **UI**: [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)（基于 [Radix](https://www.radix-ui.com/)）+ [Recharts](https://recharts.org/) 图表 + [Tabler Icons](https://tabler-icons.io/)
- **认证**: [Clerk](https://clerk.com/)（`@clerk/nextjs`）— 邮箱验证码 / Google / GitHub OAuth
- **国际化**: [next-intl](https://next-intl.dev/)（中文默认，英文可选，`localePrefix: 'as-needed'`）
- **日期处理**: [dayjs](https://dayjs.org/)
- **佳明登录**: [garmin-connect](https://www.npmjs.com/package/garmin-connect)（仅用于 `src/app/api/garmin` 服务端路由换取 token）
- **分析**: [Vercel Analytics](https://vercel.com/docs/analytics) + [Google Analytics](https://analytics.google.com/)（`@next/third-parties`）

**后端（[incremental-serve](https://github.com/inrenping/incremental-serve)）**

- **框架**: [FastAPI](https://fastapi.tiangolo.com/) + SQLAlchemy + APScheduler
- **数据库**: [Neon (Serverless Postgres)](https://neon.tech/)
- **对象存储**: Supabase Storage（活动文件）、阿里云 OSS / AWS S3（高驰 FIT 上传）
- **邮件服务**: [Resend](https://resend.com/)
- **佳明客户端**: [garth](https://github.com/matin/garth) —— 模拟佳明客户端的 Python 包，`requirements.txt` 中锁定版本
- **多平台服务**: `app/services/` 下按平台拆分客户端（`garmin_service` / `coros_service` / `suunto_service`），各平台统一以 `.FIT` 作为交换格式

### 目录结构

```
src/
  app/
    page.tsx          # 首页
    dash/             # 仪表盘控制台（跑量统计、运动列表、同步记录、任务、账户等）
      fitness/        # 佳明体能指标（训练状态·负荷、体能年龄、个人纪录、成绩预测）
    heart/            # 独立心率页（复用 HeartRatePanel）
    doc/[slug]/       # 文档页，浏览器端 fetch /docs/<slug>.md
    sign-in/ sign-up/ # Clerk 登录注册（catch-all 路由）
    api/garmin/       # 服务端佳明登录取 token（garmin-connect）
    api/coros/        # 服务端高驰相关路由
  components/
    ui/               # shadcn/ui 基础组件，非必要不改动
    dash/             # 仪表盘业务组件
    login/            # 登录页组件
    hooks/            # 组件级 hooks
  hooks/              # 全局 hooks
  i18n/               # next-intl 路由与请求配置
  lib/
    api.ts            # clerkFetch / authFetch（统一附带 Clerk JWT）
    token-manager.ts  # getAuthToken()
    doc-menu.json     # 文档侧边栏菜单
  messages/           # en.json / zh.json 文案
  middleware.ts       # clerkMiddleware + 公开路由白名单
public/docs/          # 站点文档 Markdown（新增文档需同步 src/lib/doc-menu.json）
scripts/check-i18n.py # i18n 文案完整性检查
```

详细的开发约定见 `public/docs/development.md` 与 `AGENTS.md`。

### 本地开发

```bash
npm install
cp .env.example .env.development   # 填写 NEXT_PUBLIC_BACKEND_URL、Clerk Key、OAuth 变量
npm run dev
```

常用命令：

```bash
npm run dev          # 本地开发
npm run lint         # eslint，提交前必跑
npm run typecheck    # tsc --noEmit
npm run i18n:check   # 检查 zh.json / en.json 文案是否对齐
npm run build        # 构建
```

> `next.config.ts` 开启了 `typescript.ignoreBuildErrors`：`.next/types/validator.ts` 会引用已删除的 `/login` 路由残留类型，属于历史包袱。因此 **lint 与 review 才是类型问题的真实关卡**，改动路由时留意。

### 部署与 CI/CD

1. **代码规范**: 前端部署之前记得先跑一下 `npm run lint`。
2. **前端部署**: 托管于 [Vercel](https://vercel.com/)。
    - 分支约定：提交到 `dev` → 合并到 `main`，Vercel 自动部署。
    - *注意*: 生产环境的 `/api` 转发配置在 `/vercel.json` 中；开发环境则由 `next.config.ts` 把 `/api/v1/*` 重写到 `NEXT_PUBLIC_BACKEND_URL`。
3. **后端部署**: 提交到 `dev` → 合并到 `master`，推送即触发 GitHub Actions 通过 SSH 部署，systemd 托管（`incremental-serve.service`）。
4. **自动化工作流**:
    - **CI/CD**: 前端通过 Vercel 自动部署，后端通过 [GitHub Actions](https://github.com/features/actions) 部署。
    - **定时任务**: GitHub Actions 负责定时同步（心率、睡眠、佳明体能指标、主运动同步、FIT 归档），通过 `X-Sync-Token` 共享密钥鉴权。

若数据库有变更，**先执行迁移 SQL，再发布后端**，最后发布前端。后端不引入 Alembic，DDL 采用手工 SQL 迁移（全量 `__init__.sql`，增量 `migrations/YYYYMMDD_*.sql`，需保证幂等可重复执行）。

### 监控与分析

- **网站状态监测**: [Better Stack](https://betterstack.com/)
- **网站流量分析**: [Google Analytics](https://analytics.google.com/)

### 参考资源与授权

- **登录逻辑参考**: [running_page](https://github.com/yihong0618/running_page)（早期参考过其佳明 / 高驰前端登录逻辑；因前端登录态有效期不稳，现已不再采用前端直连登录）
- **佳明高驰数据同步参考**: [garmin-sync-coros](https://github.com/XiaoSiHwang/garmin-sync-coros)

## 🤖 MCP 接口对接

本项目提供基于 [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) 的标准接口，允许 AI 助手（如 ChatGPT Desktop、Claude Desktop 等）直接查询用户的运动数据，实现"让 AI 帮你查跑步记录和心率数据"的能力。

- **服务地址**: `https://incremental.icu/mcp`（`streamable-http` 传输协议）
- **鉴权方式**: 支持两种
  1. **JWT Bearer**: 请求头携带 `Authorization: Bearer <JWT>`
  2. **OAuth 2.1**: Authorization Code + PKCE，支持客户端自动发现授权服务器（`/.well-known/oauth-protected-resource`），主站「GPT Code」页面会给出一次性授权码

### 可用 Tools

| Tool | 描述 |
| --- | --- |
| `get_latest_run` | 获取当前用户最近一次跑步记录（距离、时长、心率、配速、爬升等） |
| `get_run_history` | 分页查询历史跑步记录，支持日期范围过滤 |
| `get_heart_rate_history` | 获取最近 N 天或指定日期范围的每日心率汇总 |
| `get_daily_heart_rate` | 获取指定日期的当天心率汇总与采样明细 |
| `query_user_profile` | 获取当前登录用户的基本信息（用户名、邮箱、会员状态、时区等） |
| `say_hello` | 示例工具，用于验证连接是否正常 |

### 客户端接入示例

ChatGPT Desktop / Claude Desktop 等支持 MCP 的客户端，可通过 `streamable-http` 桥接配置：

```json
{
  "mcpServers": {
    "incremental": {
      "command": "npx",
      "args": [
        "-y", "@tollbit/mcp-streamable-http-shim",
        "--url", "https://incremental.icu/mcp",
        "-H", "Authorization: Bearer <YOUR_JWT>"
      ]
    }
  }
}
```

> 支持 OAuth 的客户端可省略 `-H` 参数，首次调用时会自动发起 OAuth 授权流程，配合主站 GPT Code 页面的授权码完成登录。

MCP 服务由独立仓库 [incremental-mcp](https://github.com/inrenping/incremental-mcp) 实现，部署于 Linux 服务器，与主站共享同一 PostgreSQL 数据库。

## 📈 项目管理

本项目使用 [GitHub Projects](https://github.com/users/inrenping/projects/1) 进行进度管理与任务追踪。
