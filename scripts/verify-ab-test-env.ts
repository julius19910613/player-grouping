/**
 * Verify A/B Test Environment Setup
 *
 * This script verifies that both SQL agent versions are properly set up
 * and environment variables are correctly configured.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('\n' + '='.repeat(60));
console.log('SQL Query Agent A/B 测试环境验证');
console.log('='.repeat(60) + '\n');

// Check if required files exist
console.log('\n📁 检查文件完整性...');

const requiredFiles = [
  'src/lib/sql-agent/database-schema.ts',
  'src/lib/sql-agent/prompt-templates.ts',
  'src/lib/sql-agent/enhanced-sql-query-agent.ts',
  'src/lib/sql-agent/sql-query-agent.ts',
  'scripts/ab-test-sql-agent.ts',
  'api/chat.ts',
  'api/chat-ab-test.ts',
  'docs/AB_TEST_GUIDE.md',
  'docs/SQL_AGENT_IMPROVEMENTS.md',
];

const missingFiles: string[] = [];
const existingFiles: string[] = [];

for (const file of requiredFiles) {
  const filePath = resolve(process.cwd(), file);
  try {
    if (readFileSync(filePath)) {
      existingFiles.push(file);
    }
  } catch {
    missingFiles.push(file);
  }
}

if (missingFiles.length > 0) {
  console.log('\n❌ 缺少以下文件:');
  missingFiles.forEach(f => console.log(`  - ${f}`));
  console.log('\n请先运行 npm run build 确保所有文件都存在');
  process.exit(1);
} else {
  console.log('\n✅ 所有必需文件已存在');
  existingFiles.forEach(f => console.log(`  ✓ ${f}`));
}

// Check if legacy agent file exists (for comparison)
const legacyAgentPath = resolve(process.cwd(), 'src/lib/sql-agent/sql-query-agent.ts');
try {
  readFileSync(legacyAgentPath);
  console.log('\n✅ Legacy SQL Agent 文件存在');
} catch {
  console.log('\n❌ Legacy SQL Agent 文件不存在');
}

// Check if enhanced agent file exists
const enhancedAgentPath = resolve(process.cwd(), 'src/lib/sql-agent/enhanced-sql-query-agent.ts');
try {
  readFileSync(enhancedAgentPath);
  console.log('\n✅ Enhanced SQL Agent 文件存在');
} catch {
  console.log('\n❌ Enhanced SQL Agent 文件不存在');
}

// Check if .env.example has the new config
const envExamplePath = resolve(process.cwd(), '.env.example');
try {
  const envExample = readFileSync(envExamplePath, 'utf-8');
  if (envExample.includes('USE_ENHANCED_SQL_AGENT')) {
    console.log('\n✅ .env.example 包含 USE_ENHANCED_SQL_AGENT 配置');
  } else {
    console.log('\n❌ .env.example 缺少 USE_ENHANCED_SQL_AGENT 配置');
  }
} catch (error) {
  console.log('\n❌ 读取 .env.example 失败:', error);
}

// Check if package.json has test scripts
const packageJsonPath = resolve(process.cwd(), 'package.json');
try {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  if (packageJson.scripts?.['ab:test'] &&
      packageJson.scripts?.['ab:test:legacy'] &&
      packageJson.scripts?.['ab:test:enhanced']) {
    console.log('\n✅ package.json 包含 A/B 测试脚本');
    console.log('   - npm run ab:test');
    console.log('   - npm run ab:test:legacy');
    console.log('   - npm run ab:test:enhanced');
  } else {
    console.log('\n❌ package.json 缺少 A/B 测试脚本');
  }
} catch (error) {
  console.log('\n❌ 读取 package.json 失败:', error);
}

// Display next steps
console.log('\n' + '='.repeat(60));
console.log('📋 下一步操作');
console.log('='.repeat(60) + '\n');
console.log('1. 创建 .env.local 文件:');
console.log('   cp .env.example .env.local');
console.log('2. 编辑 .env.local，配置 Supabase 和 Gemini API Key:');
console.log('   - VITE_SUPABASE_URL');
console.log('   - VITE_SUPABASE_ANON_KEY');
console.log('   - GEMINI_API_KEY');
console.log('3. 选择要测试的版本:');
console.log('   - Legacy 版本: USE_ENHANCED_SQL_AGENT=false');
console.log('   - Enhanced 版本: USE_ENHANCED_SQL_AGENT=true');
console.log('4. 运行测试:');
console.log('   npm run ab:test:legacy');
console.log('   npm run ab:test:enhanced');
console.log('5. 查看测试报告:');
console.log('   cat ab-test-report.json');
console.log('\n' + '='.repeat(60) + '\n');

// Check current env
const currentEnv = process.env.USE_ENHANCED_SQL_AGENT;
if (currentEnv === 'true') {
  console.log('\n📌 当前环境变量:');
  console.log('   USE_ENHANCED_SQL_AGENT = true (将使用 Enhanced 版本)');
} else if (currentEnv === 'false') {
  console.log('\n📌 当前环境变量:');
  console.log('   USE_ENHANCED_SQL_AGENT = false (将使用 Legacy 版本)');
} else {
  console.log('\n⚠️  未检测到 USE_ENHANCED_SQL_AGENT 环境变量');
}

console.log('\n' + '='.repeat(60));
console.log('📚 文档参考:');
console.log('='.repeat(60) + '\n');
console.log('完整文档: docs/AB_TEST_GUIDE.md');
console.log('改进方案: docs/SQL_AGENT_IMPROVEMENTS.md');
console.log('\n' + '='.repeat(60) + '\n');
