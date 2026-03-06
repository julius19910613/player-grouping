import puppeteer from 'puppeteer';
import fs from 'fs';

const PRODUCTION_URL = 'https://julius19910613.github.io/player-grouping/';

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
    data_management_menu: false,
    player_card_menu: false,
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
    
    // 清除缓存
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCache');
    
    const startTime = Date.now();
    await page.goto(PRODUCTION_URL, { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    const loadTime = Date.now() - startTime;
    results.performance.load_time_ms = loadTime;
    
    console.log(`  ⏱️  页面加载时间: ${loadTime}ms`);
    
    // 监听 console 错误
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('  ❌ Console Error:', msg.text()?.substring(0, 100));
      }
    });
    
    // 监听网络错误
    page.on('requestfailed', request => {
      results.network_errors.push({
        url: request.url(),
        failure: request.failure()?.errorText
      });
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 1. 验证 Shell Bar
    console.log('\n📋 验证 Shell Bar...');
    const shellBar = await page.$('[data-testid="shell-bar"]');
    if (shellBar) {
      results.shell_bar = true;
      const text = await shellBar.evaluate(el => el.textContent);
      console.log('  ✅ Shell Bar 存在:', text?.substring(0, 50));
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
      console.log('  ❌ Player Grid 不存在');
    }
    
    // 3. 验证 Player Cards
    console.log('\n📋 验证 Player Cards...');
    try {
      await page.waitForSelector('[data-testid="player-card"]', { timeout: 15000 });
      const cards = await page.$$('[data-testid="player-card"]');
      results.player_cards_count = cards.length;
      console.log(`  ✅ 找到 ${cards.length} 个 Player Cards`);
      
      if (cards.length > 0) {
        results.player_data.loaded = true;
        for (let i = 0; i < Math.min(3, cards.length); i++) {
          const text = await cards[i].evaluate(el => el.textContent);
          results.player_data.sample.push(text?.substring(0, 100));
        }
        console.log(`  ✅ 数据样本:`, results.player_data.sample[0]?.substring(0, 50));
      } else {
        results.errors.push('线上: 没有球员数据');
      }
    } catch (error) {
      results.errors.push(`线上: Player Cards 验证失败 - ${error.message}`);
      console.log('  ❌ Player Cards 验证失败:', error.message);
    }
    
    // 4. 验证数据管理菜单
    console.log('\n📋 验证数据管理菜单...');
    const dataMenu = await page.$('[data-testid="data-management-menu"]');
    if (dataMenu) {
      results.data_management_menu = true;
      console.log('  ✅ 数据管理菜单存在');
    } else {
      results.errors.push('线上: 数据管理菜单不存在');
      console.log('  ⚠️  数据管理菜单不存在');
    }
    
    // 5. 验证 Player Card 操作菜单（第一个卡片）
    if (results.player_cards_count > 0) {
      console.log('\n📋 验证 Player Card 操作菜单...');
      const playerCard = await page.$('[data-testid="player-card"]');
      if (playerCard) {
        // 模拟 hover
        await playerCard.evaluate(el => {
          el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const menuButton = await page.$('[data-testid="player-card-menu"]');
        if (menuButton) {
          results.player_card_menu = true;
          console.log('  ✅ Player Card 操作菜单存在');
        } else {
          console.log('  ⚠️  Player Card 操作菜单未找到（可能需要更长的渲染时间）');
        }
      }
    }
    
    // 6. 验证背景色（Fiori 风格）
    console.log('\n📋 验证 Fiori 背景...');
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    console.log(`  背景色: ${bgColor}`);
    
    // 7. 验证响应式布局
    console.log('\n📋 验证响应式布局...');
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1440, height: 900 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewport({ width: viewport.width, height: viewport.height });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const cards = await page.$$('[data-testid="player-card"]');
      console.log(`  ${viewport.name} (${viewport.width}x${viewport.height}): ${cards.length} cards visible`);
    }
    
    // 8. 截图
    await page.setViewport({ width: 1440, height: 900 });
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
      results.data_management_menu &&
      results.network_errors.length === 0;
    
    results.all_passed = passed;
    results.console_errors = consoleErrors.length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 线上验证结果:');
    console.log('  URL:', PRODUCTION_URL);
    console.log('  Shell Bar:', results.shell_bar ? '✅' : '❌');
    console.log('  Player Grid:', results.player_grid ? '✅' : '❌');
    console.log('  Player Cards:', results.player_cards_count);
    console.log('  数据管理菜单:', results.data_management_menu ? '✅' : '❌');
    console.log('  Player Card 菜单:', results.player_card_menu ? '✅' : '❌');
    console.log('  Console Errors:', results.console_errors);
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
