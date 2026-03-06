# 数据管理系统 - 测试任务（含线上 DOM 验证）

## 项目路径
/Users/ppt/Projects/player-grouping

## 背景
开发 Agent 已完成代码实现，现在需要测试功能完整性和（特别是新功能）。

## 声明
**开发 Agent 已完成！** 🎉

开发 Agent (Run ID: `2225fb7e`) 已按 Phase 1-6 顺序完成所有开发任务，## 声明
**开发 Agent 已完成！** 🎉

已完成所有 Phase 1-6 开发任务：
- Phase 1: 安装依赖包 ✅
- Phase 2: Shell Bar 集成 ✅
- Phase 3: Player Card 增强 ✅
- Phase 4: 导入向导 ✅
- Phase 5: 详情页 Dialog ✅
- Phase 6: Toast 通知 ✅

## 你的任务

### Phase 1: 本地 DOM 验证 (20 分钟)

#### 1.1 更新验证脚本
更新 `scripts/verify-ui-dom.mjs`，添加新的 data-testid 验证：

```javascript
// 新增验证项
const newTests = {
  data_management_menu: false,
  import_wizard: false,
  player_card_menu: false,
  player_detail_dialog: false,
};

// 1. 验证数据管理菜单
console.log('\n📋 验证数据管理菜单...');
const dataMenu = await page.$('[data-testid="data-management-menu"]');
if (dataMenu) {
  newTests.data_management_menu = true;
  console.log('  ✅ 数据管理菜单存在');
  
  // 点击菜单
  await dataMenu.click();
  await page.waitForTimeout(500);
  
  // 2. 验证导入向导
  const importButton = await page.$('text=批量导入球员');
  if (importButton) {
    await importButton.click();
    await page.waitForTimeout(1000);
    
    const wizard = await page.$('[data-testid="import-wizard"]');
    if (wizard) {
      newTests.import_wizard = true;
    console.log('  ✅ 导入向导打开');
  }
}

// 3. 验证 Player Card 操作菜单
const playerCard = await page.$('[data-testid="player-card"]');
if (playerCard) {
  await playerCard.hover();
  await page.waitForTimeout(300);
  
  const menuButton = await page.$('[data-testid="player-card-menu"]');
  if (menuButton) {
    newTests.player_card_menu = true;
    console.log('  ✅ Player Card 操作菜单存在');
    
    // 点击查看详情
    await menuButton.click();
    const detailButton = await page.$('text=查看详情');
    if (detailButton) {
      await detailButton.click();
      await page.waitForTimeout(1000);
      
      const detailDialog = await page.$('[data-testid="player-detail-dialog"]');
      if (detailDialog) {
        newTests.player_detail_dialog = true;
        console.log('  ✅ 详情页 Dialog 打开');
      }
    }
  }
}
```

#### 1.2 运行本地验证
```bash
node scripts/verify-ui-dom.mjs
```

### Phase 2: 功能测试 (20 分钟)

#### 2.1 测试导入向导流程
创建测试文件 `test-players.csv`:
```csv
name,position,twoPointShot,threePointShot
测试球员1,PG,80,75
测试球员2,SG,85,80
```

执行测试:
1. 点击"数据管理" → "批量导入球员"
2. 拖拽 CSV 文件
3. 查看数据预览（2 行数据）
4. 验证字段映射（自动映射）
5. 验证数据（无错误）
6. 确认导入
7. 验证 Toast 显示"成功导入 2 名球员"
8. 验证 Player Grid 显示新球员

#### 2.2 测试编辑功能
测试场景：
1. 点击 Player Card → 快速编辑
2. 修改技能值（例如：80 → 85）
3. 保存
4. 验证数据已更新

5. 点击 Player Card → 查看详情
6. 切换到"技能" Tab
7. 修改多个技能
8. 保存
9. 验证数据已更新
### Phase 3: 线上 DOM 验证 (20 分钟) ⭐
#### 3.1 推送代码到 GitHub
```bash
git add -A
git commit -m "feat: 数据管理系统完整实现

- Shell Bar 集成
- Player Card 增强
- 导入向导（5 步流程）
- 详情页 Dialog
- Toast 通知"
git push origin main
```

#### 3.2 等待部署
- 等待 GitHub Pages 自动部署（约 2-3 分钟）
- 获取线上 URL: `https://julius19910613.github.io/player-grouping/`

#### 3.3 创建线上验证脚本
创建 `scripts/verify-production.mjs`:

```javascript
import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://julius19910613.github.io/player-grouping/';

async function verifyProduction() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const results = {
    timestamp: new Date().toISOString(),
    phase: 'Production DOM Validation',
    url: PRODUCTION_URL,
    data_management_menu: false,
    import_wizard: false,
    player_card_menu: false,
    player_detail_dialog: false,
    console_errors: 0,
    all_passed: false
  };

  try {
    console.log('🌐 访问线上环境:', PRODUCTION_URL);
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // 监听 console 错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('  ❌ Console Error:', msg.text());
        results.console_errors++;
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 1. 验证数据管理菜单
    console.log('\n📋 验证数据管理菜单...');
    const dataMenu = await page.$('[data-testid="data-management-menu"]');
    if (dataMenu) {
      results.data_management_menu = true;
      console.log('  ✅ 数据管理菜单存在');
    }
    
    // 2. 验证 Player Card 操作菜单
    const playerCard = await page.$('[data-testid="player-card"]');
    if (playerCard) {
      await playerCard.hover();
      await page.waitForTimeout(300);
      
      const menuButton = await page.$('[data-testid="player-card-menu"]');
      if (menuButton) {
        results.player_card_menu = true;
        console.log('  ✅ Player Card 操作菜单存在');
      }
    }
    
    // 3. 验证球员数据渲染
    const playerCards = await page.$$('[data-testid="player-card"]');
    console.log(`  ✅ 找到 ${playerCards.length} 个球员卡片`);
    
    // 4. 截图
    await page.screenshot({ path: 'data-management-production.png', fullPage: true });
    console.log('\n📸 截图已保存: data-management-production.png');
    
    // 5. 评估
    results.all_passed = 
      results.data_management_menu &&
      results.player_card_menu &&
      playerCards.length > 0;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 线上验证结果:');
    console.log('  数据管理菜单:', results.data_management_menu ? '✅' : '❌');
    console.log('  Player Card 菜单:', results.player_card_menu ? '✅' : '❌');
    console.log('  球员卡片:', playerCards.length);
    console.log('  总体:', results.all_passed ? '✅ 通过' : '❌ 失败');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ 线上验证失败:', error.message);
  } finally {
    await browser.close();
  }
  
  // 保存报告
  fs.writeFileSync('data-management-production-test.json', JSON.stringify(results, null, 2));
  return results;
}

verifyProduction();
```

#### 3.4 运行线上验证
```bash
node scripts/verify-production.mjs
```

## 完成标准
- ✅ 所有新功能在本地可用
- ✅ 所有新功能在线上可用
- ✅ Toast 通知正常工作
- ✅ 导入向导流程完整
- ✅ 编辑功能正常
- ✅ DOM 验证通过

## 完成后
创建 `data-management-test-status.json`:
```json
{
  "local_validation": {
    "passed": true,
    "data_management_menu": true,
    "import_wizard": true,
    "player_card_menu": true,
    "player_detail_dialog": true
  },
  "production_validation": {
    "passed": true,
    "url": "https://julius19910613.github.io/player-grouping/",
    "data_management_menu": true,
    "player_card_menu": true,
    "player_cards_count": 19
  },
  "all_tests_passed": true
}
```

## 重要提示
- **线上验证是关键** - 必须验证生产环境
- **测试所有新功能** - 不要只测试一部分
- **截图保存** - 用于后续审查
- **详细日志** - 记录每个步骤的结果
