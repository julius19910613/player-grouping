# 备份工具使用说明

## 概述

这个备份工具用于在 SQLite 迁移过程中保护球员数据。它提供了导出、导入和列出备份的功能。

## 使用方法

### 1. 查看帮助

```bash
npm run backup
```

### 2. 创建示例备份（用于测试）

```bash
npm run backup sample
```

### 3. 导出实际数据

在浏览器中打开应用，打开开发者控制台（F12），运行：

```javascript
console.log(localStorage.getItem('player-grouping-data'))
```

复制输出的 JSON 字符串，然后在终端运行：

```bash
npm run backup export '[{"id":"player-xxx",...}]'
```

### 4. 列出所有备份

```bash
npm run backup list
```

### 5. 从备份恢复数据

```bash
npm run backup import backup-1234567890.json
```

这将生成一段代码，你可以在浏览器控制台运行来恢复数据。

## 文件位置

- 备份文件存储在：`backups/` 目录
- 备份文件格式：`backup-{timestamp}.json`
- 恢复脚本：`backup-{timestamp}-restore.txt`（自动生成）

## 备份文件格式

```json
{
  "timestamp": "2026-03-03T03:10:50.342Z",
  "version": "1.0.0",
  "data": [
    {
      "id": "player-xxx",
      "name": "张三",
      "position": "PG",
      "skills": {...},
      "createdAt": "2026-03-03T03:10:50.342Z",
      "updatedAt": "2026-03-03T03:10:50.342Z"
    }
  ]
}
```

## 注意事项

1. 备份文件不会被提交到 Git（已添加到 .gitignore）
2. 建议在迁移前创建备份
3. 定期清理旧的备份文件
4. 导入操作会生成浏览器控制台代码，需要在浏览器中手动执行

## 迁移前检查清单

- [ ] 已创建当前数据的备份
- [ ] 已验证备份文件包含所有球员数据
- [ ] 已测试备份导入功能
