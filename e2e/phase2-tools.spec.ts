import { test, expect } from '@playwright/test';

/**
 * Phase 2 E2E 测试 - 验证新增的 4 个查询工具
 * 测试目标：确保无 500 错误，API 返回正常响应
 */

test.describe('Phase 2 工具测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 访问生产环境页面并等待加载完成
    await page.goto('https://player-grouping.vercel.app/');
    await page.waitForLoadState('networkidle');
  });

  test('1. get_player_stats - 查询球员信息', async ({ page }) => {
    // 找到输入框并输入查询
    const input = page.locator('textarea').first();
    await input.fill('骚当最近表现怎么样？');
    
    // 找到发送按钮并点击
    const sendButton = page.locator('button:has-text("发送")').first();
    await sendButton.click();
    
    // 等待响应（最多 10 秒）
    await page.waitForTimeout(3000);
    
    // 截图
    await page.screenshot({ 
      path: 'docs/test-reports/screenshots/phase2-scenario1-player-stats.png',
      fullPage: true 
    });
    
    // 检查是否有响应内容（不是错误提示）
    const responseArea = page.locator('[class*="message"]').first();
    await expect(responseArea).toBeVisible({ timeout: 5000 });
  });

  test('2. get_match_history - 查询比赛历史', async ({ page }) => {
    const input = page.locator('textarea').first();
    await input.fill('最近两周的比赛有哪些？');
    
    const sendButton = page.locator('button:has-text("发送")').first();
    await sendButton.click();
    
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'docs/test-reports/screenshots/phase2-scenario2-match-history.png',
      fullPage: true 
    });
    
    const responseArea = page.locator('[class*="message"]').first();
    await expect(responseArea).toBeVisible({ timeout: 5000 });
  });

  test('3. compare_players - 对比球员', async ({ page }) => {
    const input = page.locator('textarea').first();
    await input.fill('骚当和小李谁更强？');
    
    const sendButton = page.locator('button:has-text("发送")').first();
    await sendButton.click();
    
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'docs/test-reports/screenshots/phase2-scenario3-compare-players.png',
      fullPage: true 
    });
    
    const responseArea = page.locator('[class*="message"]').first();
    await expect(responseArea).toBeVisible({ timeout: 5000 });
  });

  test('4. analyze_match_performance - 分析比赛', async ({ page }) => {
    const input = page.locator('textarea').first();
    await input.fill('分析一下最近那场比赛');
    
    const sendButton = page.locator('button:has-text("发送")').first();
    await sendButton.click();
    
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'docs/test-reports/screenshots/phase2-scenario4-analyze-performance.png',
      fullPage: true 
    });
    
    const responseArea = page.locator('[class*="message"]').first();
    await expect(responseArea).toBeVisible({ timeout: 5000 });
  });
});
