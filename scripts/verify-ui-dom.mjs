import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const PAGE_PATH = '/player-grouping/';

async function verify() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // 收集 console 错误
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  const testResults = {
    timestamp: new Date().toISOString(),
    dom_validation: {
      header: false,
      player_form: false,
      player_list: false,
      player_cards_count: 0,
      grouping_button: false
    },
    player_data: {
      loaded: false,
      first_player_name: null,
      sample_data: []
    },
    screenshot: null,
    console_errors: consoleErrors.length,
    console_error_details: consoleErrors,
    all_tests_passed: false,
    errors: []
  };

  try {
    console.log('🌐 访问页面:', BASE_URL + PAGE_PATH);
    await page.goto(BASE_URL + PAGE_PATH, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // 等待一下让 React 渲染
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 1. 验证 Header
    console.log('\n📋 验证 Header...');
    const header = await page.$('[data-testid="app-header"]');
    if (header) {
      testResults.dom_validation.header = true;
      const headerText = await header.evaluate(el => el.textContent);
      console.log('  ✅ Header 存在:', headerText);
    } else {
      console.log('  ❌ Header 不存在');
      testResults.errors.push('Header 元素不存在');
    }
    
    // 2. 验证表单
    console.log('\n📋 验证球员表单...');
    const form = await page.$('[data-testid="player-form"]');
    if (form) {
      testResults.dom_validation.player_form = true;
      console.log('  ✅ 表单存在');
      
      // 检查表单元素
      const nameInput = await form.$('input[type="text"]');
      const submitBtn = await form.$('button[type="submit"]');
      if (nameInput && submitBtn) {
        console.log('  ✅ 表单元素完整');
      } else {
        console.log('  ⚠️  表单元素不完整');
        testResults.errors.push('表单元素不完整');
      }
    } else {
      console.log('  ❌ 表单不存在');
      testResults.errors.push('表单元素不存在');
    }
    
    // 3. 等待球员数据加载（关键！）
    console.log('\n📋 等待球员数据加载...');
    try {
      await page.waitForSelector('[data-testid="player-card"]', { 
        timeout: 10000 
      });
      testResults.player_data.loaded = true;
      console.log('  ✅ 球员卡片开始渲染');
    } catch (error) {
      console.log('  ⚠️  10秒内未检测到球员卡片，可能没有数据');
    }
    
    // 4. 验证球员列表和数据
    console.log('\n📋 验证球员列表...');
    const playerList = await page.$('[data-testid="player-list"]');
    if (playerList) {
      testResults.dom_validation.player_list = true;
      console.log('  ✅ 球员列表容器存在');
    }
    
    // 5. 检查球员卡片数量（最重要！）
    console.log('\n📋 检查球员卡片数量...');
    const cards = await page.$$('[data-testid="player-card"]');
    testResults.dom_validation.player_cards_count = cards.length;
    console.log(`  ✅ 找到 ${cards.length} 个球员卡片`);
    
    if (cards.length > 0) {
      // 获取前几个球员的信息
      for (let i = 0; i < Math.min(5, cards.length); i++) {
        const cardText = await cards[i].evaluate(el => el.textContent);
        testResults.player_data.sample_data.push(cardText);
        if (i === 0) {
          testResults.player_data.first_player_name = cardText;
        }
      }
      console.log(`  ✅ 第一个球员: ${testResults.player_data.first_player_name}`);
      console.log(`  ✅ 样本数据:`, testResults.player_data.sample_data.slice(0, 3));
    } else {
      console.log('  ⚠️  没有找到球员卡片');
      testResults.errors.push('没有找到球员卡片 - 数据未渲染或数据库为空');
    }
    
    // 6. 验证分组按钮
    console.log('\n📋 验证分组按钮...');
    const groupingButton = await page.$('[data-testid="grouping-button"]');
    if (groupingButton) {
      testResults.dom_validation.grouping_button = true;
      const buttonText = await groupingButton.evaluate(el => el.textContent);
      console.log('  ✅ 分组按钮存在:', buttonText);
    } else {
      console.log('  ⚠️  分组按钮不存在');
    }
    
    // 7. 检查是否有 React 错误
    const errorBoundary = await page.$('[data-testid="error-boundary"]');
    if (errorBoundary) {
      const errorText = await errorBoundary.evaluate(el => el.textContent);
      console.log('  ❌ 检测到 React 错误:', errorText);
      testResults.errors.push(`React 错误: ${errorText}`);
    }
    
    // 8. 截图保存
    console.log('\n📸 保存截图...');
    const screenshotPath = path.join(process.cwd(), 'ui-verification.png');
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    testResults.screenshot = 'ui-verification.png';
    console.log('  ✅ 截图已保存:', screenshotPath);
    
    // 9. 评估整体状态
    const passed = 
      testResults.dom_validation.header &&
      testResults.dom_validation.player_form &&
      testResults.dom_validation.player_list &&
      testResults.dom_validation.player_cards_count > 0;
    
    testResults.all_tests_passed = passed;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试结果汇总:');
    console.log('  Header:', testResults.dom_validation.header ? '✅' : '❌');
    console.log('  表单:', testResults.dom_validation.player_form ? '✅' : '❌');
    console.log('  列表:', testResults.dom_validation.player_list ? '✅' : '❌');
    console.log('  球员卡片数量:', testResults.dom_validation.player_cards_count);
    console.log('  分组按钮:', testResults.dom_validation.grouping_button ? '✅' : '❌');
    console.log('  Console 错误:', testResults.console_errors);
    console.log('  总体结果:', passed ? '✅ 全部通过' : '❌ 部分失败');
    console.log('='.repeat(60));
    
    if (!passed && testResults.errors.length > 0) {
      console.log('\n⚠️  错误详情:');
      testResults.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ 测试执行失败:', error.message);
    testResults.errors.push(`执行错误: ${error.message}`);
    testResults.all_tests_passed = false;
  } finally {
    await browser.close();
  }
  
  // 保存测试报告
  const reportPath = path.join(process.cwd(), 'ui-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log('\n📄 测试报告已保存:', reportPath);
  
  return testResults;
}

// 执行验证
verify().then(results => {
  process.exit(results.all_tests_passed ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
