import puppeteer from 'puppeteer';
import fs from 'fs';

const PRODUCTION_URL = 'https://julius19910613.github.io/player-grouping/';

async function verifyMobileMenu() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // 设置为移动端视口
  await page.setViewport({ width: 375, height: 667 });
  
  const results = {
    timestamp: new Date().toISOString(),
    phase: 'Mobile Menu Validation',
    url: PRODUCTION_URL,
    mobile_viewport: '375x667',
    player_card_menu_visible: false,
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
    
    // 1. 验证 Player Cards
    console.log('\n📋 验证 Player Cards...');
    const playerCards = await page.$$('[data-testid="player-card"]');
    console.log(`  ✅ 找到 ${playerCards.length} 个 Player Cards`);
    
    // 2. 检查三个点图标是否可见
    console.log('\n📋 检查移动端三个点图标...');
    const menuButtons = await page.$$('[data-testid^="player-card-menu-"]');
    
    if (menuButtons.length > 0) {
      console.log(`  ✅ 找到 ${menuButtons.length} 个三个点图标`);
      // 检查第一个按钮的可见性
      const firstButton = menuButtons[0];
      const isVisible = await firstButton.evaluate(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.opacity !== '0' && 
               style.visibility !== 'hidden' && 
               rect.width > 0 && 
               rect.height > 0;
      });
      
      if (isVisible) {
        results.player_card_menu_visible = true;
        console.log('  ✅ 移动端三个点图标可见！');
      } else {
        console.log('  ❌ 三个点图标存在但不可见');
      }
    } else {
      console.log('  ❌ 未找到三个点图标');
    }
    
    // 3. 截图
    await page.screenshot({ 
      path: 'mobile-menu-verification.png', 
      fullPage: true 
    });
    console.log('\n📸 移动端截图已保存: mobile-menu-verification.png');
    
    // 4. 评估
    results.all_passed = results.player_card_menu_visible;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 移动端验证结果:');
    console.log('  Viewport: 375x667 (Mobile)');
    console.log('  Player Cards:', playerCards.length);
    console.log('  三个点图标:', results.player_card_menu_visible ? '✅ 可见' : '❌ 不可见');
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
  fs.writeFileSync('mobile-menu-test.json', JSON.stringify(results, null, 2));
  return results;
}

verifyMobileMenu().then(r => process.exit(r.all_passed ? 0 : 1));
