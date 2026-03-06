# SAP Fiori 风格 UI 改造方案

## 目标
将当前的球员分组工具改造为符合 SAP Fiori 设计规范的现代化界面

## SAP Fiori 设计规范 (2026)

### 1. 色彩系统
```css
/* SAP Official Colors */
--sapPrimaryBlue: #0A6ED1;
--sapLightBlue: #00B7F0;
--sapDarkBlue: #085394;
--sapSuccess: #4DB14B;
--sapWarning: #E76500;
--sapError: #BB0000;
--sapNeutral: #6A6D70;
--sapBackground: #FAFAFA;
--sapWhite: #FFFFFF;
```

### 2. 布局结构

#### 2.1 Shell Bar (顶部导航栏)
- 高度: 48px
- 背景: SAP Blue (#0A6ED1)
- 内容: Logo + 标题 + 用户头像
- 阴影: elevation-2 (0 2px 4px rgba(0,0,0,0.1))

#### 2.2 Page Layout (页面布局)
- 最大宽度: 1440px
- 内边距: 32px
- 背景: SAP Background (#FAFAFA)
- 卡片间距: 16px

#### 2.3 Card System (卡片系统)
- 背景: White (#FFFFFF)
- 圆角: 8px
- 阴影: elevation-1 (0 1px 2px rgba(0,0,0,0.08))
- 内边距: 16px

### 3. 响应式断点

| 设备 | 断点 | 列数 |
|------|------|------|
| 手机 | < 600px | 1 列 |
| 平板 | 600-1024px | 2 列 |
| 桌面 | 1024-1440px | 3 列 |
| 大屏 | > 1440px | 4-5 列 |

### 4. Typography (字体)

```css
/* SAP 72 Font Stack */
font-family: "72", "72full", Arial, Helvetica, sans-serif;

/* Heading Sizes */
--sapFontSizeH1: 2.25rem;  /* 36px */
--sapFontSizeH2: 1.5rem;   /* 24px */
--sapFontSizeH3: 1.125rem; /* 18px */

/* Body Sizes */
--sapFontSize: 0.875rem;   /* 14px */
--sapFontSizeSmall: 0.75rem; /* 12px */
```

### 5. Spacing System (基于 8px)

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
--spacing-2xl: 48px;
```

## 具体改造内容

### Phase 1: Shell Bar 重构

**当前状态**: 简单的 header 标题
**改造后**: Fiori Shell Bar 风格

```tsx
// 新增 ShellBar 组件
<div className="h-12 bg-primary flex items-center px-4 shadow-md fixed top-0 w-full z-50">
  <div className="flex items-center gap-3">
    <span className="text-2xl">🏀</span>
    <h1 className="text-white font-semibold text-lg">篮球球员分组系统</h1>
  </div>
  <div className="ml-auto flex items-center gap-4">
    <Button variant="ghost" className="text-white">帮助</Button>
    <Avatar fallback="J" />
  </div>
</div>
```

### Phase 2: Overview Page Layout

**当前状态**: 纵向堆叠的 sections
**改造后**: Fiori Overview Page + Cards Grid

```tsx
// 页面结构
<div className="min-h-screen bg-sap-background pt-12">
  {/* Shell Bar 占位 */}
  
  {/* Main Content */}
  <main className="max-w-7xl mx-auto px-4 py-6">
    {/* Quick Actions Bar */}
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <Input placeholder="搜索球员..." className="w-64" />
        <Select>...</Select>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline">导入</Button>
        <Button variant="outline">导出</Button>
        <Button>添加球员</Button>
      </div>
    </div>
    
    {/* Cards Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* Player Cards */}
    </div>
  </main>
</div>
```

### Phase 3: Player Card 重新设计

**当前状态**: 复杂的卡片布局
**改造后**: Fiori Object Card 风格

```tsx
// Object Card 结构
<Card className="hover:shadow-lg transition-shadow">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <div className="flex items-center gap-3">
      <Avatar fallback={player.name[0]} className="w-12 h-12" />
      <div>
        <CardTitle className="text-base">{player.name}</CardTitle>
        <Badge variant="secondary">{position}</Badge>
      </div>
    </div>
    <Button variant="ghost" size="icon">×</Button>
  </CardHeader>
  
  <CardContent>
    {/* KPI 区域 */}
    <div className="flex items-center justify-between mb-3">
      <div className="text-center">
        <div className="text-2xl font-bold text-primary">{overall}</div>
        <div className="text-xs text-muted-foreground">总体能力</div>
      </div>
    </div>
    
    {/* 技能条 */}
    <div className="space-y-2">
      <SkillBar label="投篮" value={shooting} />
      <SkillBar label="组织" value={playmaking} />
      <SkillBar label="防守" value={defense} />
    </div>
  </CardContent>
  
  <CardFooter className="justify-end gap-2">
    <Button variant="ghost" size="sm">详情</Button>
    <Button variant="outline" size="sm">编辑</Button>
  </CardFooter>
</Card>
```

### Phase 4: 表单重新设计

**当前状态**: 独立的表单区域
**改造后**: Fiori Dialog / Dynamic Page

```tsx
// 使用 Dialog 替代 inline form
<Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>添加球员</DialogTitle>
      <DialogDescription>填写球员信息</DialogDescription>
    </DialogHeader>
    
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>姓名</Label>
        <Input placeholder="输入球员姓名" />
      </div>
      <div>
        <Label>位置</Label>
        <Select>...</Select>
      </div>
    </div>
    
    {/* 技能评分 - 使用 Fiori Rating Indicator */}
    <div className="mt-6">
      <h3 className="font-semibold mb-3">能力评分</h3>
      <div className="grid grid-cols-3 gap-4">
        {skills.map(skill => (
          <div key={skill.key}>
            <Label>{skill.label}</Label>
            <Slider defaultValue={[50]} max={99} />
          </div>
        ))}
      </div>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsFormOpen(false)}>
        取消
      </Button>
      <Button onClick={handleAddPlayer}>保存</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Phase 5: 分组结果展示

**当前状态**: 简单的团队列表
**改造后**: Fiori Analytical Card + Chart

```tsx
// Analytical Card for Team Comparison
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {teams.map(team => (
    <Card key={team.id}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{team.name}</span>
          <Badge>总能力: {team.totalSkill}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Team Avatar List */}
        <AvatarStack players={team.players} />
        
        {/* Radar Chart for Team Skills */}
        <TeamRadarChart team={team} />
      </CardContent>
    </Card>
  ))}
</div>
```

## 新增 shadcn/ui 组件

```bash
# 安装需要的组件
npx shadcn@latest add dialog
npx shadcn@latest add avatar
npx shadcn@latest add progress
npx shadcn@latest add separator
npx shadcn@latest add tabs
npx shadcn@latest add tooltip
```

## CSS 变量更新

```css
/* src/index.css - SAP Fiori Theme */
@theme {
  /* SAP Colors */
  --color-sap-primary: #0A6ED1;
  --color-sap-light: #00B7F0;
  --color-sap-dark: #085394;
  --color-sap-background: #FAFAFA;
  --color-sap-success: #4DB14B;
  --color-sap-warning: #E76500;
  --color-sap-error: #BB0000;
  
  /* Override shadcn variables */
  --color-primary: #0A6ED1;
  --color-primary-foreground: #FFFFFF;
  --color-secondary: #F5F5F5;
  --color-background: #FAFAFA;
  --color-card: #FFFFFF;
  --color-muted: #F5F5F5;
  --color-accent: #00B7F0;
  --color-border: #E5E5E5;
  
  /* SAP Spacing */
  --spacing-base: 8px;
}

/* SAP Fiori Utilities */
.sap-shadow-1 {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.sap-shadow-2 {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.sap-shadow-3 {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
}
```

## 预期效果

### Before (当前)
- 紫色渐变背景
- 纵向堆叠布局
- 复杂的表单区域
- 简单的卡片展示

### After (Fiori 风格)
- SAP Blue + 白色主题
- 响应式网格布局
- Dialog 弹窗表单
- Object Cards + Charts
- Shell Bar 导航
- 更专业的企业级外观

## 实施优先级

| Phase | 内容 | 优先级 | 预计时间 |
|-------|------|--------|----------|
| 1 | Shell Bar + Background | 🔴 High | 15min |
| 2 | Player Card 重新设计 | 🔴 High | 20min |
| 3 | Dialog 表单 | 🟡 Medium | 15min |
| 4 | Grid Layout | 🟡 Medium | 10min |
| 5 | Charts & Analytics | 🟢 Low | 20min |

## 参考资源

- [SAP Fiori Design Guidelines](https://experience.sap.com/fiori-design/)
- [SAP Design System Portal](https://www.sap.com/design-system)
- [SAP Fiori for Web](https://www.sap.com/design-system/fiori-design-web/)
- [SAP Color Palette](https://www.sap.com/design-system/digital/foundations/identity/color/)
