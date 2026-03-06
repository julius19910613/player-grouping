# 数据管理系统 - 开发任务清单

> 版本: 1.0  
> 日期: 2026-03-06  
> 预计总工时: 3.5 小时

---

## Phase 1: 基础设施 (30 分钟)

### 1.1 安装 UI 组件依赖

```bash
# shadcn/ui 组件
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add alert-dialog
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add form
npx shadcn-ui@latest add table
npx shadcn-ui@latest add select
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
```

- [ ] 安装 tabs 组件
- [ ] 安装 progress 组件
- [ ] 安装 alert-dialog 组件
- [ ] 安装 toast 组件（或使用 sonner）
- [ ] 安装 form 组件
- [ ] 安装 table 组件
- [ ] 安装 select 组件
- [ ] 安装 input 组件
- [ ] 安装 card 组件

### 1.2 安装第三方库

```bash
pnpm add react-dropzone papaparse xlsx react-hook-form @hookform/resolvers zod sonner
```

- [ ] react-dropzone (文件拖拽上传)
- [ ] papaparse (CSV 解析)
- [ ] xlsx (Excel 解析)
- [ ] react-hook-form (表单管理)
- [ ] @hookform/resolvers (表单验证器)
- [ ] zod (数据验证)
- [ ] sonner (Toast 通知)

### 1.3 创建基础组件

- [ ] `components/ui/stepper.tsx` - 步骤指示器组件
- [ ] `components/ui/file-upload.tsx` - 文件上传区域组件
- [ ] `components/ui/skeleton.tsx` - 加载骨架屏
- [ ] `components/ui/empty-state.tsx` - 空状态组件
- [ ] `lib/toast.ts` - Toast 工具函数

---

## Phase 2: Shell Bar 集成 (20 分钟)

### 2.1 修改 Shell Bar 组件

文件: `components/shell-bar.tsx` (或对应文件)

- [ ] 添加"数据管理"菜单项到导航栏
- [ ] 创建 DataManagementMenu 下拉菜单组件
- [ ] 添加菜单图标 (使用 lucide-react)
- [ ] 实现菜单项点击处理

### 2.2 创建路由

- [ ] `/import/players` - 导入球员页面
- [ ] `/import/games` - 导入比赛页面
- [ ] `/import/history` - 导入历史页面
- [ ] 配置路由守卫（如需要）

### 2.3 创建页面骨架

- [ ] `app/import/players/page.tsx`
- [ ] `app/import/games/page.tsx`
- [ ] `app/import/history/page.tsx`

---

## Phase 3: Player Card 增强 (20 分钟)

### 3.1 添加操作菜单

文件: `components/player-card.tsx`

- [ ] 添加 DropdownMenu 组件
- [ ] 实现"快速编辑"菜单项
- [ ] 实现"查看详情"菜单项
- [ ] 实现"删除"菜单项 (danger 样式)
- [ ] 添加 hover 时显示菜单按钮

### 3.2 创建快速编辑 Dialog

- [ ] 创建 `components/dialogs/quick-edit-dialog.tsx`
- [ ] 实现表单字段 (姓名、手机号、等级、位置、备注)
- [ ] 添加 react-hook-form + zod 验证
- [ ] 实现保存逻辑
- [ ] 添加 Toast 反馈

### 3.3 创建删除确认 Dialog

- [ ] 创建 `components/dialogs/delete-confirm-dialog.tsx`
- [ ] 实现确认文案
- [ ] 显示将被删除的数据统计
- [ ] 添加取消和确认按钮
- [ ] 实现删除逻辑

---

## Phase 4: 导入向导 (60 分钟)

### 4.1 创建向导框架

- [ ] 创建 `components/import/import-wizard.tsx`
- [ ] 实现 Stepper 组件集成
- [ ] 实现步骤状态管理 (currentStep)
- [ ] 实现上一步/下一步逻辑
- [ ] 实现取消和完成处理

### 4.2 Step 1: 文件上传 (15 分钟)

- [ ] 创建 `components/import/steps/file-upload-step.tsx`
- [ ] 集成 react-dropzone
- [ ] 实现拖拽上传区域
- [ ] 实现文件类型验证 (CSV, XLS, XLSX)
- [ ] 实现文件大小验证 (10MB)
- [ ] 实现模板下载功能
- [ ] 显示选中文件信息

### 4.3 Step 2: 数据预览 (10 分钟)

- [ ] 创建 `components/import/steps/data-preview-step.tsx`
- [ ] 实现 CSV/Excel 解析 (papaparse/xlsx)
- [ ] 显示数据表格 (前 10 行)
- [ ] 显示文件信息 (行数、列数)
- [ ] 实现表格水平滚动

### 4.4 Step 3: 字段映射 (15 分钟)

- [ ] 创建 `components/import/steps/field-mapping-step.tsx`
- [ ] 实现自动字段映射逻辑
- [ ] 显示必填字段和可选字段分区
- [ ] 实现下拉选择映射
- [ ] 显示映射状态图标
- [ ] 验证必填字段是否都已映射

### 4.5 Step 4: 数据验证 (15 分钟)

- [ ] 创建 `components/import/steps/validation-step.tsx`
- [ ] 实现数据验证逻辑
  - [ ] 必填字段验证
  - [ ] 手机号格式验证
  - [ ] 重复数据检查
  - [ ] 等级范围检查
- [ ] 显示验证统计 (有效/警告/错误)
- [ ] 显示错误数据表格
- [ ] 实现行内修复功能
- [ ] 实现跳过错误行功能

### 4.6 Step 5: 导入确认 (10 分钟)

- [ ] 创建 `components/import/steps/confirmation-step.tsx`
- [ ] 显示导入统计
- [ ] 显示重复数据警告
- [ ] 实现导入进度条
- [ ] 实现取消导入功能
- [ ] 显示导入完成状态
- [ ] 实现"查看报告"和"前往分组"按钮

---

## Phase 5: 详情页 (40 分钟)

### 5.1 创建 Detail Dialog 框架

- [ ] 创建 `components/dialogs/detail-dialog.tsx`
- [ ] 集成 Tabs 组件
- [ ] 实现响应式布局

### 5.2 基本信息Tab

- [ ] 创建 InfoGrid 组件
- [ ] 显示所有基本信息
- [ ] 显示创建/更新时间
- [ ] 添加"编辑"按钮
- [ ] 实现编辑模式切换

### 5.3 比赛记录Tab

- [ ] 显示比赛记录表格
- [ ] 实现表格分页
- [ ] 添加"添加记录"按钮
- [ ] 实现导出功能

### 5.4 历史数据Tab (可选)

- [ ] 显示统计图表
- [ ] 显示数据摘要

---

## Phase 6: Toast & 反馈 (15 分钟)

### 6.1 配置 Sonner

- [ ] 在 layout 中添加 `<Toaster />` 组件
- [ ] 配置 Toast 位置 (右下角)
- [ ] 配置 Toast 样式

### 6.2 封装 Toast 工具

- [ ] 创建 `lib/toast.ts`
- [ ] 实现 showToast.success()
- [ ] 实现 showToast.error()
- [ ] 实现 showToast.loading()
- [ ] 实现 showToast.promise()

### 6.3 添加操作反馈

- [ ] 保存成功 Toast
- [ ] 删除成功 Toast
- [ ] 导入进度 Toast
- [ ] 错误提示 Toast

---

## Phase 7: 测试 & 优化 (30 分钟)

### 7.1 功能测试

- [ ] **导入流程测试**
  - [ ] 测试 CSV 文件上传
  - [ ] 测试 Excel 文件上传
  - [ ] 测试文件格式错误
  - [ ] 测试文件大小超限
  - [ ] 测试字段映射
  - [ ] 测试数据验证
  - [ ] 测试导入完成

- [ ] **编辑功能测试**
  - [ ] 测试快速编辑
  - [ ] 测试详情页编辑
  - [ ] 测试表单验证
  - [ ] 测试保存成功

- [ ] **删除功能测试**
  - [ ] 测试删除确认
  - [ ] 测试取消删除
  - [ ] 测试删除成功

- [ ] **Toast 测试**
  - [ ] 测试成功 Toast
  - [ ] 测试错误 Toast
  - [ ] 测试加载 Toast

### 7.2 响应式测试

- [ ] Mobile (< 768px) 测试
- [ ] Tablet (768-1024px) 测试
- [ ] Desktop (> 1024px) 测试

### 7.3 优化

- [ ] 性能优化（大文件处理）
- [ ] 错误处理完善
- [ ] 用户体验微调
- [ ] 代码清理

---

## 代码文件结构

```
player-grouping/
├── app/
│   └── import/
│       ├── players/
│       │   └── page.tsx          # 导入球员页面
│       ├── games/
│       │   └── page.tsx          # 导入比赛页面
│       └── history/
│           └── page.tsx          # 导入历史页面
├── components/
│   ├── ui/
│   │   ├── stepper.tsx           # 步骤指示器
│   │   ├── file-upload.tsx       # 文件上传区域
│   │   ├── skeleton.tsx          # 骨架屏
│   │   ├── empty-state.tsx       # 空状态
│   │   └── ... (shadcn components)
│   ├── dialogs/
│   │   ├── quick-edit-dialog.tsx # 快速编辑
│   │   ├── detail-dialog.tsx     # 详情页
│   │   └── delete-confirm-dialog.tsx # 删除确认
│   ├── import/
│   │   ├── import-wizard.tsx     # 导入向导框架
│   │   └── steps/
│   │       ├── file-upload-step.tsx
│   │       ├── data-preview-step.tsx
│   │       ├── field-mapping-step.tsx
│   │       ├── validation-step.tsx
│   │       └── confirmation-step.tsx
│   ├── player-card.tsx           # (修改) 添加操作菜单
│   └── shell-bar.tsx             # (修改) 添加数据管理菜单
├── lib/
│   ├── toast.ts                  # Toast 工具
│   ├── validators.ts             # 数据验证逻辑
│   └── import-utils.ts           # 导入工具函数
└── types/
    └── import.ts                 # 导入相关类型定义
```

---

## 依赖清单

### shadcn/ui 组件
| 组件 | 安装命令 | 状态 |
|------|----------|------|
| tabs | `npx shadcn-ui@latest add tabs` | ⬜ |
| progress | `npx shadcn-ui@latest add progress` | ⬜ |
| alert-dialog | `npx shadcn-ui@latest add alert-dialog` | ⬜ |
| toast | `npx shadcn-ui@latest add toast` | ⬜ |
| form | `npx shadcn-ui@latest add form` | ⬜ |
| table | `npx shadcn-ui@latest add table` | ⬜ |
| select | `npx shadcn-ui@latest add select` | ⬜ |
| input | `npx shadcn-ui@latest add input` | ⬜ |
| card | `npx shadcn-ui@latest add card` | ⬜ |

### npm 包
| 包名 | 版本 | 用途 | 状态 |
|------|------|------|------|
| react-dropzone | latest | 文件拖拽 | ⬜ |
| papaparse | latest | CSV 解析 | ⬜ |
| xlsx | latest | Excel 解析 | ⬜ |
| react-hook-form | latest | 表单管理 | ⬜ |
| @hookform/resolvers | latest | 表单验证 | ⬜ |
| zod | latest | 数据验证 | ⬜ |
| sonner | latest | Toast 通知 | ⬜ |

---

## 进度追踪

| 阶段 | 预计时间 | 实际时间 | 状态 |
|------|----------|----------|------|
| Phase 1: 基础设施 | 30 min | - | ⬜ |
| Phase 2: Shell Bar | 20 min | - | ⬜ |
| Phase 3: Player Card | 20 min | - | ⬜ |
| Phase 4: 导入向导 | 60 min | - | ⬜ |
| Phase 5: 详情页 | 40 min | - | ⬜ |
| Phase 6: Toast | 15 min | - | ⬜ |
| Phase 7: 测试 | 30 min | - | ⬜ |
| **总计** | **3.5 h** | - | - |

---

**文档版本:** 1.0  
**最后更新:** 2026-03-06
