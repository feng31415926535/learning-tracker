# 学后测试历史记录功能设计文档

**日期**：2026-05-31
**功能名称**：Test History Feature（学后测试历史记录）

---

## 1. 需求概述

### 1.1 功能目标
为学后测试模块增加历史记录功能，支持：
- 保存每次测试的完整答题记录
- 在测试完成后查看答题详情
- 从章节入口查看历史测试记录
- 支持清空所有历史记录

### 1.2 用户需求
- 选项 C：在每个章节旁边增加"历史测试记录"入口
- 保存每道题的答题详情（题目、选项、你的答案、正确答案、解析）
- 选项 A：在当前测试弹窗内切换到详情视图
- 选项 C：可以清空所有历史记录

---

## 2. 数据结构设计

### 2.1 新增类型定义

```typescript
// src/types/index.ts

/**
 * 单道题的答题记录
 */
export interface TestAnswerRecord {
  questionId: string
  question: string
  options: string[]
  userAnswer: number | null  // 用户选择的选项索引
  correctAnswer: number
  explanation: string
  isCorrect: boolean
}

/**
 * 单次测试的完整记录
 */
export interface TestHistoryRecord {
  id: string
  chapterId: string
  chapterTitle: string
  planId: string
  planName: string
  score: number
  totalQuestions: number
  scorePercentage: number
  timeSpent: number  // 用时（秒）
  answers: TestAnswerRecord[]
  createdAt: string  // ISO 时间戳
}
```

### 2.2 存储方案
- **存储位置**：localStorage
- **存储 Key**：`learning-tracker-data-test-history`
- **数据格式**：`TestHistoryRecord[]` 数组

---

## 3. UI/组件设计

### 3.1 TestModal.vue 视图状态

TestModal 支持 5 种视图状态：

| 状态 | 说明 |
|------|------|
| `loading` | 生成题目中（现有） |
| `answering` | 答题中（现有） |
| `result` | 结果页（现有，增加"查看详情"按钮） |
| `detail` | 答题详情视图（新增） |
| `history` | 历史记录列表（新增） |

### 3.2 答题详情视图（detail）

**布局**：
- 顶部：分数概览（同 result 页）
- 主体：题目列表（可滚动）
  - 每道题显示：题目、选项（高亮答案）、解析
- 底部：操作按钮
  - "返回结果页"
  - "关闭"

### 3.3 历史记录列表视图（history）

**布局**：
- 顶部：
  - 标题："📜 历史测试记录"
  - 按钮："清空记录"
- 主体：记录列表（按时间倒序）
  - 列表项：
    - 时间：`YYYY-MM-DD HH:mm`
    - 章节名称
    - 分数：`80% (8/10)`
    - 用时：`5分30秒`
    - 按钮："查看详情"
- 空状态："暂无测试记录"

### 3.4 ChapterSection.vue 改动

在章节标题右侧增加"📜 历史记录"按钮。

---

## 4. 交互流程设计

### 流程 1：完成测试 → 查看详情

```
用户完成测试
    ↓
显示结果页（现有）
    ↓
点击"查看答题详情"按钮（新增）
    ↓
切换到 detail 视图
    ↓
查看每道题的答题情况
    ↓
可"返回结果页"或"关闭"
```

### 流程 2：保存历史记录

```
用户点击"完成"关闭测试
    ↓
自动保存记录到 localStorage
    ↓
弹窗关闭
```

### 流程 3：从章节进入历史记录

```
用户点击章节旁的"📜 历史记录"按钮
    ↓
打开 TestModal，直接进入 history 视图
    ↓
显示该章节的历史测试列表
    ↓
点击某条记录的"查看详情"
    ↓
切换到 detail 视图展示该次记录
    ↓
可"返回历史列表"或"关闭"
```

### 流程 4：清空历史记录

```
在历史记录列表页
    ↓
点击"清空记录"按钮
    ↓
弹出确认提示
    ↓
确认后清空 localStorage 中的历史数据
```

---

## 5. 技术实现方案

### 5.1 文件修改清单

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `src/types/index.ts` | 新增类型 | `TestAnswerRecord`, `TestHistoryRecord` |
| `src/stores/planStore.ts` | 新增状态/方法 | 历史记录的存储、读取、清空方法 |
| `src/components/TestModal.vue` | 大幅修改 | 新增视图状态、详情视图、历史列表视图 |
| `src/components/ChapterSection.vue` | 小幅修改 | 新增"历史记录"按钮 |
| `src/App.vue` | 小幅修改 | 传递 `initialView` prop 给 TestModal |

### 5.2 planStore.ts 新增内容

```typescript
// State
const testHistory = useLocalStorage<TestHistoryRecord[]>('learning-tracker-data-test-history', [])

// Actions
function saveTestHistory(record: TestHistoryRecord)
function getTestHistoryByChapter(chapterId: string): TestHistoryRecord[]
function clearTestHistory()
```

### 5.3 TestModal.vue 新增内容

- **Props**：`initialView?: 'test' | 'history'`（默认 'test'）
- **State**：
  - `viewMode`: 'loading' | 'answering' | 'result' | 'detail' | 'history'
  - `selectedHistoryRecord`: TestHistoryRecord | null
- **Methods**：
  - `saveCurrentTest()`: 保存当前测试到历史
  - `showHistory()`: 切换到历史列表
  - `showDetail(record)`: 显示某条记录的详情
  - `clearHistory()`: 清空历史记录

---

## 6. 实现方案选择

采用**方案一：最小改动方案**

**理由**：
- 改动最小，不影响现有架构
- 用户体验连贯（一个弹窗搞定所有）
- 复用现有答题 UI 组件
- 风险最低

---

## 7. 验收标准

- [ ] 类型定义完整并正确导入
- [ ] 测试完成后自动保存历史记录
- [ ] 结果页有"查看答题详情"按钮，点击可查看每道题详情
- [ ] 章节旁有"📜 历史记录"按钮，点击打开历史列表
- [ ] 历史列表按时间倒序显示，可查看详情
- [ ] 支持"清空所有历史记录"功能
- [ ] 所有交互流程正常工作
- [ ] 样式与现有设计保持一致
