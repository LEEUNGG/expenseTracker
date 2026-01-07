# 记账应用

一个现代化的记账应用，支持消费记录、预算管理、数据可视化和AI入账功能。

## 功能特性

### 核心功能
- **月份切换**：支持在2026年1月至当前月份之间切换
- **消费记录管理**：完整的增删改查功能
- **批量操作**：支持批量删除消费记录
- **分页显示**：每页显示10条记录

### 数据可视化
- **预算与消费趋势图**：展示累积预算和累积消费的对比，支持横向滑动
- **类别分布饼图**：按消费类别展示消费分布
- **必需/非必需饼图**：展示必需和非必需消费的比例

### AI入账
- 支持多图片上传
- AI自动识别消费信息
- 支持手动编辑和确认后入库

### 类别管理
- 自定义消费类别
- 支持编辑类别名称和emoji
- 删除类别不影响已有数据

### 主题切换
- 支持浅色和深色主题
- 自动保存用户偏好

## 技术栈

- **前端框架**：React 18
- **构建工具**：Vite
- **样式**：Tailwind CSS
- **图表库**：Recharts
- **数据库**：Supabase
- **图标**：Lucide React
- **日期处理**：date-fns

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 到 `.env` 并填入你的Supabase配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:5173 启动

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 数据库设置

### 1. 创建Supabase项目

访问 [Supabase](https://supabase.com) 并创建一个新项目

### 2. 执行SQL脚本

在Supabase的SQL编辑器中执行 `supabase-schema.sql` 文件中的SQL语句

### 3. 获取API密钥

在Supabase项目的设置中找到：
- Project URL
- anon public key

将这些值填入 `.env` 文件

## 项目结构

```
expense-tracker/
├── src/
│   ├── components/
│   │   ├── charts/
│   │   │   ├── BudgetLineChart.jsx      # 预算与消费趋势图
│   │   │   ├── CategoryPieChart.jsx     # 类别分布饼图
│   │   │   └── EssentialPieChart.jsx    # 必需/非必需饼图
│   │   ├── MonthSelector.jsx             # 月份选择器
│   │   ├── ExpenseTable.jsx             # 消费记录表格
│   │   ├── AIExpenseModal.jsx           # AI入账弹窗
│   │   └── Sidebar.jsx                  # 侧边栏
│   ├── contexts/
│   │   └── ThemeContext.jsx             # 主题上下文
│   ├── lib/
│   │   ├── constants.js                 # 常量定义
│   │   ├── mockData.js                 # 模拟数据
│   │   ├── services.js                 # 数据服务
│   │   ├── supabase.js                # Supabase客户端
│   │   └── utils.js                   # 工具函数
│   ├── App.jsx                        # 主应用组件
│   ├── main.jsx                       # 应用入口
│   └── index.css                      # 全局样式
├── public/                            # 静态资源
├── supabase-schema.sql                # 数据库架构
├── .env                              # 环境变量
├── .env.example                      # 环境变量示例
├── tailwind.config.js                # Tailwind配置
├── vite.config.js                    # Vite配置
└── vercel.json                      # Vercel部署配置
```

## 部署到Vercel

### 1. 准备部署

确保项目已推送到GitHub仓库

### 2. 连接Vercel

1. 访问 [Vercel](https://vercel.com)
2. 点击 "New Project"
3. 选择你的GitHub仓库
4. 配置环境变量：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### 3. 部署

点击 "Deploy" 按钮开始部署

## 使用说明

### 月份切换
- 点击左右箭头切换月份
- 第一个月是2026年1月，不能往前切换
- 最后一个月是当前月份，不能往后切换

### 添加消费记录
1. 点击"添加"按钮
2. 填写消费信息（日期、金额、类别、备注）
3. 选择是否为必需消费
4. 点击"保存"

### 编辑消费记录
1. 点击记录右侧的编辑图标
2. 修改信息
3. 点击保存图标确认

### 删除消费记录
- 单条删除：点击记录右侧的删除图标
- 批量删除：勾选多条记录后点击"删除选中"按钮

### AI入账
1. 点击右上角的"AI入账"按钮
2. 上传消费截图（支持多选）
3. 点击"开始分析"
4. 查看识别结果并编辑
5. 勾选要入库的记录
6. 点击"确认入库"

### 类别管理
1. 点击左上角菜单图标打开侧边栏
2. 点击"设置"
3. 在"消费类别管理"中：
   - 编辑现有类别
   - 添加新类别
   - 删除类别（不影响已有数据）

### 主题切换
- 在侧边栏底部点击主题切换按钮
- 或使用系统默认主题

## 预算规则

- 工作日：每天150元
- 周末：每天100元
- 节假日：每天100元

预算调整会记录在数据库中，可以手动修改特定日期的预算。

## 开发说明

### 使用模拟数据

当前应用使用模拟数据进行演示。要使用真实数据：

1. 配置Supabase环境变量
2. 修改 `App.jsx` 中的数据获取逻辑
3. 使用 `lib/services.js` 中的服务函数

### 添加新功能

1. 在 `src/components/` 中创建新组件
2. 在 `src/lib/services.js` 中添加数据服务
3. 在 `App.jsx` 中集成新功能

## 许可证

MIT
