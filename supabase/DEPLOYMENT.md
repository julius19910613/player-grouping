# Supabase Phase 1 部署检查清单

## ✅ 已完成的任务

### 1. 数据库 Schema (`schema.sql`)
- ✅ `players` 表（UUID, name, position, created_at, updated_at）
- ✅ `player_skills` 表（19 项能力值 1-99 + overall 自动计算）
- ✅ `grouping_history` 表（分组历史记录）
- ✅ 索引优化
  - `idx_players_user_id` - 按用户查询球员
  - `idx_players_created_at` - 按时间倒序查询
  - `idx_grouping_history_user_id` - 按用户查询分组历史
  - `idx_grouping_history_created_at` - 按时间倒序查询
  - `idx_grouping_history_mode` - 按分组模式查询
- ✅ 触发器
  - `update_players_updated_at` - 自动更新 players.updated_at
  - `update_player_skills_updated_at` - 自动更新 player_skills.updated_at
  - `calculate_player_overall` - 自动计算 overall（位置加权算法）

### 2. RLS 策略 (`rls.sql`)
- ✅ `players` 表
  - SELECT: 用户只能查看自己的球员
  - INSERT: 用户只能插入自己的球员
  - UPDATE: 用户只能更新自己的球员
  - DELETE: 用户只能删除自己的球员
- ✅ `player_skills` 表
  - SELECT: 用户只能查看自己球员的能力值
  - INSERT: 用户只能插入自己球员的能力值
  - UPDATE: 用户只能更新自己球员的能力值
  - DELETE: 由外键 ON DELETE CASCADE 自动处理
- ✅ `grouping_history` 表
  - SELECT: 用户只能查看自己的分组历史
  - INSERT: 用户只能插入自己的分组历史
  - UPDATE: 用户只能更新自己的分组历史
  - DELETE: 用户只能删除自己的分组历史

### 3. 环境配置 (`.env.example`)
- ✅ `VITE_SUPABASE_URL` - Supabase 项目 URL
- ✅ `VITE_SUPABASE_ANON_KEY` - 匿名密钥（需要替换）
- ✅ 添加了项目 URL 和说明

## 📋 待测试 Agent 验证的项目

### 必须验证
1. **SQL 语法正确性**
   - PostgreSQL 语法符合标准
   - 无语法错误
   - 触发器函数逻辑正确

2. **表结构符合规划**
   - 字段类型正确（UUID, TEXT, INTEGER, TIMESTAMPTZ, JSONB）
   - 约束正确（CHECK, FOREIGN KEY, ON DELETE CASCADE）
   - 索引覆盖常用查询

3. **RLS 策略完整性**
   - 每个表都有对应的 RLS 策略
   - 策略逻辑正确（auth.uid() = user_id）
   - 测试脚本可执行

4. **触发器逻辑正确**
   - `update_updated_at_column()` 函数正确
   - `calculate_overall()` 函数逻辑正确（位置加权）
   - 触发器绑定到正确的表和事件

5. **环境变量配置**
   - `.env.example` 包含必需的环境变量
   - URL 正确
   - 有清晰的注释说明

### 建议验证
1. **性能优化**
   - 索引是否合理
   - 查询效率是否满足需求

2. **安全性**
   - RLS 策略是否足够严格
   - 是否有潜在的权限泄露

3. **可维护性**
   - SQL 代码注释是否清晰
   - 命名是否规范
   - 是否易于后续扩展

## 🚀 部署步骤

### 方式 1：Supabase Dashboard（推荐）
1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. 依次执行 `schema.sql` 和 `rls.sql`
4. 使用验证 SQL 检查结果

### 方式 2：Supabase CLI
```bash
supabase db push --db-url "postgresql://..." < supabase/schema.sql
supabase db push --db-url "postgresql://..." < supabase/rls.sql
```

## 📊 文件清单

```
supabase/
├── schema.sql        (309 行) - 数据库表结构
├── rls.sql           (205 行) - RLS 策略
└── README.md         (4.4 KB) - 使用文档

.env.example          (9 行) - 环境变量模板
```

## 🔍 验证 SQL

### 检查表是否创建成功
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('players', 'player_skills', 'grouping_history');
```

### 检查 RLS 是否启用
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('players', 'player_skills', 'grouping_history');
```

### 检查 RLS 策略
```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('players', 'player_skills', 'grouping_history');
```

### 检查触发器
```sql
SELECT event_object_table, trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public';
```

## 📝 关键代码说明

### 1. overall 自动计算逻辑
```sql
-- 位置加权算法（以 PG 为例）
weighted_sum := 
  NEW.passing * 1.5 +           -- 传球权重 1.5
  NEW.ball_control * 1.3 +      -- 控球权重 1.3
  NEW.court_vision * 1.3 +      -- 视野权重 1.3
  NEW.three_point_shot * 1.2 +  -- 三分权重 1.2
  ...;
  
overall := ROUND(weighted_sum / weight_sum);
```

### 2. RLS 策略示例
```sql
-- players 表 SELECT 策略
USING (auth.uid() = user_id)

-- player_skills 表 SELECT 策略（通过父表验证）
USING (
  EXISTS (
    SELECT 1 FROM players
    WHERE players.id = player_skills.player_id
    AND players.user_id = auth.uid()
  )
)
```

### 3. 触发器自动更新 updated_at
```sql
CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## ⚠️ 已知限制

1. **匿名认证依赖**
   - RLS 策略依赖 Supabase 的匿名认证
   - 需要确保匿名认证已启用

2. **overall 计算**
   - 仅在 player_skills 表插入或更新时触发
   - 不会在 players 表 position 更新时重新计算
   - 建议：如需修改位置，同时更新 player_skills

3. **级联删除**
   - 删除球员时，player_skills 记录自动删除
   - 无法恢复已删除的能力值数据

## 📞 联系方式

- **开发 Agent**: Phase 1 实施完成
- **测试 Agent**: 请验证所有项目
- **项目路径**: `/Users/ppt/Projects/player-grouping`
- **Supabase URL**: https://saeplsevqechdnlkwjyz.supabase.co

---

**状态**: ✅ Phase 1 完成，等待测试验证
**时间**: 2026-03-05 09:15
