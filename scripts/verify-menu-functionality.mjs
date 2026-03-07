import puppeteer from 'puppeteer';
import fs from 'fs';

const PRODUCTION_URL = 'https://julius19910613.github.io/player-grouping/';

async function verifyMenuFunctionality() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // 设置为移动端视口
  await page.setViewport({ width: 375, height: 667 });
  
  const results = {
    timestamp: new Date().toISOString(),
    phase: 'Menu Functionality Test',
    url: PRODUCTION_URL,
    mobile_viewport: '375x667',
    menu_opens: false,
    detail_dialog_opens: false,
    console_errors: [],
    all_passed: false
  };

  try {
    console.log('🌐 访问线上环境 (Mobile):', PRODUCTION_URL);
    await page.goto(PRODUCTION_URL, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // 监听 console 错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        results.console_errors.push(msg.text());
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 1. 找到第一个球员卡片的菜单按钮
    console.log('\n📋 查找菜单按钮...');
    const menuButton = await page.$('[data-testid^="player-card-menu-"]');
    
    if (menuButton) {
      console.log('  ✅ 找到菜单按钮');
      
      // 2. 点击菜单按钮
      await menuButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      results.menu_opens = true;
      console.log('  ✅ 菜单已打开');
      
      // 3. 点击"查看详情"
      console.log('\n📋 点击查看详情...');
      const detailButton = await page.$('text=查看详情');
      if (detailButton) {
        await detailButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 4. 检查 Dialog 是否打开
        const dialog = await page.$('[data-testid="player-detail-dialog"]');
        if (dialog) {
          results.detail_dialog_opens = true;
          console.log('  ✅ 详情页 Dialog 已打开');
        } else {
          console.log('  ❌ 详情页 Dialog 未打开');
        }
      } else {
        console.log('  ❌ 未找到"查看详情"按钮');
      }
    } else {
      console.log('  ❌ 未找到菜单按钮');
    }
    
    // 5. 截图
    await page.screenshot({ 
      path: 'menu-functionality-test.png', 
      fullPage: true 
    });
    console.log('\n📸 截图已保存: menu-functionality-test.png');
    
    // 6. 评估
    results.all_passed = results.menu_opens && results.detail_dialog_opens;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 功能验证结果:');
    console.log('  菜单打开:', results.menu_opens ? '✅' : '❌');
    console.log('  详情页打开:', results.detail_dialog_opens ? '✅' : '❌');
    console.log('  Console Errors:', results.console_errors.length);
    console.log('  总体:', results.all_passed ? '✅ 通过' : '❌ 失败');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    results.error = error.message;
  } finally {
    await browser.close();
  }
  
  // 保存报告
  fs.writeFileSync('menu-functionality-test.json', JSON.stringify(results, null, 2));
  return results;
}

verifyMenuFunctionality().then(r => process.exit(r.all_passed ? 0 : 1));
