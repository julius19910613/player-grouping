# UI 测试计划 - DOM 验证方案

## 测试目标
验证 UI 改造后功能完整性，使用 DOM 元素验证确保数据正确显示

## 项目路径
/Users/ppt/Projects/player-grouping

## 前置条件
- 开发 subagent 已完成改造
- `ui-redesign-status.json` 存在且 `ready_for_testing: true`
- `npm run dev` 可以正常启动

## 测试方案

### 方案 1: Playwright DOM 验证 (推荐)

安装 Playwright:
```bash
npm install -D @playwright/test
npx playwright install chromium
```

创建测试文件 `tests/ui-dom.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('UI 改造 DOM 验证', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    // 等待页面加载
    await page.waitForLoadState('networkidle');
  });

  test('1. Header 正确渲染', async ({ page }) => {
    const header = page.locator('[data-testid="app-header"]');
    await expect(header).toBeVisible();
    await expect(header).toContainText('篮球球员分组');
  });

  test('2. 球员表单存在', async ({ page }) => {
    const form = page.locator('[data-testid="player-form"]');
    await expect(form).toBeVisible();
    
    // 验证表单元素
    const nameInput = form.locator('input[type="text"]');
    await expect(nameInput).toBeVisible();
    
    const positionSelect = form.locator('select');
    await expect(positionSelect).toBeVisible();
    
    const submitButton = form.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('3. 球员列表渲染', async ({ page }) => {
    const playerList = page.locator('[data-testid="player-list"]');
    await expect(playerList).toBeVisible();
    
    // 等待数据加载
    await page.waitForTimeout(2000);
    
    // 验证球员卡片
    const playerCards = page.locator('[data-testid="player-card"]');
    const count = await playerCards.count();
    
    // 如果有球员数据
    if (count > 0) {
      // 验证第一个卡片包含必要信息
      const firstCard = playerCards.first();
      await expect(firstCard).toBeVisible();
      
      // 验证包含位置徽章
      const badge = firstCard.locator('[data-testid="position-badge"]');
      await expect(badge).toBeVisible();
    }
  });

  test('4. 添加球员功能', async ({ page }) => {
    const form = page.locator('[data-testid="player-form"]');
    
    // 填写表单
    await form.locator('input[type="text"]').fill('测试球员');
    await form.locator('select').selectOption({ index: 0 });
    
    // 提交表单
    await form.locator('button[type="submit"]').click();
    
    // 等待数据更新
    await page.waitForTimeout(1000);
    
    // 验证新球员出现在列表中
    const playerCards = page.locator('[data-testid="player-card"]');
    const lastCard = playerCards.last();
    await expect(lastCard).toContainText('测试球员');
  });

  test('5. 分组功能', async ({ page }) => {
    // 等待球员加载
    await page.waitForTimeout(2000);
    
    const playerCards = page.locator('[data-testid="player-card"]');
    const count = await playerCards.count();
    
    if (count >= 4) {
      // 点击分组按钮
      const groupingButton = page.locator('[data-testid="grouping-button"]');
      await groupingButton.click();
      
      // 等待分组结果
      await page.waitForTimeout(1000);
      
      // 验证分组结果显示
      const teamsGrid = page.locator('[data-testid="teams-grid"]');
      await expect(teamsGrid).toBeVisible();
    }
  });

  test('6. 响应式布局', async ({ page }) => {
    // 测试移动端
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    const header = page.locator('[data-testid="app-header"]');
    await expect(header).toBeVisible();
    
    // 测试平板
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    await expect(header).toBeVisible();
    
    // 测试桌面端
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    
    await expect(header).toBeVisible();
  });
});
```

### 方案 2: Vitest + Testing Library

如果不想用 Playwright，使用 Vitest:

```typescript
// tests/ui-dom.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../src/App';

// Mock Supabase
vi.mock('./repositories', () => ({
  playerRepository: {
    findAll: () => Promise.resolve([
      { id: '1', name: '测试球员1', position: 'PG', skills: { overall: 80 } }
    ]),
    create: (data: any) => Promise.resolve({ id: '2', ...data }),
    delete: () => Promise.resolve(),
  },
}));

describe('UI DOM 验证', () => {
  it('Header 渲染', () => {
    render(<App />);
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
  });

  it('球员表单存在', () => {
    render(<App />);
    expect(screen.getByTestId('player-form')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /添加/i })).toBeInTheDocument();
  });

  it('球员列表渲染数据', async () => {
    render(<App />);
    
    await waitFor(() => {
      const playerList = screen.getByTestId('player-list');
      expect(playerList).toBeInTheDocument();
    });
    
    await waitFor(() => {
      const playerCards = screen.getAllByTestId('player-card');
      expect(playerCards.length).toBeGreaterThan(0);
    });
  });

  it('添加球员', async () => {
    render(<App />);
    
    const nameInput = screen.getByPlaceholderText(/输入球员姓名/i);
    fireEvent.change(nameInput, { target: { value: '新球员' } });
    
    const submitButton = screen.getByRole('button', { name: /添加球员/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('新球员')).toBeInTheDocument();
    });
  });
});
```

## 验证清单

### 功能验证
- [ ] Header 正确显示
- [ ] 球员表单可提交
- [ ] 球员列表渲染数据
- [ ] 添加球员成功
- [ ] 删除球员成功
- [ ] 分组功能正常
- [ ] 导入/导出功能

### UI 验证
- [ ] Tailwind 类名正确应用
- [ ] shadcn/ui 组件渲染正常
- [ ] 响应式布局正常
- [ ] 无样式冲突

### DOM 验证 (关键)
- [ ] `data-testid="app-header"` 存在
- [ ] `data-testid="player-form"` 存在
- [ ] `data-testid="player-list"` 存在
- [ ] `data-testid="player-card"` 存在 (N 个)
- [ ] `data-testid="grouping-button"` 存在
- [ ] 球员数据在 DOM 中正确显示

## 测试执行

### 使用 Playwright (推荐)
```bash
# 启动开发服务器 (后台)
npm run dev &

# 运行测试
npx playwright test tests/ui-dom.spec.ts

# 生成报告
npx playwright show-report
```

### 使用 Vitest
```bash
npm run test tests/ui-dom.test.tsx
```

## 完成标准
- 所有测试通过
- 无 console 错误
- DOM 元素正确渲染数据
- 响应式布局正常

## 完成后
创建 `ui-test-report.json`:
```json
{
  "tests_passed": 6,
  "tests_failed": 0,
  "dom_validation": {
    "header": true,
    "player_form": true,
    "player_list": true,
    "player_cards": true,
    "grouping_button": true
  },
  "responsive_test": {
    "mobile": true,
    "tablet": true,
    "desktop": true
  },
  "ready_for_review": true
}
```
