#!/usr/bin/env node
/**
 * LocalStorage 备份和恢复工具
 * 
 * 用法：
 * - 备份：npm run backup export
 * - 恢复：npm run backup import <backup-file.json>
 * - 列出备份：npm run backup list
 */

import * as fs from 'fs';
import * as path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const STORAGE_KEY = 'player-grouping-data';

interface BackupData {
  timestamp: string;
  version: string;
  data: any;
}

/**
 * 创建备份目录
 */
function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * 导出 LocalStorage 数据到 JSON 文件
 * 
 * 注意：此脚本用于处理从浏览器导出的 localStorage 数据
 * 使用方法：
 * 1. 在浏览器控制台运行：console.log(localStorage.getItem('player-grouping-data'))
 * 2. 复制输出的 JSON 字符串
 * 3. 保存到文件或直接使用下面的 manualExport 方法
 */
export function exportLocalStorage(jsonData?: string): void {
  ensureBackupDir();
  
  let data: any;
  
  if (jsonData) {
    try {
      data = JSON.parse(jsonData);
    } catch (error) {
      console.error('❌ JSON 解析失败:', error);
      process.exit(1);
    }
  } else {
    console.log('ℹ️  请提供 LocalStorage 数据的 JSON 字符串');
    console.log('   在浏览器控制台运行:');
    console.log('   console.log(localStorage.getItem("player-grouping-data"))');
    console.log('   然后将输出作为参数传递给此脚本');
    process.exit(1);
  }
  
  const backup: BackupData = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    data: data
  };
  
  const filename = `backup-${Date.now()}.json`;
  const filepath = path.join(BACKUP_DIR, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
  console.log(`✅ 备份已创建: ${filepath}`);
  console.log(`   包含 ${Array.isArray(data) ? data.length : 0} 个球员数据`);
}

/**
 * 从备份文件导入数据到 LocalStorage
 * 
 * 注意：此脚本生成可在浏览器控制台运行的代码
 */
export function importLocalStorage(backupFile: string): void {
  const filepath = path.isAbsolute(backupFile) 
    ? backupFile 
    : path.join(BACKUP_DIR, backupFile);
  
  if (!fs.existsSync(filepath)) {
    console.error(`❌ 备份文件不存在: ${filepath}`);
    process.exit(1);
  }
  
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    const backup: BackupData = JSON.parse(content);
    
    console.log(`✅ 已读取备份文件: ${filepath}`);
    console.log(`   备份时间: ${backup.timestamp}`);
    console.log(`   备份版本: ${backup.version}`);
    console.log(`   球员数量: ${Array.isArray(backup.data) ? backup.data.length : 0}`);
    
    // 生成浏览器控制台代码
    console.log('\n📝 在浏览器控制台运行以下代码来恢复数据:\n');
    console.log('```javascript');
    console.log(`localStorage.setItem('${STORAGE_KEY}', '${JSON.stringify(backup.data)}');`);
    console.log('console.log("✅ 数据已恢复，刷新页面查看");');
    console.log('```\n');
    
    // 同时保存一个可以直接复制粘贴的版本
    const restoreScriptPath = filepath.replace('.json', '-restore.txt');
    const restoreScript = `localStorage.setItem('${STORAGE_KEY}', '${JSON.stringify(backup.data)}');\nconsole.log("✅ 数据已恢复，刷新页面查看");`;
    fs.writeFileSync(restoreScriptPath, restoreScript);
    console.log(`   恢复脚本已保存: ${restoreScriptPath}`);
    
  } catch (error) {
    console.error('❌ 读取备份文件失败:', error);
    process.exit(1);
  }
}

/**
 * 列出所有备份文件
 */
export function listBackups(): void {
  ensureBackupDir();
  
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(file => (file.startsWith('backup-') || file.startsWith('sample-backup-')) && file.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    console.log('📭 暂无备份文件');
    return;
  }
  
  console.log(`\n📦 找到 ${files.length} 个备份文件:\n`);
  
  files.forEach((file, index) => {
    const filepath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filepath);
    const content = fs.readFileSync(filepath, 'utf-8');
    const backup: BackupData = JSON.parse(content);
    
    console.log(`${index + 1}. ${file}`);
    console.log(`   时间: ${backup.timestamp}`);
    console.log(`   球员: ${Array.isArray(backup.data) ? backup.data.length : 0} 个`);
    console.log(`   大小: ${(stats.size / 1024).toFixed(2)} KB\n`);
  });
}

/**
 * 创建示例备份（用于测试）
 */
export function createSampleBackup(): void {
  const sampleData = [
    {
      id: 'player-sample-1',
      name: '示例球员1',
      position: 'PG',
      skills: {
        twoPointShot: 75,
        threePointShot: 80,
        freeThrow: 85,
        passing: 90,
        ballControl: 85,
        courtVision: 88,
        perimeterDefense: 70,
        interiorDefense: 60,
        steals: 75,
        blocks: 45,
        offensiveRebound: 50,
        defensiveRebound: 55,
        speed: 85,
        strength: 65,
        stamina: 80,
        vertical: 70,
        basketballIQ: 90,
        teamwork: 85,
        clutch: 80,
        overall: 76
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  
  ensureBackupDir();
  
  const backup: BackupData = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    data: sampleData
  };
  
  const filename = `sample-backup-${Date.now()}.json`;
  const filepath = path.join(BACKUP_DIR, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
  console.log(`✅ 示例备份已创建: ${filepath}`);
}

// CLI 入口
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'export':
    const jsonData = args[1];
    exportLocalStorage(jsonData);
    break;
    
  case 'import':
    if (!args[1]) {
      console.error('❌ 请指定备份文件路径');
      console.log('   用法: npm run backup import <backup-file.json>');
      process.exit(1);
    }
    importLocalStorage(args[1]);
    break;
    
  case 'list':
    listBackups();
    break;
    
  case 'sample':
    createSampleBackup();
    break;
    
  default:
    console.log(`
📦 LocalStorage 备份工具

用法:
  npm run backup export <json-data>   导出数据到备份文件
  npm run backup import <file>        从备份文件恢复数据
  npm run backup list                 列出所有备份文件
  npm run backup sample               创建示例备份文件

示例:
  npm run backup export '[{"id":"player-1","name":"张三",...}]'
  npm run backup import backup-1234567890.json
  npm run backup list

提示:
  - export: 从浏览器控制台复制 localStorage.getItem('player-grouping-data') 的输出
  - import: 生成可在浏览器控制台运行的恢复代码
    `);
    break;
}
