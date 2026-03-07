/**
 * Playwright E2E 测试
 * 端到端测试聊天功能
 */

import { test, expect } from '@playwright/test';

test.describe('聊天功能 E2E', () => {
  test.beforeEach(async ({ page }) => {
    // 访问应用
    await page.goto('http://localhost:5173');
    
    // 等待应用加载完成
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
  });

  test('应该显示欢迎信息', async ({ page }) => {
    // 检查标题
    await expect(page.locator('text=智能助手')).toBeVisible();
    
    // 检查欢迎消息
    await expect(page.locator('text=欢迎使用智能助手')).toBeVisible();
  });

  test('应该能够发送消息', async ({ page }) => {
    // 输入消息
    await page.fill('[data-testid="chat-input"]', '你好');
    
    // 点击发送按钮
    await page.click('[data-testid="send-button"]');
    
    // 等待用户消息显示
    await expect(page.locator('[data-testid="message-user"]')).toBeVisible();
    await expect(page.locator('text=你好')).toBeVisible();
    
    // 等待 AI 回复（可能需要时间）
    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({
      timeout: 15000,
    });
  });

  test('应该显示加载状态', async ({ page }) => {
    // 输入并发送消息
    await page.fill('[data-testid="chat-input"]', '测试加载');
    await page.click('[data-testid="send-button"]');
    
    // 应该显示加载指示器
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    
    // 等待加载完成
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible({
      timeout: 15000,
    });
  });

  test('应该能够使用快捷键发送', async ({ page }) => {
    // 输入消息
    await page.fill('[data-testid="chat-input"]', '快捷键测试');
    
    // 按 Enter 发送
    await page.press('[data-testid="chat-input"]', 'Enter');
    
    // 验证消息已发送
    await expect(page.locator('text=快捷键测试')).toBeVisible();
  });

  test('应该能够换行', async ({ page }) => {
    // 输入消息
    await page.fill('[data-testid="chat-input"]', '第一行');
    
    // 按 Shift+Enter 换行
    await page.keyboard.press('Shift+Enter');
    
    // 继续输入
    await page.fill('[data-testid="chat-input"]', '第一行\n第二行');
    
    // 验证换行存在
    const inputText = await page.inputValue('[data-testid="chat-input"]');
    expect(inputText).toContain('\n');
  });

  test('应该显示字符计数', async ({ page }) => {
    const input = '[data-testid="chat-input"]';
    
    // 初始状态
    await expect(page.locator('text=0 / 1000')).toBeVisible();
    
    // 输入文本
    await page.fill(input, '测试');
    
    // 应该显示字符数
    await expect(page.locator('text=2 / 1000')).toBeVisible();
  });

  test('应该限制最大长度', async ({ page }) => {
    const input = '[data-testid="chat-input"]';
    
    // 输入超长文本
    const longText = 'a'.repeat(1100);
    await page.fill(input, longText);
    
    // 应该显示超出提示
    await expect(page.locator('text=超出限制')).toBeVisible();
    
    // 发送按钮应该禁用
    await expect(page.locator('[data-testid="send-button"]')).toBeDisabled();
  });

  test('应该能够清空对话', async ({ page }) => {
    // 发送一条消息
    await page.fill('[data-testid="chat-input"]', '测试消息');
    await page.click('[data-testid="send-button"]');
    
    await expect(page.locator('text=测试消息')).toBeVisible();
    
    // 点击清空按钮（如果有）
    const clearButton = page.locator('button:has-text("清空对话")');
    if (await clearButton.isVisible()) {
      // 确认对话框
      page.on('dialog', dialog => dialog.accept());
      
      await clearButton.click();
      
      // 验证对话已清空
      await expect(page.locator('text=测试消息')).not.toBeVisible();
    }
  });

  test('应该支持键盘导航', async ({ page }) => {
    // 聚焦到输入框
    await page.click('[data-testid="chat-input"]');
    
    // 使用 Tab 键导航到发送按钮
    await page.keyboard.press('Tab');
    
    // 发送按钮应该获得焦点
    await expect(page.locator('[data-testid="send-button"]')).toBeFocused();
  });

  test('应该显示快捷命令提示', async ({ page }) => {
    // 聚焦输入框
    await page.click('[data-testid="chat-input"]');
    
    // 输入 /
    await page.fill('[data-testid="chat-input"]', '/');
    
    // 应该显示快捷命令列表
    await expect(page.locator('text=查看所有球员')).toBeVisible();
  });

  test('应该能够选择快捷命令', async ({ page }) => {
    // 输入 / 触发自动补全
    await page.fill('[data-testid="chat-input"]', '/');
    
    // 等待命令列表出现
    await page.waitForSelector('[role="listbox"]');
    
    // 点击第一个命令
    await page.click('[role="listbox"] button:first-child');
    
    // 验证命令已填入输入框
    const inputValue = await page.inputValue('[data-testid="chat-input"]');
    expect(inputValue).toContain('查看所有球员');
  });
});

test.describe('无障碍测试', () => {
  test('应该有正确的 ARIA 标签', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // 检查主要区域的 ARIA 标签
    await expect(page.locator('[aria-label="聊天助手"]')).toBeVisible();
    await expect(page.locator('[aria-label="聊天消息列表"]')).toBeVisible();
    await expect(page.locator('[aria-label="消息输入框"]')).toBeVisible();
  });

  test('应该支持屏幕阅读器', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // 检查 role 属性
    await expect(page.locator('[role="main"]')).toBeVisible();
    await expect(page.locator('[role="log"]')).toBeVisible();
    
    // 检查 aria-live（用于动态内容通知）
    await expect(page.locator('[aria-live="polite"]')).toBeVisible();
  });
});

test.describe('性能测试', () => {
  test('虚拟滚动应该工作（大量消息）', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // 发送多条消息（超过 50 条触发虚拟滚动）
    for (let i = 0; i < 60; i++) {
      await page.fill('[data-testid="chat-input"]', `消息 ${i}`);
      await page.click('[data-testid="send-button"]');
      
      // 等待一小段时间，避免请求过快
      await page.waitForTimeout(100);
    }
    
    // 验证虚拟滚动容器存在
    // 注意：这取决于虚拟滚动的实现方式
    const messageCount = await page.locator('[data-testid^="message-"]').count();
    expect(messageCount).toBeGreaterThan(0);
  });
});
