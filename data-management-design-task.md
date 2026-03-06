# 数据管理系统 UI/UX 设计任务

## 项目路径
/Users/ppt/Projects/player-grouping

## 背景
用户需要一个专业的数据管理系统，支持：
1. 批量导入新球员
2. 编辑已有球员数据
3. 上传比赛数据（单个/批量）
4. 查看历史数据

## 核心要求（必须严格遵守）

### 1. 不要临时方案
- ✅ 每个功能都要考虑长期使用
- ✅ UI 要符合现代企业级应用标准
- ✅ 代码要可维护、可扩展
- ❌ 不要"快速修复"或"临时方案"

### 2. 零培训成本
用户应该能够：
- 不看文档就知道怎么用
- 基于自己熟悉的应用经验（Google、iPhone、SAP UI）操作
- 界面符合直觉，操作路径清晰

### 3. 参考 UI 范式
- **Google Material Design** - 简洁、清晰
- **Apple HIG** - 直观、优雅
- **SAP Fiori** - 企业级、专业

## 你的任务

### Phase 1: 联网搜索 & 知识储备 (20 分钟)

#### 1.1 搜索数据导入 UI 最佳实践
搜索关键词：
```
- "bulk data import UI design best practices 2026"
- "file upload wizard UX patterns"
- "data validation UI design examples"
- "Excel CSV import interface design"
- "drag drop file upload UI examples"
```

重点学习：
- 如何设计分步导入流程
- 如何做数据预览和字段映射
- 如何处理验证错误
- 如何显示导入进度

#### 1.2 搜索编辑模式 UI
搜索关键词：
```
- "inline editing vs modal editing UX"
- "form design best practices 2026"
- "data grid editing UI patterns"
- "mobile-first form design"
```

重点学习：
- 何时用 Dialog，何时用 inline 编辑
- 表单布局最佳实践
- 移动端适配

#### 1.3 搜索企业级应用 UI
搜索关键词：
```
- "SAP Fiori data management patterns"
- "enterprise application UI design 2026"
- "Google Admin Console UI"
- "Apple Settings app design patterns"
```

重点学习：
- 企业级应用的导航结构
- 数据密集型界面的设计
- 操作入口的最佳位置

#### 1.4 搜索进度反馈机制
搜索关键词：
```
- "progress indicator design patterns"
- "real-time feedback UI"
- "notification design best practices"
```

### Phase 2: 设计方案编写 (30 分钟)

创建详细的设计文档：`data-management-ui-design.md`

#### 2.1 信息架构设计
```
绘制完整的导航结构图：
- Shell Bar 层级
- 页面层级
- Dialog 层级
- 操作路径
```

#### 2.2 交互流程设计
```
为每个核心场景设计详细流程：

场景 1: 批量导入新球员
- Step 1: 选择文件 (支持拖拽)
- Step 2: 数据预览 (表格展示)
- Step 3: 字段映射 (下拉选择)
- Step 4: 数据验证 (错误高亮)
- Step 5: 导入确认 (最终确认)

场景 2: 编辑已有球员
- 路径 1: 快速编辑 (Dialog)
- 路径 2: 详情页编辑 (Tab)

场景 3: 上传比赛数据
- 单个上传 (表单 Dialog)
- 批量上传 (向导流程)
```

#### 2.3 UI 组件设计
```
为每个界面设计详细组件：

1. Shell Bar
   - 数据管理菜单结构
   - 下拉菜单项

2. Player Card
   - 操作按钮位置
   - 下拉菜单内容

3. Import Wizard
   - 5 个步骤的布局
   - 每个步骤的组件

4. Edit Dialog
   - 表单字段
   - 验证逻辑

5. Detail Dialog
   - Tabs 结构
   - 每个 Tab 的内容
```

#### 2.4 UX 设计细节
```
1. 响应式设计
   - Mobile (< 768px)
   - Tablet (768-1024px)
   - Desktop (> 1024px)

2. 错误处理
   - 验证错误显示
   - 网络错误处理
   - 用户友好提示

3. 加载状态
   - Skeleton loading
   - Progress bar
   - Spinner

4. 空状态
   - 没有数据时的提示
   - 引导用户操作

5. 反馈机制
   - 成功提示
   - 错误提示
   - 进度更新
```

### Phase 3: 设计规范 (10 分钟)

#### 3.1 视觉规范
```
- 颜色使用规则（SAP Fiori 色彩）
- 字体大小层级
- 间距系统（8px 基础单位）
- 圆角规范
- 阴影层级
```

#### 3.2 交互规范
```
- Hover 效果
- Active 效果
- Focus 状态
- Disabled 状态
- Loading 状态
```

#### 3.3 动画规范
```
- 过渡时间（200ms / 300ms）
- 缓动函数
- 何时使用动画
```

### Phase 4: 组件库选择 (5 分钟)

#### 4.1 需要的 shadcn/ui 组件
```bash
# 列出所有需要的组件
- dropdown-menu (已安装)
- dialog (已安装)
- tabs (需要安装)
- progress (需要安装)
- alert-dialog (需要安装)
- toast (需要安装)
- form (需要安装)
- table (需要安装)
```

#### 4.2 需要的第三方库
```bash
# 列出所有需要的库
- react-dropzone (文件上传)
- papaparse (CSV 解析)
- xlsx (Excel 解析)
- react-hook-form (表单管理)
- zod (数据验证)
```

### Phase 5: 实施计划 (5 分钟)

#### 5.1 开发任务拆解
```
创建详细的开发任务清单：

Phase 1: 基础设施 (30 分钟)
- 安装依赖
- 创建基础组件

Phase 2: Shell Bar 集成 (20 分钟)
- 添加数据管理菜单
- 创建路由

Phase 3: Player Card 增强 (20 分钟)
- 添加操作菜单
- 创建快速编辑 Dialog

Phase 4: 导入向导 (60 分钟)
- 5 步向导组件
- 文件上传
- 数据预览
- 字段映射
- 验证逻辑

Phase 5: 详情页 (40 分钟)
- Detail Dialog
- Tabs 组件
- 编辑功能
- 比赛记录

Phase 6: 测试 (30 分钟)
- 本地测试
- 线上验证
```

## 设计原则（必须遵守）

### 1. 直观性原则
- ✅ 操作路径不超过 3 步
- ✅ 每个操作都有清晰的视觉反馈
- ✅ 使用用户熟悉的图标和术语

### 2. 一致性原则
- ✅ 所有 Dialog 使用相同的布局结构
- ✅ 所有表单使用相同的验证样式
- ✅ 所有按钮使用相同的交互模式

### 3. 容错性原则
- ✅ 关键操作需要确认
- ✅ 提供撤销功能
- ✅ 清晰的错误提示和修复建议

### 4. 效率原则
- ✅ 批量操作优于单个操作
- ✅ 记住用户上次的选择
- ✅ 提供快捷键支持

### 5. 可访问性原则
- ✅ 支持键盘导航
- ✅ 屏幕阅读器友好
- ✅ 颜色对比度符合 WCAG 标准

## 参考案例（联网搜索时重点关注）

### 优秀案例
- **Google Contacts** - 批量导入联系人
- **Airtable** - 数据导入向导
- **Notion** - 数据库导入
- **Salesforce** - 客户数据导入
- **SAP Fiori** - 数据管理应用

### 学习要点
- 他们如何设计导入流程
- 他们如何处理错误
- 他们如何引导用户
- 他们如何提供反馈

## 输出文件

### 必须创建的文件
1. `data-management-ui-design.md` - 完整设计文档
2. `data-management-components.md` - 组件详细设计
3. `data-management-tasks.md` - 开发任务清单
4. `data-management-wireframes.txt` - ASCII 线框图

### 设计文档结构
```markdown
# 数据管理系统 UI/UX 设计

## 1. 研究总结
### 1.1 联网搜索发现
### 1.2 最佳实践总结
### 1.3 参考案例学习

## 2. 信息架构
### 2.1 导航结构
### 2.2 页面层级
### 2.3 操作路径

## 3. 交互设计
### 3.1 批量导入流程
### 3.2 编辑数据流程
### 3.3 上传比赛数据流程

## 4. UI 设计
### 4.1 组件设计
### 4.2 视觉规范
### 4.3 响应式设计

## 5. UX 设计
### 5.1 错误处理
### 5.2 加载状态
### 5.3 空状态

## 6. 实施计划
### 6.1 技术选型
### 6.2 任务拆解
### 6.3 时间估算
```

## 完成标准
- ✅ 所有搜索已完成，知识储备充分
- ✅ 设计文档完整，每个细节都有说明
- ✅ 组件设计详细，开发可以直接参考
- ✅ 任务拆解清晰，时间估算合理
- ✅ 符合"零培训成本"要求
- ✅ 参考 Google/Apple/SAP 设计规范

## 重要提示
- **联网搜索是关键** - 必须搜索足够多的资料
- **参考真实案例** - 学习成熟产品的设计
- **用户视角** - 设想用户第一次使用的场景
- **不要妥协** - 每个细节都要做到最好

## 完成后
在项目根目录创建 `data-management-design-status.json`:
```json
{
  "search_completed": true,
  "references_found": 15,
  "design_document_created": true,
  "wireframes_created": true,
  "tasks_defined": true,
  "ready_for_review": true
}
```
