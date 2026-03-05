# Repository 使用指南

## 快速开始

### 1. 配置环境变量

复制 `.env.example` 为 `.env.local` 并填入实际的 Supabase 配置：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. 使用 Repository

```typescript
import { playerRepository, groupingRepository } from './repositories';

// 查找所有球员
const players = await playerRepository.findAll();

// 创建球员
const newPlayer = await playerRepository.create({
  name: '张三',
  position: 'PG',
  skills: {
    twoPointShot: 75,
    threePointShot: 80,
    freeThrow: 70,
    passing: 85,
    ballControl: 80,
    courtVision: 75,
    perimeterDefense: 70,
    interiorDefense: 60,
    steals: 75,
    blocks: 50,
    offensiveRebound: 60,
    defensiveRebound: 65,
    speed: 80,
    strength: 70,
    stamina: 75,
    vertical: 70,
    basketballIQ: 80,
    teamwork: 85,
    clutch: 75,
  }
});

// 保存分组历史
const historyId = await groupingRepository.save({
  mode: '5v5',
  teamCount: 2,
  playerCount: 10,
  balanceScore: 85.5,
  data: {
    teams: [/* ... */],
    stats: {/* ... */},
    createdAt: new Date().toISOString()
  },
  note: '测试分组'
});
```

## 数据源切换

### 使用工厂函数

```typescript
import { createPlayerRepository, setRepositoryConfig } from './repositories';

// 创建 Hybrid Repository（推荐）
const hybridRepo = createPlayerRepository('hybrid');

// 创建纯 Supabase Repository
const supabaseRepo = createPlayerRepository('supabase');

// 创建纯 SQLite Repository
const sqliteRepo = createPlayerRepository('sqlite');
```

### 使用全局配置

```typescript
import { setRepositoryConfig } from './repositories';

// 设置全局配置
setRepositoryConfig({ 
  player: 'hybrid', 
  grouping: 'hybrid' 
});
```

## 离线支持

### Hybrid Repository 自动处理

Hybrid Repository 会自动：
- 网络可用时：优先从 Supabase 读取，更新本地缓存
- 网络不可用时：降级到 SQLite
- 写入失败时：标记为待同步

### 手动触发同步

```typescript
import { HybridPlayerRepository } from './repositories';

const hybridRepo = new HybridPlayerRepository();

// 网络恢复后手动同步
await hybridRepo.syncPendingChanges();

// 查看待同步数量
const pendingCount = await hybridRepo.getPendingChangesCount();
console.log(`待同步: ${pendingCount} 条`);
```

## 可用方法

### PlayerRepository

```typescript
// 查询
findAll(): Promise<Player[]>
findById(id: string): Promise<Player | null>
findByPosition(position: BasketballPosition): Promise<Player[]>
searchByName(name: string): Promise<Player[]>
count(): Promise<number>

// 修改
create(playerData): Promise<Player>
update(id: string, updates): Promise<void>
delete(id: string): Promise<void>
```

### GroupingRepository

```typescript
// 查询
getRecent(limit?: number): Promise<GroupingHistory[]>
getById(id: number): Promise<GroupingHistory | null>
getByMode(mode: GroupingMode, limit?: number): Promise<GroupingHistory[]>
count(): Promise<number>
getStatistics(): Promise<Statistics>

// 修改
save(history): Promise<number>
delete(id: number): Promise<void>
clearAll(): Promise<void>
updateNote(id: number, note: string): Promise<void>
```

## 类型定义

### Player

```typescript
interface Player {
  id: string;
  name: string;
  position: BasketballPosition;
  skills: BasketballSkills;
  createdAt: Date;
  updatedAt: Date;
}
```

### GroupingHistory

```typescript
interface GroupingHistory {
  id: number;
  createdAt: Date;
  mode: GroupingMode;
  teamCount: number;
  playerCount: number;
  balanceScore: number | null;
  data: GroupingData;
  note?: string;
}
```

## 故障排除

### Supabase 连接失败

如果看到警告：
```
⚠️ Supabase 配置缺失。请在 .env.local 中设置...
```

**解决方案：**
1. 确认 `.env.local` 文件存在
2. 确认环境变量以 `VITE_` 开头
3. 重启开发服务器（`npm run dev`）

### 离线数据未同步

**解决方案：**
```typescript
// 检查待同步数量
const pendingCount = await hybridRepo.getPendingChangesCount();

// 手动触发同步
await hybridRepo.syncPendingChanges();
```

### 冲突解决

Hybrid Repository 默认使用 `latest_wins` 策略。

如需修改，在创建实例时设置：
```typescript
const hybridRepo = new HybridPlayerRepository();
// hybridRepo['conflictStrategy'] = 'server_wins'; // 私有属性，需要修改类实现
```

## 更多信息

- [完整报告](../../PHASE2_COMPLETE.md)
- [规划文档](../../supabase-planning.md)
