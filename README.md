# Personal Finance Dashboard

一个现代化的个人财务管理仪表盘，集成了日常记账、债务追踪和未来的健康饮食管理功能。基于 React 生态系统构建，采用最新的前端技术栈。

## 🌟 核心功能

### 1. 💰 支出管理 (Expense Tracker)
- **智能看板**：基于日历月份的消费概览，直观展示每日预算与实际支出的对比趋势。
- **AI 智能入账**：支持上传消费小票或截图，利用 Gemini AI 自动识别金额、日期和类别，实现一键入账。
- **数据可视化**：
  - **预算趋势图**：累积预算 vs 累积消费，支持点击图表手动调整单日预算。
  - **分类分布图**：清晰展示各消费类别的占比。
  - **必要性分析**：分析“必需”与“非必需”支出的比例，辅助理性消费。
- **全功能管理**：支持消费记录的增删改查、批量删除、按月筛选。
- **自定义分类**：支持管理消费类别（名称、颜色、Emoji）。

### 2. 💳 债务追踪 (Debt Tracker)
- **还款时间轴**：直观的时间轴视图，展示每月的还款计划和金额。
- **债务结构分析**：堆叠柱状图展示本金与利息的构成。
- **趋势监控**：追踪每月总债务余额变化及净现金流情况。
- **数据驱动**：清晰掌握房贷、车贷等长期债务的偿还进度。

### 3. 🥗 饮食管理 (Diet Management)
- *Coming Soon*：预留模块，未来将支持卡路里追踪、宏量营养素分析及膳食计划。

### 4. 🛠️ 系统特性
- **现代化架构**：基于 `react-router-dom` 的路由管理，支持按需加载和模块化开发。
- **暗黑模式**：完美支持 Light/Dark 主题切换，自动适应系统偏好。
- **响应式设计**：适配桌面端和移动端布局，侧边栏可折叠。

## 🏗️ 技术栈

- **前端框架**: React 19
- **路由管理**: React Router v7
- **构建工具**: Vite
- **样式方案**: Tailwind CSS v4
- **图表库**: Recharts
- **图标库**: Lucide React
- **后端/数据库**: Supabase
- **AI 服务**: Google Gemini AI
- **工具库**: date-fns, clsx, tailwind-merge

## 📂 项目结构

```text
src/
├── components/        # 可复用的 UI 组件 (Charts, Modals, Sidebar 等)
├── contexts/          # 全局状态上下文 (Theme)
├── lib/               # 工具函数、API 服务封装 (Supabase, Gemini)
├── pages/             # 页面级组件 (ExpenseDashboardPage)
├── App.jsx            # 路由配置与主布局
└── main.jsx           # 应用入口
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填入必要的 API Keys：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173 即可看到应用。

### 4. 构建生产版本

```bash
npm run build
```

## 📝 数据库设置

本项目依赖 Supabase。请在 Supabase SQL Editor 中运行 `supabase-schema.sql` 和 `import_debt.sql` 来初始化数据库表结构。

## 📜 版本历史

- **v0.1.0**: 架构重构。引入 React Router，拆分页面逻辑，新增债务追踪模块，预留饮食管理入口。
- **v0.0.x**: 初始原型。单页应用，基础记账功能。
