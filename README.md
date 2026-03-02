# 球员分组程序 (Player Grouping Tool)

一个智能的球员分组 Web 应用，可以根据球员能力和位置自动分配到平衡的团队。

## ✨ 功能特性

- 📊 球员管理：添加、编辑、删除球员信息
- 🎯 能力评估：为球员的各项能力打分
- 🔄 智能分组：自动将球员分配到平衡的团队
- 💾 数据持久化：本地存储球员数据
- 📱 响应式设计：支持桌面和移动设备

## 🛠️ 技术栈

- **前端框架：** React 18 + TypeScript
- **构建工具：** Vite
- **样式方案：** CSS Modules / Tailwind CSS
- **状态管理：** React Hooks
- **数据存储：** LocalStorage

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 📁 项目结构

```
player-grouping/
├── src/
│   ├── components/          # React 组件
│   │   ├── PlayerForm/      # 球员表单组件
│   │   ├── PlayerList/      # 球员列表组件
│   │   └── TeamView/        # 团队展示组件
│   ├── utils/               # 工具函数
│   │   ├── groupingAlgorithm.ts  # 分组算法
│   │   └── storage.ts       # 本地存储工具
│   ├── types/               # TypeScript 类型定义
│   │   └── player.ts        # 球员相关类型
│   ├── App.tsx              # 主应用组件
│   └── main.tsx             # 应用入口
├── public/                  # 静态资源
└── package.json
```

## 🎮 使用指南

1. **添加球员**
   - 填写球员姓名
   - 评估球员能力（1-10分）
   - 选择球员位置偏好

2. **设置分组参数**
   - 设置团队数量
   - 选择分组策略（能力平衡、随机等）

3. **执行分组**
   - 点击"开始分组"按钮
   - 查看分组结果
   - 可以重新分组或调整

## 🧮 分组算法

当前支持以下分组策略：

- **能力平衡**：确保每个团队的总能力值接近
- **位置平衡**：确保每个团队有合适的位置分配
- **随机分组**：完全随机分配球员

## 📝 开发计划

- [ ] 支持导入/导出球员数据
- [ ] 添加更多分组算法
- [ ] 支持历史记录查看
- [ ] 添加球员头像上传
- [ ] 支持团队战术设置
- [ ] 添加多语言支持

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 👨‍💻 作者

Julius - [GitHub](https://github.com/julius19910613)
