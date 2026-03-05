# Supabase 数据库配置

本目录包含 Player Grouping 应用的 Supabase 数据库配置文件。

## 📁 文件说明

### `schema.sql`
数据库表结构定义，包含：
- ✅ 3 个核心表：`players`, `player_skills`, `grouping_history`
- ✅ 索引优化（按用户、时间、模式查询）
- ✅ 自动更新 `updated_at` 的触发器
- ✅ 自动计算 `overall` 的触发器（位置加权算法）
- ✅ 完整的字段注释

### `rls.sql`
行级安全策略（Row Level Security），包含：
- ✅ `players` 表的 4 个策略（SELECT/INSERT/UPDATE/DELETE）
- ✅ `player_skills` 表的 3 个策略（SELECT/INSERT/UPDATE）
- ✅ `grouping_history` 表的 4 个策略（SELECT/INSERT/UPDATE/DELETE）
- ✅ 基于游客模式的简化权限控制
- ✅ 测试脚本示例

## 🚀 使用方法

### 方式 1：Supabase Dashboard（推荐）

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目：`saeplsevqechdnlkwjyz`
3. 进入 **SQL Editor**
4. 按顺序执行：
   ```sql
   -- 1. 创建表结构和触发器
   \i schema.sql
   
   -- 2. 创建 RLS 策略
   \i rls.sql
   ```

### 方式 2：Supabase CLI

```bash
# 1. 安装 Supabase CLI（如果尚未安装）
npm install -g supabase

# 2. 登录 Supabase
supabase login

# 3. 关联项目
supabase link --project-ref saeplsevqechdnlkwjyz

# 4. 执行 SQL 文件
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.saeplsevqechdnlkwjyz.supabase.co:5432/postgres" < supabase/schema.sql
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.saeplsevqechdnlkwjyz.supabase.co:5432/postgres" < supabase/rls.sql
```

### 方式 3：psql 命令行（需要数据库密码）

```bash
# 设置数据库 URL
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.saeplsevqechdnlkwjyz.supabase.co:5432/postgres"

# 执行 SQL 文件
psql $DATABASE_URL -f supabase/schema.sql
psql $DATABASE_URL -f supabase/rls.sql
```

## ✅ 验证安装

执行以下 SQL 验证表和策略是否创建成功：

```sql
-- 1. 检查表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('players', 'player_skills', 'grouping_history');

-- 2. 检查 RLS 是否启用
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('players', 'player_skills', 'grouping_history');

-- 3. 检查 RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('players', 'player_skills', 'grouping_history');

-- 4. 检查触发器
SELECT event_object_table, trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

## 🧪 测试 RLS 策略

```sql
-- 1. 创建测试用户（在 Supabase 中创建匿名用户）
-- 假设生成的 user_id 为: 'test-user-uuid'

-- 2. 设置当前用户身份
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "test-user-uuid"}';

-- 3. 测试插入数据（应该成功）
INSERT INTO players (user_id, name, position)
VALUES ('test-user-uuid', '测试球员', 'PG');

-- 4. 测试查询（应该返回刚才插入的数据）
SELECT * FROM players;

-- 5. 测试插入其他用户数据（应该失败）
INSERT INTO players (user_id, name, position)
VALUES ('other-user-uuid', '非法球员', 'SG');
-- 预期结果：ERROR: new row violates row-level security policy
```

## 📊 数据表结构

### players 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键（自动生成） |
| user_id | UUID | 用户 ID（关联 auth.users） |
| name | TEXT | 球员姓名 |
| position | TEXT | 位置（PG/SG/SF/PF/C/UTILITY） |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间（自动更新） |

### player_skills 表
| 字段 | 类型 | 说明 |
|------|------|------|
| player_id | UUID | 球员 ID（外键） |
| two_point_shot | INTEGER | 两分投篮（1-99） |
| three_point_shot | INTEGER | 三分投篮（1-99） |
| ... | ... | （共 19 项能力值） |
| overall | INTEGER | 总体能力（自动计算） |
| updated_at | TIMESTAMPTZ | 更新时间 |

### grouping_history 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键（自增） |
| user_id | UUID | 用户 ID |
| created_at | TIMESTAMPTZ | 创建时间 |
| mode | TEXT | 分组模式（5v5/3v3/custom） |
| team_count | INTEGER | 队伍数量 |
| player_count | INTEGER | 球员数量 |
| balance_score | REAL | 平衡度评分 |
| data | JSONB | 分组数据 |
| note | TEXT | 备注 |

## 🔄 overall 计算逻辑

`overall` 字段由触发器自动计算，使用位置加权算法：

- **PG（控卫）**：传球、控球、视野、三分权重高
- **SG（得分后卫）**：投篮、三分、速度权重高
- **SF（小前锋）**：全面型，各能力均衡
- **PF（大前锋）**：篮板、内线、力量权重高
- **C（中锋）**：篮板、盖帽、内线、力量权重高
- **UTILITY（万金油）**：简单平均

计算公式：
```
overall = ROUND(加权总分 / 权重总和)
```

## ⚠️ 注意事项

1. **执行顺序**：必须先执行 `schema.sql`，再执行 `rls.sql`
2. **匿名认证**：RLS 策略依赖 Supabase 的匿名认证，确保已启用
3. **级联删除**：`player_skills` 表使用 `ON DELETE CASCADE`，删除球员时自动删除能力值
4. **时区**：所有时间戳使用 `TIMESTAMPTZ`（带时区）
5. **UUID**：使用 `gen_random_uuid()` 生成 UUID，确保 PostgreSQL 扩展已启用

## 🔗 相关文档

- [Supabase 官方文档](https://supabase.com/docs)
- [Row Level Security 指南](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL 触发器](https://www.postgresql.org/docs/current/triggers.html)
- [项目规划文档](../supabase-planning.md)

## 📝 更新日志

- **2026-03-05**: Phase 1 完成，创建基础表结构和 RLS 策略
