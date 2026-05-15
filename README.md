# Incremental.icu

<p align="center">
  <a href="https://github.com/inrenping/incremental.icu/stargazers"><img src="https://img.shields.io/github/stars/inrenping/incremental.icu?style=flat&label=Stars&labelColor=1F2937&color=2563EB" alt="Stargazers"></a>
  <a href="https://github.com/inrenping/incremental.icu/network/members"><img src="https://img.shields.io/github/forks/inrenping/incremental.icu?style=flat&label=Forks&labelColor=1F2937&color=7C3AED" alt="Forks"></a>
  <a href="https://github.com/inrenping/incremental.icu/issues"><img src="https://img.shields.io/github/issues/inrenping/incremental.icu?style=flat&label=Issues&labelColor=1F2937&color=D97706" alt="Issues"></a>
</p>

**[incremental.icu](https://incremental.icu)** 是一款专为运动爱好者打造的跨平台数据同步工具。它能够无缝连接佳明（Garmin）与高驰（Coros）平台，协助用户高效管理运动记录，特别适合同时拥有两个品牌设备的多表用户。

---

## 📸 界面预览

| 数据看板 | 活动列表 | 详情查看 |
| :---: | :---: | :---: |
| ![dash](/doc/dash_page.png) | ![activities](/doc/activities_page.png) | ![activity](/doc/activity_page.png) |

## ✨ 主要功能

- **实时查看**：跨平台聚合展示最新的运动记录。
- **手动推送**：支持将特定运动记录单条手动同步至其他平台。
- **批量同步**：提供一键同步功能，快速补全近期的运动数据缺失。

## 🌐 支持平台

| 平台 | 支持状态 | 交互格式 |
| :--- | :---: | :--- |
| 佳明 (Garmin) 国内版 | ✅ 已支持 | `.zip` |
| 佳明 (Garmin) 国际版 | ✅ 已支持 | `.zip` |
| 高驰 (Coros) | ✅ 已支持 | `.fit` |

## 🚀 快速开始

访问 **[incremental.icu](https://incremental.icu)** 即可直接注册并开始管理您的运动数据。

---

## 🛠 开发者指南

如果您希望参与开发或自行部署本项目，请参考以下技术细节。

### 技术栈

- **前端框架**: [Next.js (App Router)](https://nextjs.org/)
- **后端服务**: [FastAPI (Python)](https://fastapi.tiangolo.com/) 提供接口
- **UI 组件库**: [shadcn/ui](https://ui.shadcn.com/) & [Alpine.js](https://alpinejs.dev/)
- **数据库**: [Neon (Serverless Postgres)](https://neon.tech/)
- **邮件服务**: [Resend](https://resend.com/)
- **图标库**: [Tabler Icons](https://tabler-icons.io/)

### 部署与 CI/CD

1. **代码规范**: 前端部署之前记得先跑一下 `npm run lint`。
2. **前端部署**: 托管于 [Vercel](https://vercel.com/)。
    - *注意*: 后端接口地址需要配置在 `/vercel.json` 中。
3. **自动化工作流**:
    - **CI/CD**: 前端通过 Vercel 自动部署，后端通过 [GitHub Actions](https://github.com/features/actions)。
    - **定时任务**: 使用 GitHub Actions 处理定时同步任务。

### 监控与分析

- **网站状态监测**: [Better Stack](https://betterstack.com/)
- **网站流量分析**: [Google Analytics](https://analytics.google.com/)

### 参考资源与授权

- **登录逻辑参考**: [garmin-sync-coros](https://github.com/yihong0618/running_page) (前端佳明高驰登录逻辑参考)
- **身份验证**: 支持 Google 和 GitHub 原生的 OAuth 单点登录。

## 📈 项目管理

本项目使用 [GitHub Projects](https://github.com/features/issues) 进行进度管理与任务追踪。

---

Proudly powered by the open-source community.
