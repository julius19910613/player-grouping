# Phase 5: 离线支持 - 文件索引

> 完成时间：2026-03-05
> 状态：✅ 已完成

## 📚 文档导航

### 核心文档
1. **[Phase 5 总结报告](./phase5-summary.md)** - 必读 ⭐
   - 任务完成情况
   - 文件清单
   - 核心功能说明
   - 使用方式

2. **[Phase 5 实现说明](./phase5-offline-support.md)**
   - 详细的实现说明
   - 关键代码示例
   - 同步流程图
   - 冲突解决策略

3. **[Phase 5 完成清单](./phase5-changelog.md)**
   - 详细的任务清单
   - 代码统计
   - 测试覆盖

## 🗂️ 文件结构

```
src/
├── lib/
│   ├── network-status.ts          # 网络状态监听模块
│   └── app-init.ts                # 应用初始化模块
│
├── repositories/
│   ├── hybrid-player.repository.ts    # 球员混合仓库（已增强）
│   └── hybrid-grouping.repository.ts  # 分组历史混合仓库（已增强）
│
├── components/
│   └── NetworkStatusBar.tsx       # 网络状态 UI 组件
│
├── __tests__/
│   └── offline-support.test.ts    # 离线支持测试套件
│
└── examples/
    └── offline-integration.ts     # 集成示例

docs/
├── phase5-summary.md              # 总结报告（必读）
├── phase5-offline-support.md      # 实现说明
├── phase5-changelog.md            # 完成清单
└── phase5-index.md                # 本文件
```

## 🚀 快速开始

### 1. 初始化应用

```typescript
// main.tsx 或 App.tsx
import { appInitializer } from './lib/app-init';

async function init() {
  await appInitializer.initialize();
}
```

### 2. 使用网络状态

```typescript
import { useNetworkStatus } from './lib/network-status';

function MyComponent() {
  const { isOnline } = useNetworkStatus();
  return <div>{isOnline ? '在线' : '离线'}</div>;
}
```

### 3. 运行测试

```bash
# 运行自动化测试
npm test src/__tests__/offline-support.test.ts

# 手动测试
import { runManualTests } from './__tests__/offline-support.test';
runManualTests();
```

## 📖 详细指南

### 集成方式
- [应用启动时初始化](./phase5-offline-support.md#应用集成)
- [React 组件中使用](./phase5-offline-support.md#在-react-组件中使用)
- [手动集成](./src/examples/offline-integration.ts)

### 测试方法
- [自动化测试](./phase5-offline-support.md#运行自动化测试)
- [手动测试](./phase5-offline-support.md#手动测试)
- [测试场景](./phase5-offline-support.md#测试覆盖场景)

### 核心概念
- [同步流程](./phase5-offline-support.md#同步流程)
- [冲突解决策略](./phase5-offline-support.md#冲突解决策略)
- [数据一致性保证](./phase5-offline-support.md#数据一致性保证)

## 🛠️ API 参考

### networkStatus

```typescript
// 获取网络状态
networkStatus.getStatus(): boolean

// 添加监听器
networkStatus.addListener(listener: (isOnline: boolean) => void): () => void

// 手动同步
networkStatus.manualSync(): Promise<void>

// 注册 Repository
networkStatus.registerRepositories(playerRepo, groupingRepo): void
```

### appInitializer

```typescript
// 初始化应用
appInitializer.initialize(): Promise<AppInitStatus>

// 获取状态
appInitializer.getStatus(): AppInitStatus

// 销毁
appInitializer.destroy(): void
```

### HybridRepository

```typescript
// 获取待同步数量
repo.getPendingChangesCount(): Promise<number>

// 手动触发同步
repo.syncPendingChanges(): Promise<void>
```

## 🎯 常见场景

### 场景 1: 离线创建球员

```typescript
// 离线时自动标记为待同步
const player = await playerRepo.create({
  name: '测试球员',
  position: 'PG',
});
```

### 场景 2: 监听网络状态

```typescript
networkStatus.addListener((isOnline) => {
  if (isOnline) {
    console.log('网络已恢复，数据将自动同步');
  } else {
    console.log('网络已断开，已切换到离线模式');
  }
});
```

### 场景 3: 手动同步

```typescript
// 检查待同步数量
const pending = await playerRepo.getPendingChangesCount();

if (pending > 0) {
  console.log(`发现 ${pending} 个待同步数据`);
  await playerRepo.syncPendingChanges();
}
```

## 📊 性能指标

| 指标 | 数值 |
|------|------|
| 新增代码行数 | ~1318 行 |
| 新增文件 | 5 个 |
| 文档文件 | 3 个 |
| 测试覆盖场景 | 7 个 |
| 实现时间 | ~2 小时 |

## ✅ 验证清单

在提交给测试 Agent 之前，请确认：

- [x] 所有文件已创建
- [x] TypeScript 类型正确
- [x] 测试代码可运行
- [x] 文档完整
- [x] 示例代码可用

## 📞 支持

如有问题，请查看：
1. [实现说明文档](./phase5-offline-support.md)
2. [集成示例](../src/examples/offline-integration.ts)
3. [测试文件](../src/__tests__/offline-support.test.ts)

---

**Phase 5 实现完成！** 🎉

**下一步：测试 Agent 验证**
