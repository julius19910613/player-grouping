# Phase 1 测试清单 - UI 重构基础组件

## 测试目标
验证 Phase 1 开发的 UI 基础组件是否正常工作

## 1. 组件文件验证
- [ ] `src/components/ShellBar.tsx` 存在
- [ ] `src/components/ChatView.tsx` 存在
- [ ] `src/components/MessageList.tsx` 存在
- [ ] `src/components/ChatInput.tsx` 存在
- [ ] `src/types/chat.ts` 存在

## 2. 路由配置验证
- [ ] `src/App.tsx` 中配置了 `/` → ChatView
- [ ] 现有路由未被破坏（`/players`, `/grouping`）
- [ ] 路由导航正常工作

## 3. TypeScript 编译检查
- [ ] `npm run build` 成功无错误
- [ ] 所有组件类型定义正确
- [ ] 没有 TypeScript 错误

## 4. 组件功能测试
### ShellBar 组件
- [ ] 桌面端显示正常
- [ ] 移动端响应式正常
- [ ] 导航链接可点击

### ChatView 组件
- [ ] 主界面显示正常
- [ ] 包含 MessageList 和 ChatInput
- [ ] 布局响应式正常

### MessageList 组件
- [ ] 空状态显示正常
- [ ] 消息列表渲染正常
- [ ] 加载状态显示正常
- [ ] 错误处理正常

### ChatInput 组件
- [ ] 输入框可输入
- [ ] Enter 发送消息
- [ ] Shift+Enter 换行
- [ ] 发送按钮可点击

## 5. 单元测试验证
- [ ] 运行 `npm test`
- [ ] ChatInput.test.tsx 全部通过（9/9）
- [ ] ChatView.test.tsx 全部通过（5/5）
- [ ] 总计：14/14 测试通过

## 6. 代码质量检查
- [ ] 没有 console.log 残留
- [ ] 没有 TODO 注释未处理
- [ ] 代码格式符合 ESLint 规则
- [ ] 组件命名规范

## 7. 现有功能回归测试
- [ ] `/players` 页面正常
- [ ] `/grouping` 页面正常
- [ ] 现有功能未受影响

## 验收标准
- ✅ 所有组件文件存在
- ✅ TypeScript 编译成功
- ✅ 所有单元测试通过（14/14）
- ✅ 现有功能未受影响
- ✅ 代码质量良好

## 测试报告格式
完成后输出 JSON 报告到 `docs/test-reports/phase1-test-report.json`
