# Supabase 数据库连接问题诊断报告

**日期**: 2026-03-15
**项目**: player-grouping
**问题**: SQL Agent 无法连接到 Supabase PostgreSQL 数据库

## 1. 问题现象

**错误信息**: `Tenant or user not found` 或 `Connection terminated unexpectedly`

**影响**: SQL Agent 无法执行自然语言查询

## 2. 已知配置

```env
SUPABASE_PROJECT_ID=saeplsevqechdnlkwjyz
SUPABASE_URL=https://saeplsevqechdnlkwjyz.supabase.co
SUPABASE_DB_PASSWORD=19910613lfch (length: 12)
```

**状态**:
- ✅ Supabase REST API 工作正常（项目活跃）
- ❌ PostgreSQL 直连失败

## 3. 诊断过程

### 3.1 环境变量问题（已修复）

**问题**: `SUPABASE_DB_PASSWORD` 在 `.env.local` 中，但 Vercel Dev 只加载 `.env`

**修复**: 已将 `SUPABASE_DB_PASSWORD` 添加到 `.env` 文件

**结果**: ✅ 环境变量加载成功

### 3.2 尝试的连接方案

#### 方案 A: Direct Connection (IPv6)

**连接字符串**:
```
postgres://postgres.saeplsevqechdnlkwjyz:[PASSWORD]@db.saeplsevqechdnlkwjyz.supabase.co:5432/postgres
```

**错误**: `Connection terminated unexpectedly`

**原因**: Supabase Direct connection 现在只支持 IPv6，本地网络可能不支持 IPv6

**参考**: https://medium.com/@lhc1990/solving-supabase-ipv6-connection-issues-the-complete-developers-guide-96f8481f42c1

#### 方案 B: Transaction Pooler (pgbouncer=true)

**连接字符串**:
```
postgres://postgres.saeplsevqechdnlkwjyz:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**错误**: `Tenant or user not found`

**原因**: 认证失败，可能是：
- 密码不正确或已过期
- 需要在 Supabase Dashboard 中重置密码
- Pooler 配置问题

#### 方案 C: Session Pooler (IPv4)

**连接字符串**:
```
postgres://postgres.saeplsevqechdnlkwjyz:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

**错误**: `Tenant or user not found`

**原因**: 同方案 B，认证失败

## 4. 根本原因分析

**最可能的原因**: 数据库密码不正确或已过期

**证据**:
1. 所有 Pooler 连接都返回 "Tenant or user not found"
2. Direct connection 失败（IPv6 问题）
3. REST API 工作正常（说明项目本身是活跃的）

**参考案例**:
- https://github.com/orgs/supabase/discussions/35749
- https://www.answeroverflow.com/m/1424762099539902484

## 5. 建议的修复方案

### 5.1 首选方案：重置数据库密码

1. 登录 Supabase Dashboard: https://supabase.com/dashboard
2. 进入项目 `saeplsevqechdnlkwjyz`
3. 导航到: **Settings** → **Database**
4. 找到 **Connection string** 部分
5. 点击 **Reset database password** 或复制新的连接字符串
6. 更新 `.env` 文件中的 `SUPABASE_DB_PASSWORD`
7. 重新测试

### 5.2 备选方案：使用 Supabase REST API

如果直连持续失败，可以重构 SQL Agent 使用 Supabase REST API:

**优点**:
- 不需要数据库密码
- REST API 已经在工作
- 更稳定（不依赖 IPv6/IPv4）

**缺点**:
- 需要重构代码
- 性能可能略低于直连
- 某些复杂 SQL 查询可能受限

### 5.3 临时方案：禁用 SQL Agent

在修复之前，可以暂时禁用 SQL Agent 功能：

```typescript
// src/lib/sql-agent/db-connection.ts
export const isSQLAgentEnabled = () => {
  return false; // 临时禁用
};
```

## 6. 代码修改记录

### 6.1 环境变量配置

**文件**: `.env`

**修改**: 添加 `SUPABASE_DB_PASSWORD`

```diff
+ # Database password for SQL Agent (direct connection)
+ SUPABASE_DB_PASSWORD=19910613lfch
```

### 6.2 数据库连接配置

**文件**: `src/lib/sql-agent/db-connection.ts`

**当前配置**: Session Pooler (IPv4)

```typescript
url: `postgres://postgres.${projectId}:${encodedPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`
```

## 7. 测试结果

| 方案 | 连接类型 | 错误信息 | 状态 |
|------|---------|---------|------|
| Direct Connection | IPv6 | Connection terminated unexpectedly | ❌ |
| Transaction Pooler | IPv4 | Tenant or user not found | ❌ |
| Session Pooler | IPv4 | Tenant or user not found | ❌ |
| REST API | HTTPS | N/A | ✅ |

## 8. 下一步行动

1. **立即**: 在 Supabase Dashboard 中重置数据库密码
2. **更新**: 将新密码更新到 `.env` 文件
3. **测试**: 重新运行测试脚本
4. **如果仍然失败**: 考虑使用 REST API 替代方案

## 9. 相关资源

- [Supabase Connection Troubleshooting](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase IPv6 Issue Guide](https://medium.com/@lhc1990/solving-supabase-ipv6-connection-issues-the-complete-developers-guide-96f8481f42c1)
- [GitHub Discussion #35749](https://github.com/orgs/supabase/discussions/35749)

---

**注意**: 此问题需要用户在 Supabase Dashboard 中操作才能完全解决。建议用户按照"首选方案"步骤重置数据库密码。
