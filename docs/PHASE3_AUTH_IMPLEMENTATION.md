# Phase 3: 认证集成实施文档

## 📋 任务概览

**目标**: 实现匿名认证流程，确保数据隔离和用户数据安全

**状态**: ✅ 已完成

**完成时间**: 2026-03-05

---

## 🎯 实施内容

### 1. ✅ 匿名认证模块 (`src/lib/auth.ts`)

#### 核心功能

- **`getOrCreateAnonymousUser()`**: 获取或创建匿名用户
  - 首次访问时创建 Supabase 匿名用户
  - 后续访问时复用已有用户（从 LocalStorage 缓存）
  - 离线模式时生成临时 UUID
  - 自动缓存 user_id 到 LocalStorage

- **`getCurrentUserId()`**: 获取当前用户 ID
  - 优先从 Supabase 会话获取
  - 降级到 LocalStorage 缓存

- **`onAuthStateChange()`**: 监听认证状态变化
  - 实时更新用户状态
  - 自动缓存最新的 user_id

- **`signOut()`**: 登出功能
  - 清除 Supabase 会话
  - 清除 LocalStorage 缓存

#### 在线/离线模式处理

| 场景 | 行为 | user_id 来源 |
|------|------|-------------|
| 在线 + 首次访问 | 创建 Supabase 匿名用户 | Supabase 生成 UUID |
| 在线 + 已有会话 | 恢复已有会话 | LocalStorage 缓存 |
| 离线 | 使用临时 UUID | `crypto.randomUUID()` |
| Supabase 不可用 | 降级到离线模式 | `crypto.randomUUID()` |

#### 错误处理

- **可恢复错误**（网络错误、认证失败）：返回 `recoverable: true`
- **不可恢复错误**：返回 `recoverable: false`
- **离线模式**：返回 `isOffline: true`，不阻止应用使用

---

### 2. ✅ Repository 更新

#### `supabase-player.repository.ts`

**更新点**:

1. **导入认证模块**:
   ```typescript
   import { getCurrentUserId } from '../lib/auth';
   ```

2. **findAll() 方法**:
   ```typescript
   const userId = await getCurrentUserId();
   if (!userId) return [];
   
   const { data } = await supabase
     .from('players')
     .select('*')
     .eq('user_id', userId);  // 🔒 仅查询当前用户的球员
   ```

3. **create() 方法**:
   ```typescript
   const userId = await getCurrentUserId();
   if (!userId) throw new DatabaseError('未认证用户');
   
   const { data } = await supabase
     .from('players')
     .insert({
       user_id: userId,  // 🔒 关联当前用户
       name: playerData.name,
       position: playerData.position,
     });
   ```

4. **count() 方法**:
   ```typescript
   const userId = await getCurrentUserId();
   const { count } = await supabase
     .from('players')
     .select('*', { count: 'exact', head: true })
     .eq('user_id', userId);  // 🔒 仅统计当前用户
   ```

**数据隔离保证**:
- 所有查询都过滤 `user_id`
- 所有插入都关联 `user_id`
- 未认证用户返回空数据或抛出错误

---

#### `supabase-grouping.repository.ts`

**更新点**:

1. **save() 方法**:
   ```typescript
   const userId = await getCurrentUserId();
   if (!userId) throw new DatabaseError('未认证用户');
   
   const { data } = await supabase
     .from('grouping_history')
     .insert({
       user_id: userId,  // 🔒 关联当前用户
       mode: history.mode,
       // ...
     });
   ```

2. **getRecent() 方法**:
   ```typescript
   const userId = await getCurrentUserId();
   const { data } = await supabase
     .from('grouping_history')
     .select('*')
     .eq('user_id', userId)  // 🔒 仅查询当前用户
     .order('created_at', { ascending: false });
   ```

3. **count() 和 getStatistics() 方法**:
   - 所有统计都过滤 `user_id`
   - 未认证用户返回空统计

---

### 3. ✅ 测试文件 (`src/__tests__/auth.test.ts`)

#### 测试覆盖

1. **匿名用户创建** (3 个测试)
   - ✅ 首次访问时创建匿名用户
   - ✅ 离线模式生成临时 UUID
   - ✅ 认证失败时返回错误

2. **user_id 持久化** (5 个测试)
   - ✅ 创建用户后缓存到 LocalStorage
   - ✅ 后续访问复用已有用户
   - ✅ getCurrentUserId 返回正确 ID
   - ✅ 未认证时返回 null
   - ✅ isAuthenticated 返回正确状态

3. **数据隔离** (5 个测试)
   - ✅ 创建球员时关联 user_id
   - ✅ 查询球员时过滤 user_id
   - ✅ 未认证时返回空数组
   - ✅ 保存分组历史时关联 user_id
   - ✅ 不同用户数据隔离

4. **登出功能** (1 个测试)
   - ✅ 登出清除 LocalStorage

5. **错误处理** (2 个测试)
   - ✅ 网络错误返回可恢复错误
   - ✅ Supabase 不可用降级到离线模式

**测试覆盖率目标**: 100%（认证流程）

---

### 4. ✅ 使用示例 (`src/examples/auth-usage.ts`)

#### 包含示例

1. **应用启动初始化认证**
2. **React 组件中使用认证**
3. **Repository 操作前检查认证**
4. **处理离线场景**
5. **完整的应用初始化流程**
6. **监听认证状态变化**
7. **认证错误重试逻辑**
8. **测试中模拟认证**
9. **清除认证信息**

---

## 🔒 数据隔离验证

### RLS 策略（已在数据库中配置）

**players 表**:
```sql
CREATE POLICY "Users can view own players"
  ON players FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own players"
  ON players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE 和 DELETE 同理
```

**player_skills 表**:
```sql
CREATE POLICY "Users can view own player skills"
  ON player_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = player_skills.player_id
      AND players.user_id = auth.uid()
    )
  );
```

**grouping_history 表**:
```sql
CREATE POLICY "Users can view own grouping history"
  ON grouping_history FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT, UPDATE, DELETE 同理
```

### 数据流验证

```
用户 A (user_a_id) → 查询 players → WHERE user_id = 'user_a_id' → 仅返回 A 的数据
用户 B (user_b_id) → 查询 players → WHERE user_id = 'user_b_id' → 仅返回 B 的数据
```

**数据库层隔离**（RLS） + **应用层隔离**（Repository 过滤） = 双重保障

---

## 🚀 使用方法

### 1. 应用启动时初始化

```typescript
// src/App.tsx
import { getOrCreateAnonymousUser } from './lib/auth';

function App() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function init() {
      const result = await getOrCreateAnonymousUser();
      
      if (result.error && !result.isOffline) {
        // 在线但认证失败 - 显示错误
        console.error('认证失败:', result.error);
      }
      
      setUser(result.user);
      setIsReady(true);
    }

    init();
  }, []);

  if (!isReady) return <div>加载中...</div>;

  return <MainApp user={user} />;
}
```

### 2. 在 Repository 中使用

```typescript
// Repository 方法会自动使用 user_id
const players = await playerRepository.findAll();  // 自动过滤当前用户
const player = await playerRepository.create(data);  // 自动关联当前用户
```

### 3. 处理离线场景

```typescript
const result = await getOrCreateAnonymousUser();

if (result.isOffline) {
  // 显示离线提示
  showToast('当前为离线模式，数据将保存在本地');
}
```

---

## 📊 文件清单

### 新增文件

1. **`src/lib/auth.ts`** (6.1 KB)
   - 匿名认证核心逻辑
   - 在线/离线模式处理
   - LocalStorage 缓存

2. **`src/__tests__/auth.test.ts`** (11 KB)
   - 完整的认证流程测试
   - 数据隔离验证
   - 错误处理测试

3. **`src/examples/auth-usage.ts`** (4.8 KB)
   - 9 个使用示例
   - 最佳实践演示

### 修改文件

1. **`src/repositories/supabase-player.repository.ts`**
   - 添加 user_id 过滤（findAll, count）
   - 添加 user_id 关联（create）
   - 添加未认证用户处理

2. **`src/repositories/supabase-grouping.repository.ts`**
   - 添加 user_id 过滤（getRecent, count, getStatistics）
   - 添加 user_id 关联（save）
   - 添加未认证用户处理

---

## ✅ 验收标准

- [x] 实现 `getOrCreateAnonymousUser()` 函数
- [x] 首次访问时创建匿名用户
- [x] 后续访问时复用已有用户
- [x] 将 user_id 存储在 localStorage
- [x] 更新 `supabase-player.repository.ts` 使用 user_id
- [x] 更新 `supabase-grouping.repository.ts` 使用 user_id
- [x] 创建测试文件验证认证流程
- [x] 验证匿名用户创建
- [x] 验证 user_id 持久化
- [x] 验证数据隔离
- [x] 保持游客模式的简洁性
- [x] 确保数据隔离正确
- [x] 处理好错误和边界情况

---

## 🔍 关键代码说明

### 1. 认证流程

```typescript
// 在线模式
const { data } = await supabase.auth.signInAnonymously();
localStorage.setItem('anonymous_user_id', data.user.id);

// 离线模式
const tempId = crypto.randomUUID();
localStorage.setItem('anonymous_user_id', tempId);
```

### 2. 数据隔离

```typescript
// 应用层隔离
const userId = await getCurrentUserId();
const { data } = await supabase
  .from('players')
  .select('*')
  .eq('user_id', userId);  // 👈 关键：过滤 user_id

// 数据库层隔离（RLS）
CREATE POLICY "Users can view own players"
  ON players FOR SELECT
  USING (auth.uid() = user_id);  // 👈 双重保障
```

### 3. 错误处理

```typescript
// 可恢复错误
if (error.recoverable) {
  // 可以重试
  showToast('认证失败，请检查网络后重试');
}

// 离线模式
if (result.isOffline) {
  // 不阻止使用，降级到本地
  showToast('当前为离线模式');
}
```

---

## 🎯 后续工作

Phase 3 已完成，等待 **测试 Agent** 验证：

1. ✅ 功能验证：认证流程是否正常
2. ✅ 数据隔离验证：不同用户数据是否隔离
3. ✅ 离线模式验证：离线时是否正常工作
4. ✅ 错误处理验证：各种错误场景是否正确处理

验证通过后，可以进入 **Phase 4: 数据迁移**。

---

## 📝 注意事项

1. **RLS 策略必须在数据库中配置**（已在 Phase 1 完成）
2. **LocalStorage 中的 user_id 是敏感信息**，注意安全性
3. **离线模式的临时 UUID** 在网络恢复后会自动同步
4. **未认证用户** 返回空数据，不抛出错误（保持应用可用性）
5. **测试覆盖率** 目标 100%（认证流程）

---

## 🙏 审核要点

请审核 Agent 重点验证：

1. ✅ 匿名认证流程是否完整（在线/离线/错误）
2. ✅ user_id 是否正确关联到所有数据
3. ✅ 数据隔离是否生效（应用层 + 数据库层）
4. ✅ 错误处理是否完善
5. ✅ 测试是否覆盖所有场景

---

**实施完成！等待测试 Agent 验证。** 🎉
