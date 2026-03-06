# 数据管理系统 - 组件详细设计

> 版本: 1.0  
> 日期: 2026-03-06  
> 配合: data-management-ui-design.md

---

## 1. Shell Bar 组件

### 1.1 DataManagementMenu

**用途:** 顶部导航栏的数据管理下拉菜单

**Props:**
```typescript
interface DataManagementMenuProps {
  onImportPlayers: () => void;
  onImportGames: () => void;
  onViewHistory: () => void;
  onExportData: () => void;
}
```

**结构:**
```
DropdownMenu
├── DropdownMenuTrigger (Button with icon)
│   └── "数据管理" + ChevronDown
├── DropdownMenuContent
│   ├── DropdownMenuItem (📥 导入新球员)
│   ├── DropdownMenuItem (📋 批量导入比赛数据)
│   ├── DropdownMenuSeparator
│   ├── DropdownMenuItem (📊 查看导入历史)
│   ├── DropdownMenuSeparator
│   └── DropdownMenuItem (📤 导出数据)
```

**样式:**
```css
/* 菜单项 */
.data-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.data-menu-item:hover {
  background-color: var(--neutral-subtle);
}

/* 图标 */
.data-menu-item svg {
  width: 16px;
  height: 16px;
  color: var(--text-secondary);
}
```

**交互:**
1. 点击触发器打开菜单
2. 菜单项 hover 高亮
3. 点击项目执行对应操作并关闭菜单
4. 按 ESC 或点击外部关闭菜单

---

## 2. Player Card 组件

### 2.1 PlayerCard

**用途:** 展示球员信息的卡片组件

**Props:**
```typescript
interface PlayerCardProps {
  player: Player;
  onEdit: (player: Player) => void;
  onViewDetails: (player: Player) => void;
  onDelete: (player: Player) => void;
  isSelected?: boolean;
}
```

**结构:**
```
Card
├── CardHeader
│   ├── Avatar (头像/首字母)
│   └── PlayerCardMenu
│       └── DropdownMenu
│           ├── DropdownMenuItem (快速编辑)
│           ├── DropdownMenuItem (查看详情)
│           ├── DropdownMenuSeparator
│           └── DropdownMenuItem (删除 - danger)
├── CardContent
│   ├── PlayerName (姓名)
│   ├── PlayerPhone (手机号)
│   ├── PlayerTags (位置、等级)
│   └── PlayerStats (参加次数)
```

**样式:**
```css
.player-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  transition: all 200ms ease;
}

.player-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: var(--primary);
}

.player-card.selected {
  border-color: var(--primary);
  background: var(--primary-subtle);
}

/* 菜单按钮 */
.player-card-menu-btn {
  opacity: 0;
  transition: opacity 200ms;
}

.player-card:hover .player-card-menu-btn {
  opacity: 1;
}

/* 标签 */
.player-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: var(--neutral-subtle);
  color: var(--text-secondary);
}

.player-tag.position {
  background: var(--primary-subtle);
  color: var(--primary);
}

.player-tag.level {
  background: var(--success-subtle);
  color: var(--success);
}
```

### 2.2 PlayerCardMenu

**用途:** Player Card 上的操作菜单

**结构:**
```
DropdownMenu
├── DropdownMenuTrigger
│   └── IconButton (MoreVertical icon)
├── DropdownMenuContent
│   ├── DropdownMenuItem
│   │   ├── Pencil icon
│   │   └── "快速编辑"
│   ├── DropdownMenuItem
│   │   ├── FileText icon
│   │   └── "查看详情"
│   ├── DropdownMenuSeparator
│   └── DropdownMenuItem (destructive)
│       ├── Trash2 icon
│       └── "删除"
```

**交互:**
- 删除项使用 `destructive` 样式（红色文字）
- 点击删除项弹出确认 Dialog

---

## 3. 导入向导组件

### 3.1 ImportWizard

**用途:** 5步导入向导的主框架

**Props:**
```typescript
interface ImportWizardProps {
  type: 'players' | 'games';
  onComplete: (result: ImportResult) => void;
  onCancel: () => void;
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  skipped: number;
}
```

**结构:**
```
Dialog (full-screen on mobile)
├── DialogHeader
│   ├── DialogTitle ("导入新球员" / "批量导入比赛数据")
│   └── WizardStepper
│       └── [Step 1] - [Step 2] - [Step 3] - [Step 4] - [Step 5]
├── DialogContent
│   ├── FileUploadStep (Step 1)
│   ├── DataPreviewStep (Step 2)
│   ├── FieldMappingStep (Step 3)
│   ├── ValidationStep (Step 4)
│   └── ConfirmationStep (Step 5)
└── DialogFooter
    ├── Button (secondary, "取消")
    ├── Button (secondary, "上一步") - hidden on Step 1
    └── Button (primary, "下一步" / "开始导入")
```

**状态管理:**
```typescript
interface WizardState {
  currentStep: number;
  file: File | null;
  rawData: any[][];
  headers: string[];
  mappedFields: FieldMapping[];
  validatedData: ValidatedRow[];
  importProgress: number;
}

interface FieldMapping {
  systemField: string;
  fileColumn: string | null;
  required: boolean;
}

interface ValidatedRow {
  data: Record<string, any>;
  rowNumber: number;
  status: 'valid' | 'warning' | 'error';
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
  type: 'format' | 'duplicate' | 'required' | 'custom';
}
```

### 3.2 WizardStepper

**用途:** 显示导入进度和步骤

**Props:**
```typescript
interface WizardStepperProps {
  steps: string[];
  currentStep: number;
}
```

**结构 (水平布局 - Desktop):**
```
┌─────────────────────────────────────────────────────────────────┐
│  ●─────────●─────────○─────────○─────────○                     │
│  上传文件   预览   字段映射   验证   确认                         │
└─────────────────────────────────────────────────────────────────┘

图例: ● = 已完成/当前  ○ = 未完成
```

**结构 (垂直布局 - Mobile):**
```
┌─────────────────────────────────┐
│  ● 上传文件                      │
│  │                              │
│  ● 预览                         │
│  │                              │
│  ○ 字段映射                     │
│  │                              │
│  ○ 验证                         │
│  │                              │
│  ○ 确认                         │
└─────────────────────────────────┘
```

**样式:**
```css
/* 步骤项 */
.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

/* 步骤圆圈 */
.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
}

.step-circle.completed {
  background: var(--primary);
  color: white;
}

.step-circle.current {
  background: var(--primary);
  color: white;
  box-shadow: 0 0 0 4px var(--primary-subtle);
}

.step-circle.pending {
  background: var(--neutral-subtle);
  color: var(--text-secondary);
}

/* 连接线 */
.step-connector {
  flex: 1;
  height: 2px;
  background: var(--border);
  margin: 0 8px;
}

.step-connector.completed {
  background: var(--primary);
}
```

### 3.3 FileUploadStep (Step 1)

**用途:** 文件上传区域

**Props:**
```typescript
interface FileUploadStepProps {
  onFileSelect: (file: File) => void;
  acceptedFormats: string[];
  maxSize: number; // in MB
  templateDownloadUrl?: string;
}
```

**结构:**
```
div
├── DropZone
│   ├── UploadIcon (large)
│   ├── DropText ("将文件拖放到此处，或点击选择文件")
│   ├── FormatText ("支持 CSV, XLS, XLSX 格式")
│   ├── SizeText ("最大文件大小: 10MB")
│   └── Button ("选择文件")
├── TemplateSection
│   ├── InfoIcon
│   ├── Text ("下载导入模板以确保数据格式正确")
│   └── Link ("下载模板")
└── SelectedFile (条件渲染)
    ├── FileIcon
    ├── FileName
    ├── FileSize
    ├── RowCount
    └── RemoveButton
```

**样式:**
```css
.drop-zone {
  border: 2px dashed var(--border);
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  transition: all 200ms ease;
  cursor: pointer;
}

.drop-zone:hover,
.drop-zone.drag-over {
  border-color: var(--primary);
  background: var(--primary-subtle);
}

.drop-zone.drag-over {
  border-style: solid;
}

/* 选中文件后 */
.selected-file {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--neutral-subtle);
  border-radius: 8px;
  margin-top: 16px;
}

.selected-file .file-icon {
  width: 40px;
  height: 40px;
  background: var(--success-subtle);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--success);
}
```

**验证逻辑:**
```typescript
const validateFile = (file: File): ValidationResult => {
  // 1. 检查文件类型
  const validTypes = ['.csv', '.xls', '.xlsx'];
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!validTypes.includes(`.${ext}`)) {
    return { valid: false, error: '不支持的文件格式' };
  }
  
  // 2. 检查文件大小
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: '文件大小超过 10MB 限制' };
  }
  
  return { valid: true };
};
```

### 3.4 DataPreviewStep (Step 2)

**用途:** 预览上传的数据

**Props:**
```typescript
interface DataPreviewStepProps {
  headers: string[];
  data: any[][];
  totalRows: number;
  previewRows?: number; // default: 10
}
```

**结构:**
```
div
├── FileInfo
│   ├── FileIcon
│   ├── FileName
│   ├── FileSize
│   └── RowCount
├── PreviewTable
│   ├── TableHeader
│   │   └── [Header Cells]
│   └── TableBody
│       └── [Rows] (limited to previewRows)
└── StatsBar
    ├── ColumnsCount
    └── TotalRowsCount
```

**样式:**
```css
.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.preview-table th {
  background: var(--neutral-subtle);
  padding: 12px 16px;
  text-align: left;
  font-weight: 500;
  border-bottom: 2px solid var(--border);
  white-space: nowrap;
}

.preview-table td {
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-table tr:hover td {
  background: var(--neutral-subtle);
}
```

### 3.5 FieldMappingStep (Step 3)

**用途:** 映射文件列到系统字段

**Props:**
```typescript
interface FieldMappingStepProps {
  fileHeaders: string[];
  systemFields: SystemField[];
  mappings: FieldMapping[];
  onMappingChange: (field: string, column: string | null) => void;
}

interface SystemField {
  key: string;
  label: string;
  required: boolean;
  type: 'text' | 'number' | 'phone' | 'date' | 'select';
  options?: string[]; // for select type
}
```

**结构:**
```
div
├── MappingInfo
│   └── Text ("将文件列映射到系统字段")
├── RequiredFieldsSection
│   ├── SectionTitle ("必填字段")
│   └── MappingList
│       └── MappingRow[]
│           ├── SystemFieldLabel (with * indicator)
│           ├── SelectDropdown
│           │   ├── fileHeader options
│           │   └── "忽略此列" option
│           └── StatusIcon (✅ or ❌)
├── OptionalFieldsSection
│   ├── SectionTitle ("可选字段")
│   └── MappingList
│       └── MappingRow[]
└── AutoMappingHint
    ├── InfoIcon
    └── Text ("字段已自动映射，如有错误请手动调整")
```

**自动映射逻辑:**
```typescript
const autoMapFields = (
  fileHeaders: string[],
  systemFields: SystemField[]
): FieldMapping[] => {
  const mappingRules: Record<string, string[]> = {
    name: ['姓名', 'name', '名字', '球员姓名'],
    phone: ['手机号', '电话', 'phone', 'mobile', '联系方式'],
    level: ['等级', 'level', '级别', '水平'],
    position: ['位置', 'position', '场上位置', '打法'],
    attendCount: ['参加次数', '次数', 'attend', 'count'],
    remark: ['备注', 'remark', '说明', 'note'],
  };
  
  return systemFields.map(field => {
    const keywords = mappingRules[field.key] || [];
    const matchedHeader = fileHeaders.find(header => 
      keywords.some(keyword => 
        header.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    
    return {
      systemField: field.key,
      fileColumn: matchedHeader || null,
      required: field.required,
    };
  });
};
```

**样式:**
```css
.mapping-row {
  display: grid;
  grid-template-columns: 1fr 1fr 40px;
  gap: 16px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.mapping-row.required .system-field-label {
  font-weight: 500;
}

.mapping-row.unmapped {
  background: var(--error-subtle);
  margin: 0 -16px;
  padding: 12px 16px;
}

.status-icon.valid {
  color: var(--success);
}

.status-icon.invalid {
  color: var(--error);
}
```

### 3.6 ValidationStep (Step 4)

**用途:** 验证数据并显示错误

**Props:**
```typescript
interface ValidationStepProps {
  validatedData: ValidatedRow[];
  onFix: (rowNumber: number, field: string, value: any) => void;
  onSkip: (rowNumbers: number[]) => void;
}
```

**结构:**
```
div
├── ValidationSummary
│   ├── ValidCount (✅ icon, green)
│   ├── WarningCount (⚠️ icon, yellow)
│   └── ErrorCount (❌ icon, red)
├── ErrorSection (条件渲染)
│   ├── SectionTitle ("错误数据 (点击修复)")
│   └── ErrorTable
│       ├── RowNumber
│       ├── KeyFields
│       ├── ProblemDescription
│       └── FixButton ("点击修复")
├── WarningSection (条件渲染)
│   ├── SectionTitle ("警告数据")
│   └── WarningTable
│       ├── RowNumber
│       ├── KeyFields
│       └── WarningDescription
└── ActionButtons
    ├── Button (secondary, "跳过所有错误行")
    └── Button (primary, "仅导入有效数据 (N 行)")
```

**验证逻辑:**
```typescript
const validateRow = (
  row: Record<string, any>,
  rowNum: number,
  existingData: Player[]
): ValidatedRow => {
  const errors: ValidationError[] = [];
  let status: 'valid' | 'warning' | 'error' = 'valid';
  
  // 1. 必填字段检查
  if (!row.name || row.name.trim() === '') {
    errors.push({
      field: 'name',
      message: '姓名不能为空',
      type: 'required',
    });
    status = 'error';
  }
  
  // 2. 手机号格式检查
  if (row.phone && !/^1[3-9]\d{9}$/.test(row.phone)) {
    errors.push({
      field: 'phone',
      message: '手机号格式不正确，应为 11 位数字',
      type: 'format',
    });
    status = 'error';
  }
  
  // 3. 重复检查
  if (existingData.some(p => p.phone === row.phone)) {
    errors.push({
      field: 'phone',
      message: '手机号已存在',
      type: 'duplicate',
    });
    status = 'warning';
  }
  
  // 4. 等级范围检查
  if (row.level && !['A', 'B', 'C', 'D'].includes(row.level.toUpperCase())) {
    errors.push({
      field: 'level',
      message: `等级 "${row.level}" 不在标准范围内，将设为 "A"`,
      type: 'format',
    });
    if (status !== 'error') status = 'warning';
  }
  
  return {
    data: row,
    rowNumber: rowNum,
    status,
    errors,
  };
};
```

**行内修复组件:**
```
InlineEditor (Popover)
├── Trigger (错误单元格)
│   └── CurrentValue (红色边框)
└── PopoverContent
    ├── ErrorDescription
    ├── Input (修正值)
    └── Actions
        ├── Button (取消)
        └── Button (应用)
```

### 3.7 ConfirmationStep (Step 5)

**用途:** 确认导入设置

**Props:**
```typescript
interface ConfirmationStepProps {
  stats: ImportStats;
  onConfirm: () => void;
}

interface ImportStats {
  total: number;
  toImport: number;
  errorSkipped: number;
  duplicateSkipped: number;
  newPlayers: number;
  updatedPlayers: number;
  duplicates: Array<{ name: string; phone: string }>;
}
```

**结构:**
```
div
├── StatsCard
│   ├── StatsIcon (📊)
│   ├── StatsTitle ("导入统计")
│   └── StatsList
│       ├── StatItem ("总行数: 150")
│       ├── StatItem ("将导入: 145 行")
│       ├── StatItem ("跳过 (错误): 2 行")
│       ├── StatItem ("跳过 (重复): 3 行")
│       ├── Divider
│       ├── StatItem ("新增球员: 140")
│       └── StatItem ("更新球员: 5")
├── DuplicateWarning (条件渲染)
│   ├── WarningIcon
│   ├── Text ("以下手机号已存在，将被更新而非新增")
│   └── DuplicateList
│       └── DuplicateItem[] (手机号 + 姓名)
└── ProgressIndicator (导入后显示)
    ├── ProgressBar
    ├── ProgressText ("60% (87/145)")
    └── CurrentItem ("正在处理: 张三丰")
```

**进度组件:**
```typescript
interface ProgressIndicatorProps {
  current: number;
  total: number;
  currentItem?: string;
  onCancel?: () => void;
}

// 样式
.progress-bar {
  height: 8px;
  background: var(--neutral-subtle);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--primary);
  transition: width 300ms ease;
}
```

---

## 4. 编辑组件

### 4.1 QuickEditDialog

**用途:** 快速编辑球员基本信息

**Props:**
```typescript
interface QuickEditDialogProps {
  player: Player;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (player: Player) => void;
}
```

**表单字段:**
```typescript
const formSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  level: z.enum(['A', 'B', 'C', 'D']),
  position: z.string().optional(),
  remark: z.string().optional(),
});
```

**结构:**
```
Dialog
├── DialogHeader
│   └── DialogTitle ("编辑球员信息")
├── DialogContent
│   └── Form
│       ├── FormField (name)
│       ├── FormField (phone)
│       ├── FormField (level) - Select
│       ├── FormField (position) - Select
│       └── FormField (remark) - Textarea
└── DialogFooter
    ├── Button (secondary, "取消")
    └── Button (primary, "保存")
```

**验证时机:**
- 失去焦点时验证单个字段
- 提交时验证所有字段
- 实时显示错误信息

### 4.2 DetailDialog

**用途:** 查看和编辑完整球员信息

**Props:**
```typescript
interface DetailDialogProps {
  player: Player;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (player: Player) => void;
}
```

**结构:**
```
Dialog (max-width: 800px)
├── DialogHeader
│   ├── DialogTitle ("球员详情 - " + player.name)
│   └── DialogClose
├── DialogContent
│   ├── Tabs
│   │   ├── TabsList
│   │   │   ├── TabsTrigger ("基本信息")
│   │   │   ├── TabsTrigger ("比赛记录")
│   │   │   └── TabsTrigger ("历史数据")
│   │   ├── TabsContent (基本信息)
│   │   │   └── InfoGrid
│   │   │       ├── InfoItem (姓名)
│   │   │       ├── InfoItem (手机号)
│   │   │       ├── InfoItem (等级)
│   │   │       ├── InfoItem (位置)
│   │   │       ├── InfoItem (参加次数)
│   │   │       ├── InfoItem (创建时间)
│   │   │       └── InfoItem (最后更新)
│   │   ├── TabsContent (比赛记录)
│   │   │   ├── GameRecordTable
│   │   │   └── AddRecordButton
│   │   └── TabsContent (历史数据)
│   │       ├── StatsChart
│   │       └── StatsSummary
├── DialogFooter
│   ├── Button (secondary, "关闭")
│   └── Button (primary, "编辑")
```

**InfoGrid 样式:**
```css
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 12px;
  color: var(--text-secondary);
}

.info-item .value {
  font-size: 14px;
  color: var(--text-primary);
}

@media (max-width: 640px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
}
```

### 4.3 DeleteConfirmDialog

**用途:** 删除确认对话框

**Props:**
```typescript
interface DeleteConfirmDialogProps {
  playerName: string;
  recordCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}
```

**结构:**
```
AlertDialog
├── AlertDialogHeader
│   └── AlertDialogTitle ("确认删除")
├── AlertDialogContent
│   ├── WarningIcon (⚠️)
│   ├── ConfirmText ("确定要删除球员 "XXX" 吗？")
│   ├── ImpactList
│   │   ├── ListItem ("基本信息")
│   │   ├── ListItem ("N 条比赛记录")
│   │   └── ListItem ("历史数据")
│   └── WarningText ("此操作无法撤销。")
└── AlertDialogFooter
    ├── AlertDialogCancel ("取消")
    └── AlertDialogAction ("删除") - destructive
```

**样式:**
```css
.delete-dialog .warning-icon {
  font-size: 48px;
  text-align: center;
  margin-bottom: 16px;
  color: var(--warning);
}

.delete-dialog .impact-list {
  margin: 16px 0;
  padding-left: 20px;
}

.delete-dialog .impact-list li {
  margin: 8px 0;
  color: var(--text-secondary);
}

.delete-dialog .warning-text {
  color: var(--error);
  font-weight: 500;
}

.delete-dialog .alert-dialog-action {
  background: var(--error);
  color: white;
}

.delete-dialog .alert-dialog-action:hover {
  background: var(--error-dark);
}
```

---

## 5. Toast 组件

### 5.1 Toaster 配置

**位置:** 右下角

**类型:**
- `success`: 成功操作
- `error`: 错误提示
- `warning`: 警告
- `info`: 信息
- `loading`: 加载中

**配置:**
```typescript
// components/ui/toaster.tsx
import { Toaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
        },
        classNames: {
          success: 'toast-success',
          error: 'toast-error',
          warning: 'toast-warning',
          info: 'toast-info',
        },
      }}
    />
  );
}
```

**工具函数:**
```typescript
// lib/toast.ts
import { toast } from 'sonner';

export const showToast = {
  success: (message: string, options?: ToastOptions) => 
    toast.success(message, { duration: 3000, ...options }),
    
  error: (message: string, options?: ToastOptions) => 
    toast.error(message, { duration: Infinity, ...options }),
    
  warning: (message: string, options?: ToastOptions) => 
    toast.warning(message, { duration: 5000, ...options }),
    
  info: (message: string, options?: ToastOptions) => 
    toast.info(message, { duration: 4000, ...options }),
    
  loading: (message: string, options?: ToastOptions) => 
    toast.loading(message, { duration: Infinity, ...options }),
    
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => toast.promise(promise, messages),
    
  dismiss: (toastId?: string | number) => toast.dismiss(toastId),
};
```

**样式:**
```css
.toast-success {
  --toast-bg: #ecfdf5;
  --toast-border: #a7f3d0;
  --toast-color: #065f46;
}

.toast-error {
  --toast-bg: #fef2f2;
  --toast-border: #fecaca;
  --toast-color: #991b1b;
}

.toast-warning {
  --toast-bg: #fffbeb;
  --toast-border: #fde68a;
  --toast-color: #92400e;
}

.toast-info {
  --toast-bg: #eff6ff;
  --toast-border: #bfdbfe;
  --toast-color: #1e40af;
}
```

---

## 6. 空状态组件

### 6.1 EmptyState

**用途:** 数据为空时的展示

**Props:**
```typescript
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**结构:**
```
div.empty-state
├── EmptyIcon
├── EmptyTitle
├── EmptyDescription (optional)
└── ActionButton (optional)
```

**样式:**
```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.empty-state .empty-icon {
  font-size: 64px;
  margin-bottom: 24px;
  color: var(--text-disabled);
}

.empty-state .empty-title {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-state .empty-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 24px;
  max-width: 300px;
}

.empty-state .action-button {
  /* Button styles */
}
```

**预设组件:**
```typescript
// 预设的空状态组件
export const NoPlayersEmpty = () => (
  <EmptyState
    icon={<Basketball />}
    title="还没有球员数据"
    description="开始导入球员数据，让分组变得更简单"
    action={{ label: "导入球员", onClick: () => openImport() }}
  />
);

export const NoRecordsEmpty = () => (
  <EmptyState
    icon={<ClipboardList />}
    title="还没有比赛记录"
    description="该球员还没有参加比赛的记录"
    action={{ label: "添加记录", onClick: () => openAddRecord() }}
  />
);

export const SearchEmpty = () => (
  <EmptyState
    icon={<Search />}
    title="没有找到匹配的结果"
    description="尝试使用其他关键词搜索"
  />
);
```

---

## 7. 骨架屏组件

### 7.1 Skeleton 组件

**用途:** 加载状态展示

**预设骨架:**
```typescript
// Player Card 骨架
export const PlayerCardSkeleton = () => (
  <div className="player-card skeleton">
    <Skeleton className="avatar w-12 h-12 rounded-full" />
    <Skeleton className="title w-24 h-4" />
    <Skeleton className="phone w-32 h-3" />
    <div className="tags flex gap-2">
      <Skeleton className="w-12 h-6 rounded-full" />
      <Skeleton className="w-12 h-6 rounded-full" />
    </div>
    <Skeleton className="stats w-20 h-3" />
  </div>
);

// 表格骨架
export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="table-skeleton">
    <div className="table-header flex gap-4 mb-4">
      {Array(cols).fill(0).map((_, i) => (
        <Skeleton key={i} className="flex-1 h-4" />
      ))}
    </div>
    {Array(rows).fill(0).map((_, i) => (
      <div key={i} className="table-row flex gap-4 mb-3">
        {Array(cols).fill(0).map((_, j) => (
          <Skeleton key={j} className="flex-1 h-3" />
        ))}
      </div>
    ))}
  </div>
);

// 详情页骨架
export const DetailSkeleton = () => (
  <div className="detail-skeleton">
    <Skeleton className="w-32 h-8 mb-6" />
    <div className="grid grid-cols-2 gap-4">
      {Array(6).fill(0).map((_, i) => (
        <div key={i}>
          <Skeleton className="w-16 h-3 mb-2" />
          <Skeleton className="w-24 h-4" />
        </div>
      ))}
    </div>
  </div>
);
```

**骨架动画:**
```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--neutral-subtle) 25%,
    var(--surface) 50%,
    var(--neutral-subtle) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 4px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

---

**文档版本:** 1.0  
**最后更新:** 2026-03-06
