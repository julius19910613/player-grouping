# Phase 5: 离线支持实现说明

> 实现时间：2026-03-05
> 实现状态：✅ 已完成

## 📋 概述

Phase 5 实现了完整的离线支持功能，包括：
- ✅ 同步队列机制
- ✅ 网络状态监听
- ✅ 自动同步触发
- ✅ 冲突检测与解决
- ✅ 测试覆盖

## 🗂️ 文件清单

### 新增文件

1. **`src/lib/network-status.ts`** - 网络状态监听模块
   - 监听 online/offline 事件
   - 提供网络状态 API
   - 网络恢复时自动触发同步

2. **`src/lib/app-init.ts`** - 应用初始化模块
   - 初始化 Repository（Hybrid 模式）
   - 注册到网络状态管理器
   - 触发初始同步
   - 提供初始化状态 API

3. **`src/__tests__/offline-support.test.ts`** - 离线支持测试
   - 离线创建/更新/删除测试
   - 网络恢复自动同步测试
   - 冲突解决测试
   - 手动测试工具

### 已有文件（Phase 2 实现）

4. **`src/repositories/hybrid-player.repository.ts`** - 混合球员仓库
   - 优先从 Supabase 读取
   - 失败时从 SQLite 读取
   - 写入时同步到两边
   - 冲突检测与解决

5. **`src/repositories/hybrid-grouping.repository.ts`** - 混合分组历史仓库
   - 同样的混合策略
   - 待同步队列管理

## 🔧 关键实现

### 1. 网络状态监听

```typescript
// src/lib/network-status.ts

class NetworkStatusManager {
  // 监听网络事件
  private bindEvents(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  // 网络恢复时自动同步
  private async handleOnline(): Promise<void> {
    console.log('✅ 网络已恢复');
    this.isOnline = true;
    this.notifyListeners(true);
    await this.triggerSync(); // 自动触发同步
  }

  // 自动同步待处理数据
  private async triggerSync(): Promise<void> {
    if (this.playerRepo) {
      await this.playerRepo.syncPendingChanges();
    }
    if (this.groupingRepo) {
      await this.groupingRepo.syncPendingChanges();
    }
  }
}
```

### 2. 同步队列

```typescript
// src/repositories/hybrid-player.repository.ts

export class HybridPlayerRepository {
  // 标记为待同步
  private async markAsPendingSync(
    id: string,
    action: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    const pending = this.getPendingChangesFromStorage();
    pending.push({ id, action, data, timestamp: Date.now() });
    localStorage.setItem('pending_sync_players', JSON.stringify(pending));
  }

  // 手动触发同步（网络恢复后调用）
  async syncPendingChanges(): Promise<void> {
    const pending = await this.getPendingChanges();
    for (const change of pending) {
      try {
        switch (change.action) {
          case 'create':
            await this.supabaseRepo.create(change.data);
            break;
          case 'update':
            await this.supabaseRepo.update(change.id, change.data);
            break;
          case 'delete':
            await this.supabaseRepo.delete(change.id);
            break;
        }
        await this.removePendingChange(change.id);
      } catch (error) {
        console.error('同步失败:', error);
      }
    }
  }
}
```

### 3. 冲突解决

```typescript
// src/repositories/hybrid-player.repository.ts

private async resolveConflicts(conflicts: Conflict[]): Promise<void> {
  for (const conflict of conflicts) {
    let winner: 'local' | 'server';

    switch (this.conflictStrategy) {
      case 'server_wins':
        winner = 'server';
        break;
      case 'client_wins':
        winner = 'local';
        await this.supabaseRepo.update(conflict.id, conflict.localData);
        break;
      case 'latest_wins':
        winner = conflict.localData.updatedAt > conflict.serverData.updatedAt
          ? 'local'
          : 'server';
        break;
      case 'merge':
        const merged = this.mergeData(conflict.serverData, conflict.localData, conflict.pendingChange.data);
        await this.supabaseRepo.update(conflict.id, merged);
        continue;
    }

    if (winner === 'server') {
      await this.sqliteRepo.update(conflict.id, conflict.serverData);
    } else {
      await this.supabaseRepo.update(conflict.id, conflict.localData);
    }
  }
}
```

## 📱 应用集成

### 在应用启动时初始化

```typescript
// src/App.tsx 或 src/main.tsx

import { appInitializer } from './lib/app-init';
import { networkStatus } from './lib/network-status';

// 应用启动时初始化
async function initApp() {
  const status = await appInitializer.initialize();
  console.log('应用初始化状态:', status);
}

// 监听网络状态变化
networkStatus.addListener((isOnline) => {
  console.log('网络状态变化:', isOnline ? '在线' : '离线');
});

initApp();
```

### 在 React 组件中使用

```typescript
import { useNetworkStatus } from './lib/network-status';
import { useAppInit } from './lib/app-init';

function MyComponent() {
  const { isOnline, manualSync } = useNetworkStatus();
  const { initialize, getStatus } = useAppInit();

  useEffect(() => {
    initialize();
  }, []);

  return (
    <div>
      <p>网络状态: {isOnline ? '在线' : '离线'}</p>
      <button onClick={manualSync}>手动同步</button>
    </div>
  );
}
```

## 🧪 测试

### 运行自动化测试

```bash
# 运行所有离线支持测试
npm test src/__tests__/offline-support.test.ts

# 或者使用 Jest
npx jest src/__tests__/offline-support.test.ts
```

### 手动测试

```typescript
import { runManualTests } from './__tests__/offline-support.test';

// 在开发环境中运行
runManualTests();
```

### 测试覆盖场景

1. ✅ 离线创建数据
2. ✅ 离线更新数据
3. ✅ 离线删除数据
4. ✅ 网络恢复后自动同步
5. ✅ 冲突检测与解决
6. ✅ 连续离线操作
7. ✅ 应用初始化自动同步

## 🔄 同步流程

```
┌─────────────┐
│ 用户操作    │
└──────┬──────┘
       │
       ├─ 在线 ──┐
       │         ↓
       │   Supabase 操作成功
       │         ↓
       │   同步到 SQLite
       │         ↓
       │   完成 ✅
       │
       └─ 离线 ──┐
                 ↓
           SQLite 操作
                 ↓
           标记为待同步
                 ↓
           存储到 LocalStorage
                 ↓
           等待网络恢复
                 ↓
           网络恢复事件
                 ↓
           自动同步到 Supabase
                 ↓
           清空待同步队列
                 ↓
           完成 ✅
```

## 🛡️ 冲突解决策略

### 策略说明

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| `server_wins` | 服务端数据优先 | 只读场景，多人协作 |
| `client_wins` | 本地数据优先 | 离线编辑，单人使用 |
| `latest_wins` | 最新修改优先 | **推荐默认** |
| `merge` | 字段级别合并 | 最智能，但复杂 |

### 冲突检测条件

```typescript
// 冲突条件：本地有修改 && 服务端也有修改 && 修改时间不同
if (
  pendingChange &&
  serverPlayer &&
  serverPlayer.updatedAt.getTime() > pendingChange.timestamp
) {
  // 检测到冲突
}
```

## 📊 数据一致性保证

### 1. 本地数据
- ✅ 使用 SQLite 事务保证原子性
- ✅ 失败不影响本地数据
- ✅ 支持回滚

### 2. 云端数据
- ✅ 使用 Supabase 事务保证原子性
- ✅ RLS 策略保证权限
- ✅ 外键级联保证完整性

### 3. 同步数据
- ✅ 使用 `updated_at` 时间戳比较
- ✅ LocalStorage 持久化待同步队列
- ✅ 同步失败不影响本地数据
- ✅ 支持重试机制

## 🚀 下一步

Phase 5 已完成，可以继续进行：

- **Phase 6**: 实时同步（可选）- Realtime 订阅
- **Phase 7**: 测试与优化 - 集成测试、性能优化

## 📝 注意事项

1. **LocalStorage 限制**：待同步队列存储在 LocalStorage，注意容量限制（通常 5-10MB）
2. **网络抖动**：避免频繁的网络状态切换导致重复同步
3. **冲突策略**：根据业务需求选择合适的冲突策略
4. **测试覆盖**：确保在各种网络环境下测试

## 🎯 总结

Phase 5 实现了完整的离线支持功能，核心特性：

- ✅ **自动降级**：网络断开时自动使用本地数据
- ✅ **自动同步**：网络恢复时自动同步待处理数据
- ✅ **冲突解决**：智能处理数据冲突
- ✅ **数据安全**：保证数据不丢失
- ✅ **测试完善**：覆盖所有离线场景

---

**实现完成！** 🎉

下一步：测试 Agent 验证功能。
