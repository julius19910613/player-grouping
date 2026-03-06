# SAP Fiori 风格 - 测试任务（含线上 DOM 验证）

## 项目路径
/Users/ppt/Projects/player-grouping

## 背景
开发 subagent 已完成 SAP Fiori 风格改造，现在需要验证功能完整性和 UI 改造效果。

## 前置条件检查
1. 检查 `sap-fiori-status.json` 是否存在且 `ready_for_testing: true`
2. 如果不存在，等待开发完成
3. 启动开发服务器: `npm run dev` (端口应该是 5173 或 5174)

## 你的任务

### Phase 1: 本地 DOM 验证 (15 分钟)

#### 1.1 安装 Puppeteer
```bash
npm install -D puppeteer
```

#### 1.2 创建验证脚本
更新 `scripts/verify-ui-dom.mjs`:

```javascript
import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE_URL = 'http://localhost:5173';  // 或 5174
const PAGE_PATH = '/player-grouping/';

async function verify() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  const results = {
    timestamp: new Date().toISOString(),
    phase: 'Local DOM Validation',
    shell_bar: false,
    player_grid: false,
    player_cards_count: 0,
    player_data: {
      loaded: false,
      sample: []
    },
    dialog_opens: false,
    console_errors: 0,
    all_passed: false,
    errors: []
  };

  try {
    console.log('🌐 访问本地页面:', BASE_URL + PAGE_PATH);
    await page.goto(BASE_URL + PAGE_PATH, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 1. 验证 Shell Bar
    console.log('\n📋 验证 Shell Bar...');
    const shellBar = await page.$('[data-testid="shell-bar"]');
    if (shellBar) {
      results.shell_bar = true;
      const text = await shellBar.evaluate(el => el.textContent);
      console.log('  ✅ Shell Bar 存在:', text);
    } else {
      results.errors.push('Shell Bar 不存在');
    }
    
    // 2. 验证 Player Grid
    console.log('\n📋 验证 Player Grid...');
    const grid = await page.$('[data-testid="player-grid"]');
    if (grid) {
      results.player_grid = true;
      console.log('  ✅ Player Grid 存在');
    } else {
      results.errors.push('Player Grid 不存在');
    }
    
    // 3. 验证 Player Cards
    console.log('\n📋 验证 Player Cards...');
    await page.waitForSelector('[data-testid="player-card"]', { timeout: 10000 });
    const cards = await page.$$('[data-testid="player-card"]');
    results.player_cards_count = cards.length;
    console.log(`  ✅ 找到 ${cards.length} 个 Player Cards`);
    
    if (cards.length > 0) {
      results.player_data.loaded = true;
      for (let i = 0; i < Math.min(3, cards.length); i++) {
        const text = await cards[i].evaluate(el => el.textContent);
        results.player_data.sample.push(text);
      }
    }
    
    // 4. 验证 Dialog 打开
    console.log('\n📋 验证 Dialog...');
    const addButton = await page.$('[data-testid="add-player-button"]');
    if (addButton) {
      await addButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const dialog = await page.$('[data-testid="player-form-dialog"]');
      if (dialog) {
        results.dialog_opens = true;
        console.log('  ✅ Dialog 可以打开');
        
        // 关闭 Dialog
        const closeButton = await page.$('[role="dialog"] button[aria-label="Close"]');
        if (closeButton) {
          await closeButton.click();
        }
      } else {
        results.errors.push('Dialog 打开失败');
      }
    }
    
    // 5. 评估结果
    const passed = 
      results.shell_bar &&
      results.player_grid &&
      results.player_cards_count > 0 &&
      results.dialog_opens &&
      consoleErrors.length === 0;
    
    results.all_passed = passed;
    results.console_errors = consoleErrors.length;
    
    // 6. 截图
    await page.screenshot({ 
      path: 'sap-fiori-local.png', 
      fullPage: true 
    });
    console.log('\n📸 截图已保存: sap-fiori-local.png');
    
    // 7. 输出结果
    console.log('\n' + '='.repeat(60));
    console.log('📊 本地验证结果:');
    console.log('  Shell Bar:', results.shell_bar ? '✅' : '❌');
    console.log('  Player Grid:', results.player_grid ? '✅' : '❌');
    console.log('  Player Cards:', results.player_cards_count);
    console.log('  Dialog:', results.dialog_opens ? '✅' : '❌');
    console.log('  Console Errors:', results.console_errors);
    console.log('  总体:', passed ? '✅ 通过' : '❌ 失败');
    console.log('='.repeat(60));
    
  } catch (error) {
    results.errors.push(error.message);
    console.error('❌ 错误:', error.message);
  } finally {
    await browser.close();
  }
  
  fs.writeFileSync('sap-fiori-local-test.json', JSON.stringify(results, null, 2));
  return results;
}

verify().then(r => process.exit(r.all_passed ? 0 : 1));
```

#### 1.3 运行本地验证
```bash
node scripts/verify-ui-dom.mjs
```

### Phase 2: 线上 DOM 验证 (20 分钟) ⭐

这是关键步骤！需要验证部署到生产环境后的 UI。

#### 2.1 推送代码到 GitHub
```bash
git add -A
git commit -m "feat: SAP Fiori 风格改造完成"
git push origin main
```

#### 2.2 等待部署
- 如果使用 Vercel/Netlify 等，等待自动部署完成
- 获取线上 URL（例如: https://your-app.vercel.app）

#### 2.3 创建线上验证脚本
创建 `scripts/verify-production.mjs`:

```javascript
import puppeteer from 'puppeteer';
import fs from 'fs';

// 🔥 替换为你的线上 URL
const PRODUCTION_URL = 'https://your-app.vercel.app';  // 或其他线上地址

async function verifyProduction() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  const results = {
    timestamp: new Date().toISOString(),
    phase: 'Production DOM Validation',
    url: PRODUCTION_URL,
    shell_bar: false,
    player_grid: false,
    player_cards_count: 0,
    player_data: {
      loaded: false,
      sample: []
    },
    console_errors: 0,
    network_errors: [],
    all_passed: false,
    errors: [],
    performance: {
      load_time_ms: 0,
      dom_content_loaded_ms: 0
    }
  };

  try {
    console.log('🌐 访问线上环境:', PRODUCTION_URL);
    
    const startTime = Date.now();
    await page.goto(PRODUCTION_URL, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    const loadTime = Date.now() - startTime;
    results.performance.load_time_ms = loadTime;
    
    console.log(`  ⏱️  页面加载时间: ${loadTime}ms`);
    
    // 监听 console 错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('  ❌ Console Error:', msg.text());
      }
    });
    
    // 监听网络错误
    page.on('requestfailed', request => {
      results.network_errors.push({
        url: request.url(),
        failure: request.failure().errorText
      });
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 1. 验证 Shell Bar
    console.log('\n📋 验证 Shell Bar...');
    const shellBar = await page.$('[data-testid="shell-bar"]');
    if (shellBar) {
      results.shell_bar = true;
      const text = await shellBar.evaluate(el => el.textContent);
      console.log('  ✅ Shell Bar 存在');
    } else {
      results.errors.push('线上: Shell Bar 不存在');
      console.log('  ❌ Shell Bar 不存在');
    }
    
    // 2. 验证 Player Grid
    console.log('\n📋 验证 Player Grid...');
    const grid = await page.$('[data-testid="player-grid"]');
    if (grid) {
      results.player_grid = true;
      console.log('  ✅ Player Grid 存在');
    } else {
      results.errors.push('线上: Player Grid 不存在');
    }
    
    // 3. 验证 Player Cards
    console.log('\n📋 验证 Player Cards...');
    try {
      await page.waitForSelector('[data-testid="player-card"]', { timeout: 10000 });
      const cards = await page.$$('[data-testid="player-card"]');
      results.player_cards_count = cards.length;
      console.log(`  ✅ 找到 ${cards.length} 个 Player Cards`);
      
      if (cards.length > 0) {
        results.player_data.loaded = true;
        for (let i = 0; i < Math.min(3, cards.length); i++) {
          const text = await cards[i].evaluate(el => el.textContent);
          results.player_data.sample.push(text);
        }
        console.log(`  ✅ 数据样本:`, results.player_data.sample[0]);
      } else {
        results.errors.push('线上: 没有球员数据');
      }
    } catch (error) {
      results.errors.push(`线上: Player Cards 验证失败 - ${error.message}`);
    }
    
    // 4. 验证背景色（Fiori 风格）
    console.log('\n📋 验证 Fiori 背景...');
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    console.log(`  背景色: ${bgColor}`);
    
    // 5. 验证响应式布局
    console.log('\n📋 验证响应式布局...');
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1440, height: 900 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const cards = await page.$$('[data-testid="player-card"]');
      console.log(`  ${viewport.name} (${viewport.width}x${viewport.height}): ${cards.length} cards visible`);
    }
    
    // 6. 截图
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ 
      path: 'sap-fiori-production.png', 
      fullPage: true 
    });
    console.log('\n📸 线上截图已保存: sap-fiori-production.png');
    
    // 7. 评估结果
    const passed = 
      results.shell_bar &&
      results.player_grid &&
      results.player_cards_count > 0 &&
      results.network_errors.length === 0;
    
    results.all_passed = passed;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 线上验证结果:');
    console.log('  URL:', PRODUCTION_URL);
    console.log('  Shell Bar:', results.shell_bar ? '✅' : '❌');
    console.log('  Player Grid:', results.player_grid ? '✅' : '❌');
    console.log('  Player Cards:', results.player_cards_count);
    console.log('  Network Errors:', results.network_errors.length);
    console.log('  Load Time:', `${results.performance.load_time_ms}ms`);
    console.log('  总体:', passed ? '✅ 通过' : '❌ 失败');
    console.log('='.repeat(60));
    
  } catch (error) {
    results.errors.push(`线上验证错误: ${error.message}`);
    console.error('❌ 线上验证失败:', error.message);
  } finally {
    await browser.close();
  }
  
  fs.writeFileSync('sap-fiori-production-test.json', JSON.stringify(results, null, 2));
  return results;
}

verifyProduction().then(r => process.exit(r.all_passed ? 0 : 1));
```

#### 2.4 运行线上验证
```bash
node scripts/verify-production.mjs
```

### Phase 3: 对比报告 (10 分钟)

创建 `scripts/compare-results.mjs`:

```javascript
import fs from 'fs';

const local = JSON.parse(fs.readFileSync('sap-fiori-local-test.json', 'utf8'));
const production = JSON.parse(fs.readFileSync('sap-fiori-production-test.json', 'utf8'));

console.log('\n' + '='.repeat(60));
console.log('📊 本地 vs 线上 对比报告');
console.log('='.repeat(60));

console.log('\n┌────────────────────┬────────┬────────┐');
console.log('│ 验证项             │ 本地   │ 线上   │');
console.log('├────────────────────┼────────┼────────┤');
console.log(`│ Shell Bar          │ ${local.shell_bar ? '✅' : '❌'}     │ ${production.shell_bar ? '✅' : '❌'}     │`);
console.log(`│ Player Grid        │ ${local.player_grid ? '✅' : '❌'}     │ ${production.player_grid ? '✅' : '❌'}     │`);
console.log(`│ Player Cards       │ ${local.player_cards_count}      │ ${production.player_cards_count}      │`);
console.log(`│ Console Errors     │ ${local.console_errors}      │ ${production.console_errors}      │`);
console.log(`│ 总体结果           │ ${local.all_passed ? '✅' : '❌'}     │ ${production.all_passed ? '✅' : '❌'}     │`);
console.log('└────────────────────┴────────┴────────┘');

// 保存最终报告
const finalReport = {
  timestamp: new Date().toISOString(),
  local: local,
  production: production,
  comparison: {
    shell_bar_match: local.shell_bar === production.shell_bar,
    player_grid_match: local.player_grid === production.player_grid,
    cards_count_match: local.player_cards_count === production.player_cards_count,
    both_passed: local.all_passed && production.all_passed
  }
};

fs.writeFileSync('sap-fiori-final-report.json', JSON.stringify(finalReport, null, 2));
console.log('\n📄 最终报告已保存: sap-fiori-final-report.json');
```

## 完成标准

### 本地验证
- [ ] Shell Bar 正确显示
- [ ] Player Grid 布局正常
- [ ] Player Cards 数量 > 0
- [ ] Dialog 可以打开
- [ ] Console 无错误
- [ ] 截图已保存

### 线上验证 ⭐
- [ ] 代码已推送到 GitHub
- [ ] 生产环境可访问
- [ ] Shell Bar 存在
- [ ] Player Cards 数据正确渲染
- [ ] 响应式布局正常
- [ ] 无网络错误
- [ ] 截图已保存

### 对比报告
- [ ] 本地与线上结果一致
- [ ] 最终报告已生成

## 完成后

创建 `sap-fiori-test-status.json`:
```json
{
  "local_validation": {
    "passed": true,
    "player_cards_count": 19
  },
  "production_validation": {
    "passed": true,
    "url": "https://your-app.vercel.app",
    "player_cards_count": 19,
    "load_time_ms": 2340
  },
  "comparison": {
    "shell_bar_match": true,
    "player_grid_match": true,
    "cards_count_match": true,
    "both_passed": true
  },
  "all_tests_passed": true
}
```

## 重要提示

1. **线上验证是关键** - 必须验证生产环境的 DOM
2. **数据一致性** - 本地和线上的球员数量应该一致
3. **性能指标** - 记录线上加载时间
4. **响应式** - 验证移动端/平板/桌面端布局

## 如果失败

1. 检查 `sap-fiori-status.json` 确认开发完成
2. 检查开发服务器是否启动
3. 检查线上 URL 是否正确
4. 查看详细错误信息
5. 保存所有截图用于调试
