import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5174';
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
      console.log('  ✅ Shell Bar 存在:', text?.substring(0, 50));
    } else {
      results.errors.push('Shell Bar 不存在');
      console.log('  ❌ Shell Bar 不存在');
    }
    
    // 2. 验证 Player Grid
    console.log('\n📋 验证 Player Grid...');
    const grid = await page.$('[data-testid="player-grid"]');
    if (grid) {
      results.player_grid = true;
      console.log('  ✅ Player Grid 存在');
    } else {
      results.errors.push('Player Grid 不存在');
      console.log('  ❌ Player Grid 不存在');
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
          results.player_data.sample.push(text?.substring(0, 100));
        }
      }
    } catch (e) {
      results.errors.push('Player Cards 验证超时');
      console.log('  ⚠️  Player Cards 未找到');
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
        console.log('  ❌ Dialog 打开失败');
      }
    } else {
      console.log('  ⚠️  Add Player Button 不存在');
    }
    
    // 5. 评估结果
    const passed = 
      results.shell_bar &&
      results.player_grid &&
      results.player_cards_count > 0 &&
      results.dialog_opens;
    
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
