# 数据管理系统 - 开发任务

## 项目路径
/Users/ppt/Projects/player-grouping

## 背景
设计 Agent 已完成 UI/UX 设计，现在需要实现代码。

## 设计文档（必须先阅读）
- `data-management-ui-design.md` - 完整设计文档
- `data-management-components.md` - 组件详细设计
- `data-management-tasks.md` - 开发任务清单
- `data-management-wireframes.txt` - 界面线框图

## 你的任务

### Phase 1: 安装依赖 (10 分钟)

```bash
# 安装 shadcn/ui 组件
npx shadcn@latest add tabs
npx shadcn@latest add progress
npx shadcn@latest add alert-dialog
npx shadcn@latest add toast
npx shadcn@latest add form
npx shadcn@latest add table

# 安装第三方库
npm install react-dropzone
npm install papaparse
npm install xlsx
npm install react-hook-form
npm install @hookform/resolvers
npm install zod
```

### Phase 2: Shell Bar 集成 (20 分钟)

#### 2.1 修改 ShellBar.tsx
在 Shell Bar 添加"数据管理"下拉菜单：

```tsx
// src/components/ShellBar.tsx
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "./ui/dropdown-menu";

export function ShellBar() {
  return (
    <header className="h-12 bg-primary flex items-center px-4 shadow-md fixed top-0 w-full z-50">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🏀</span>
        <h1 className="text-white font-semibold text-lg">篮球球员分组系统</h1>
      </div>
      
      {/* 数据管理菜单 */}
      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-white hover:bg-primary/80">
              <Database className="w-4 h-4 mr-2" />
              数据管理
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => openImportDialog('players')}>
              <Upload className="w-4 h-4 mr-2" />
              批量导入球员
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openImportDialog('games')}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              导入比赛数据
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              导出数据
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button variant="ghost" className="text-white">帮助</Button>
        <Avatar>...</Avatar>
      </div>
    </header>
  );
}
```

### Phase 3: Player Card 增强 (30 分钟)

#### 3.1 修改 PlayerCard.tsx
添加操作菜单：

```tsx
// src/components/PlayerCard.tsx
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "./ui/dropdown-menu";

export function PlayerCard({ player, onDelete }: PlayerCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            {/* 球员信息 */}
            <div className="flex items-center gap-3">
              <Avatar>...</Avatar>
              <div>
                <CardTitle>{player.name}</CardTitle>
                <Badge>{position}</Badge>
              </div>
            </div>
            
            {/* 操作菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setIsDetailDialogOpen(true)}>
                  <Eye className="w-4 h-4 mr-2" />
                  查看详情
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  快速编辑
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(player.id)} className="text-destructive">
                  <Trash className="w-4 h-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* KPI + 技能条 */}
        </CardContent>
      </Card>
      
      {/* Dialogs */}
      <QuickEditDialog 
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        player={player}
        onSave={handleSave}
      />
      
      <PlayerDetailDialog
        open={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        player={player}
      />
    </>
  );
}
```

### Phase 4: 导入向导 (60 分钟)

#### 4.1 创建 ImportWizard.tsx
创建 5 步导入向导：

```tsx
// src/components/import/ImportWizard.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Progress } from '../ui/progress';
import { useDropzone } from 'react-dropzone';

interface ImportWizardProps {
  open: boolean;
  onClose: () => void;
  type: 'players' | 'games';
}

export function ImportWizard({ open, onClose, type }: ImportWizardProps) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  
  const steps = [
    { id: 1, title: '选择文件' },
    { id: 2, title: '数据预览' },
    { id: 3, title: '字段映射' },
    { id: 4, title: '数据验证' },
    { id: 5, title: '导入确认' },
  ];
  
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/json': ['.json'],
    },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
        parseFile(acceptedFiles[0]);
      }
    },
  });
  
  const parseFile = async (file: File) => {
    // 根据文件类型解析
    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        complete: (results) => {
          setData(results.data);
          setStep(2);
        },
      });
    } else if (file.name.endsWith('.xlsx')) {
      const workbook = XLSX.read(await file.arrayBuffer());
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      setData(jsonData);
      setStep(2);
    }
  };
  
  const handleImport = async () => {
    setImporting(true);
    // 调用导入 API
    // ...
    setImporting(false);
    onClose();
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === 'players' ? '批量导入球员' : '导入比赛数据'}
          </DialogTitle>
        </DialogHeader>
        
        {/* Progress Bar */}
        <div className="mb-6">
          <Progress value={(step / 5) * 100} className="h-2" />
          <div className="flex justify-between mt-2">
            {steps.map((s) => (
              <span key={s.id} className={step >= s.id ? 'text-primary font-medium' : 'text-muted-foreground'}>
                {s.title}
              </span>
            ))}
          </div>
        </div>
        
        {/* Step 1: 文件上传 */}
        {step === 1 && (
          <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary">
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">拖拽文件到此处，或点击上传</p>
            <p className="text-sm text-muted-foreground mt-2">支持 CSV, Excel, JSON 格式</p>
          </div>
        )}
        
        {/* Step 2: 数据预览 */}
        {step === 2 && (
          <DataTablePreview data={data} />
        )}
        
        {/* Step 3: 字段映射 */}
        {step === 3 && (
          <FieldMapping data={data} mapping={mapping} setMapping={setMapping} />
        )}
        
        {/* Step 4: 数据验证 */}
        {step === 4 && (
          <DataValidation data={data} mapping={mapping} errors={errors} setErrors={setErrors} />
        )}
        
        {/* Step 5: 导入确认 */}
        {step === 5 && (
          <ImportConfirmation 
            data={data}
            errors={errors}
            importing={importing}
            onConfirm={handleImport}
          />
        )}
        
        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
          >
            {step === 1 ? '取消' : '上一步'}
          </Button>
          <Button 
            onClick={() => step < 5 ? setStep(step + 1) : handleImport()}
            disabled={step === 5 && importing}
          >
            {step === 5 ? (importing ? '导入中...' : '确认导入') : '下一步'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Phase 5: 详情页 Dialog (40 分钟)

#### 5.1 创建 PlayerDetailDialog.tsx
使用 Tabs 组件：

```tsx
// src/components/dialogs/PlayerDetailDialog.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export function PlayerDetailDialog({ open, onClose, player }: PlayerDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>球员详情 - {player.name}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="skills">技能</TabsTrigger>
            <TabsTrigger value="matches">比赛记录</TabsTrigger>
            <TabsTrigger value="trends">趋势分析</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <PlayerOverview player={player} />
          </TabsContent>
          
          <TabsContent value="skills">
            <PlayerSkillsEditor player={player} onSave={handleSave} />
          </TabsContent>
          
          <TabsContent value="matches">
            <MatchHistory player={player}>
              <Button onClick={openMatchUploadDialog}>
                <Upload className="w-4 h-4 mr-2" />
                上传比赛数据
              </Button>
              <MatchList matches={player.matches} />
            </MatchHistory>
          </TabsContent>
          
          <TabsContent value="trends">
            <PlayerTrendChart player={player} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

### Phase 6: Toast 通知 (15 分钟)

#### 6.1 配置 Toast
```tsx
// src/lib/toast.ts
import { toast } from 'sonner';

export function showToast(type: 'success' | 'error' | 'warning', message: string) {
  switch (type) {
    case 'success':
      toast.success(message);
      break;
    case 'error':
      toast.error(message);
      break;
    case 'warning':
      toast.warning(message);
      break;
  }
}

// 使用示例
showToast('success', '成功导入 18 名球员');
showToast('error', '导入失败：文件格式不正确');
```

## 关键要求

### 1. 保持现有功能
- ✅ 不要修改分组算法
- ✅ 不要修改 Supabase 相关代码
- ✅ 不要修改已有球员数据

### 2. 添加 data-testid
所有新组件都要添加：
- `data-testid="data-management-menu"`
- `data-testid="import-wizard"`
- `data-testid="player-card-menu"`
- `data-testid="player-detail-dialog"`

### 3. 响应式设计
确保在 Mobile/Tablet/Desktop 都能正常使用

### 4. 错误处理
所有 API 调用都要有 try-catch

## 完成标准
- ✅ `npm run build` 成功
- ✅ `npm run dev` 正常启动
- ✅ 所有 data-testid 已添加
- ✅ Shell Bar 有"数据管理"菜单
- ✅ Player Card 有操作菜单
- ✅ 导入向导 5 步流程完整
- ✅ 详情页 Tabs 正常切换

## 完成后
创建 `data-management-dev-status.json`:
```json
{
  "phase1_installed": true,
  "phase2_shellbar": true,
  "phase3_playercard": true,
  "phase4_importwizard": true,
  "phase5_detaildialog": true,
  "phase6_toast": true,
  "dev_server_started": true,
  "ready_for_testing": true
}
```
