# 仓库指南

## 项目结构与模块组织

这是一个零运行时依赖、纯本地运行的浏览器图像工作台。`index.html` 定义单页界面，`styles.css` 汇总 `styles/` 下的分层样式，应用逻辑位于 `src/`。`src/app/` 负责 DOM 绑定、渲染、I/O 和动作编排；`src/lib/` 存放可复用的图像、状态、历史记录、导出和几何逻辑；`src/tools/` 存放各工具面板及其绑定。测试位于 `tests/`：顶层是 Node 单元测试，`tests/ui/` 是 Playwright UI 测试，`tests/perf/` 是性能 smoke 测试。根目录保留静态演示资产，例如 `demo.svg`。

## 构建、测试与本地开发命令

- `npm install`：安装开发工具，主要是 Playwright。
- `npm run check`：对 `src/`、`tests/`、`scripts/` 和 Playwright 配置运行 `node --check`。
- `npm run lint`：检查文本文件结尾换行、缩进和尾随空白。
- `npm test`：使用 `node:test` 运行 Node 单元测试。
- `npm run test:ui:functional`：运行排除视觉基线检查的 Playwright UI 测试。
- `npm run test:visual`：只运行视觉快照测试。
- `npm run test:ui:update`：在有意调整 UI 后更新 Playwright 视觉快照。
- `npm run test:perf`：运行 24MP 性能 smoke 测试。
- `npm run test:all`：依次运行语法检查、lint、单元测试、功能 UI 测试和性能检查。
- `node scripts/serve-static.mjs --port 4173`：启动本地静态服务；也可以直接打开 `index.html`。

## 编码风格与命名规范

使用 ES modules、2 空格缩进、双引号、分号，以及 `const`/`let`。函数和变量使用 `camelCase`，导出常量使用 `UPPER_SNAKE_CASE`，测试文件命名为 `*.test.js` 或 `*.spec.js`。共享纯逻辑放在 `src/lib/`；浏览器事件和 DOM 相关代码放在 `src/app/` 或 `src/tools/`。

## 测试指南

纯逻辑和状态转换应补充 Node 测试。依赖 DOM 行为、canvas 渲染、响应式布局或浏览器 API 的流程应补充 Playwright 规格测试。更新视觉基线时要检查快照差异。性能测试用于发现大图路径回归，不作为严格耗时门禁。

## 提交与 Pull Request 指南

提交历史采用简短、祈使语气、句首大写的英文主题，例如 `Fix expanded preview sizing and refine UI typography` 或 `Add adjustment tools and redesign the workspace UI`。每个提交应聚焦一个行为变化。Pull Request 应包含简明摘要、相关 issue、已运行的命令，以及 UI 变更对应的截图或快照说明。

## 安全与配置提示

除非变更明确需要，否则保持所有处理在浏览器本地完成。避免新增网络请求、第三方运行时依赖或远程资产；如确需添加，应说明原因和隐私影响。
