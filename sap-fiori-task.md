# SAP Fiori 风格改造任务

## 项目路径
/Users/ppt/Projects/player-grouping

## 背景
将当前的球员分组工具改造为 SAP Fiori 设计风格。已有一个基础 SAP Blue 主题，需要进一步改造布局和组件。

## 设计文档
请仔细阅读: /Users/ppt/Projects/player-grouping/sap-fiori-redesign-plan.md

## 你的任务

### Phase 1: 安装新组件 (5 分钟)
```bash
npx shadcn@latest add dialog
npx shadcn@latest add avatar
npx shadcn@latest add progress
npx shadcn@latest add separator
```

### Phase 2: CSS 变量更新 (5 分钟)
更新 `src/index.css`:

```css
@theme {
  /* SAP Fiori Colors */
  --color-primary: #0A6ED1;
  --color-primary-foreground: #FFFFFF;
  --color-secondary: #F5F5F5;
  --color-secondary-foreground: #32363A;
  --color-background: #FAFAFA;
  --color-foreground: #32363A;
  --color-card: #FFFFFF;
  --color-card-foreground: #32363A;
  --color-muted: #F5F5F5;
  --color-muted-foreground: #6A6D70;
  --color-accent: #00B7F0;
  --color-accent-foreground: #FFFFFF;
  --color-border: #E5E5E5;
  --color-ring: #0A6ED1;
  
  /* SAP Fiori Status Colors */
  --color-success: #4DB14B;
  --color-warning: #E76500;
  --color-destructive: #BB0000;
}
```

删除渐变背景样式，改为纯色背景:
```css
/* 删除这段 */
.app-gradient {
  background: linear-gradient(...);
}

/* 改为 */
.sap-background {
  background-color: #FAFAFA;
}
```

### Phase 3: Shell Bar (15 分钟)
创建 `src/components/ShellBar.tsx`:

```tsx
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";

export function ShellBar() {
  return (
    <header 
      className="h-12 bg-primary flex items-center px-4 shadow-md fixed top-0 w-full z-50"
      data-testid="shell-bar"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">🏀</span>
        <h1 className="text-white font-semibold text-lg">篮球球员分组系统</h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm"
          className="text-white hover:bg-primary/80"
          data-testid="help-button"
        >
          帮助
        </Button>
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-white/20 text-white text-sm">J</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
```

### Phase 4: 改造 App.tsx (20 分钟)

#### 4.1 页面结构
```tsx
import { ShellBar } from "./components/ShellBar";

function App() {
  return (
    <div className="min-h-screen bg-background pt-12">
      <ShellBar />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Quick Actions */}
        <div className="flex items-center justify-between mb-6">
          {/* 搜索和筛选 */}
          <div className="flex items-center gap-3">
            <Input 
              placeholder="搜索球员..." 
              className="w-64"
              data-testid="search-input"
            />
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={handleExport}
              data-testid="export-button"
            >
              导出
            </Button>
            <Button 
              variant="outline"
              data-testid="import-button"
            >
              导入
            </Button>
            <Button 
              onClick={() => setIsFormOpen(true)}
              data-testid="add-player-button"
            >
              添加球员
            </Button>
          </div>
        </div>
        
        {/* Player Cards Grid */}
        <div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          data-testid="player-grid"
        >
          {players.map(player => (
            <PlayerCard 
              key={player.id} 
              player={player}
              onDelete={handleDeletePlayer}
            />
          ))}
        </div>
        
        {/* Grouping Section */}
        {players.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>分组设置</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 分组控制 */}
            </CardContent>
          </Card>
        )}
      </main>
      
      {/* Dialog Form */}
      <PlayerFormDialog 
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleAddPlayer}
      />
    </div>
  );
}
```

#### 4.2 表单改为 Dialog
创建 `src/components/PlayerFormDialog.tsx`:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select } from "./ui/select";

interface PlayerFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PlayerData) => void;
}

export function PlayerFormDialog({ open, onClose, onSubmit }: PlayerFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="player-form-dialog">
        <DialogHeader>
          <DialogTitle>添加球员</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <Label htmlFor="name">姓名</Label>
            <Input 
              id="name" 
              placeholder="输入球员姓名"
              data-testid="player-name-input"
            />
          </div>
          <div>
            <Label htmlFor="position">位置</Label>
            <Select data-testid="player-position-select">
              {/* 位置选项 */}
            </Select>
          </div>
        </div>
        
        {/* 技能评分 - 简化布局 */}
        <div className="space-y-4">
          <h3 className="font-semibold">能力评分 (1-99)</h3>
          {/* 技能滑块 */}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={onSubmit} data-testid="submit-player-button">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Phase 5: Player Card 重新设计 (15 分钟)
简化 `src/components/PlayerCard.tsx`:

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";

interface PlayerCardProps {
  player: Player;
  onDelete: (id: string) => void;
}

export function PlayerCard({ player, onDelete }: PlayerCardProps) {
  return (
    <Card 
      className="hover:shadow-lg transition-shadow"
      data-testid="player-card"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {player.name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{player.name}</CardTitle>
              <Badge variant="secondary" className="mt-1">
                {POSITION_DETAILS[player.position].name}
              </Badge>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onDelete(player.id)}
            data-testid={`delete-player-${player.id}`}
          >
            ×
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* KPI */}
        <div className="flex items-center justify-center mb-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">
              {player.skills.overall}
            </div>
            <div className="text-xs text-muted-foreground">总体能力</div>
          </div>
        </div>
        
        {/* 技能条 */}
        <div className="space-y-2">
          <SkillBar label="投篮" value={Math.round((player.skills.twoPointShot + player.skills.threePointShot + player.skills.freeThrow) / 3)} />
          <SkillBar label="组织" value={Math.round((player.skills.passing + player.skills.ballControl + player.skills.courtVision) / 3)} />
          <SkillBar label="防守" value={Math.round((player.skills.perimeterDefense + player.skills.interiorDefense) / 2)} />
          <SkillBar label="篮板" value={Math.round((player.skills.offensiveRebound + player.skills.defensiveRebound) / 2)} />
        </div>
      </CardContent>
    </Card>
  );
}

// 简单的技能条组件
function SkillBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full"
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="font-medium w-8">{value}</span>
      </div>
    </div>
  );
}
```

### Phase 6: 清理和测试 (10 分钟)

1. 删除旧的 inline form 代码
2. 确保 App.css 只保留必要的样式
3. 运行 `npm run build` 确保没有错误
4. 运行 `npm run dev` 启动开发服务器

### 关键 data-testid 属性

确保添加以下测试 ID:
- `shell-bar` - 顶部导航栏
- `search-input` - 搜索输入框
- `add-player-button` - 添加球员按钮
- `player-form-dialog` - 表单弹窗
- `player-grid` - 球员网格容器
- `player-card` - 球员卡片（每个）
- `submit-player-button` - 提交按钮

## 完成标准
- ✅ 所有新组件创建完成
- ✅ Shell Bar 固定在顶部
- ✅ 球员卡片使用网格布局
- ✅ 表单改为 Dialog 弹窗
- ✅ `npm run build` 成功
- ✅ `npm run dev` 正常启动
- ✅ 所有 data-testid 已添加
- ✅ 功能逻辑完全保持不变

## 注意事项
- **不要修改任何业务逻辑**
- **保持 Supabase 相关代码不变**
- **保留所有现有功能**
- **只改布局和样式**

## 完成后
在项目根目录创建 `sap-fiori-status.json`:
```json
{
  "phase1_components_installed": true,
  "phase2_css_updated": true,
  "phase3_shellbar_created": true,
  "phase4_app_restructured": true,
  "phase5_playercard_redesigned": true,
  "phase6_cleaned": true,
  "dev_server_started": true,
  "build_passed": true,
  "ready_for_testing": true
}
```
