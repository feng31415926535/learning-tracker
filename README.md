# Learning Tracker

学习进度追踪工具，支持任务管理、进度统计、星级评分和学后测试。

## 功能特性

- 📊 **进度追踪** - 实时统计学习进度，可视化展示完成情况
- ⭐ **星级评分** - 完成学习任务后进行自我评价
- 🎯 **智能筛选** - 按必看、倍速、跳过等状态筛选任务
- 🤖 **学后测试** - 基于 LLM 生成个性化测试题
- 🌙 **暗色/亮色主题** - 舒适的视觉体验
- 💾 **本地存储** - 数据保存在本地浏览器，永不丢失
- 🔌 **连接测试** - 一键测试 LLM 配置是否正确

## 技术栈

- Vue 3 + Composition API
- TypeScript
- Pinia (状态管理)
- Vite (构建工具)
- @vueuse/core (工具函数)

## 开始使用

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

## 项目结构

```
src/
├── components/     # Vue 组件
├── stores/        # Pinia 状态管理
├── types/         # TypeScript 类型定义
├── styles/        # 全局样式
└── App.vue        # 根组件
```

## License

MIT
