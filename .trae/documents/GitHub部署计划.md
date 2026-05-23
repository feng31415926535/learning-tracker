
# 项目上传 GitHub 并部署到 GitHub Pages 计划

## 项目现状分析

- **项目类型**: Vue 3 + TypeScript + Vite 单页应用
- **构建工具**: Vite
- **已有文件**: package.json、vite.config.ts、.gitignore、README.md
- **Git 状态**: 尚未初始化 Git 仓库

## 实施步骤

### 第一步：初始化 Git 仓库
1. 在项目目录运行 `git init` 初始化 Git
2. 创建 `.gitignore` 文件（已有）
3. 提交初始代码到本地仓库

### 第二步：配置 Vite 用于 GitHub Pages
1. 修改 `vite.config.ts`，添加 `base` 配置以支持 GitHub Pages 的路径
2. 确保构建输出目录正确配置

### 第三步：创建 GitHub 仓库
1. 使用 GitHub CLI 创建名为 `learning-tracker` 的公开仓库
2. 关联本地仓库到远程

### 第四步：推送代码到 GitHub
1. 添加远程仓库地址
2. 推送代码到 `main` 分支

### 第五步：配置 GitHub Pages 部署
- **方案一**：使用 GitHub Actions 自动部署（推荐）
  - 创建 `.github/workflows/deploy.yml` 工作流文件
  - 配置每次推送到 `main` 分支时自动构建并部署
  
- **方案二**：手动部署
  - 本地运行 `npm run build`
  - 推送 `dist` 目录到 `gh-pages` 分支

### 推荐方案：GitHub Actions 自动部署

**理由**：
- 自动化部署，无需手动操作
- 每次代码更新自动构建并发布
- 符合现代 CI/CD 最佳实践

## 文件修改清单

1. **vite.config.ts** - 添加 `base` 路径配置
2. **新增** `.github/workflows/deploy.yml` - GitHub Actions 工作流
3. **package.json** - 可选择添加 deploy 脚本

## 风险与注意事项

1. **Git 初始化**：确保正确初始化仓库
2. **路径问题**：GitHub Pages 路径配置是关键，必须正确设置
3. **权限问题**：确保 GitHub CLI 有创建仓库的权限
4. **Actions 配置**：工作流文件需要正确配置才能正常运行

## 成功标准

- ✅ 代码成功推送到 GitHub 仓库
- ✅ GitHub Pages 正确配置并可访问
- ✅ 应用在 GitHub Pages 上正常运行
- ✅ 后续代码更新能自动部署
