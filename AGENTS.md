# Repository Guidelines（仓库指南）

## 项目结构与模块划分
本仓库是一个零依赖的静态前端工具，核心文件都位于根目录：

- `index.html`：页面结构与控件布局
- `styles.css`：视觉样式、布局和响应式规则
- `script.js`：裁剪状态、拖拽交互、预览与导出逻辑
- `demo.svg`：手动验证用示例资源
- `.github/workflows/`：CI 校验与 GitHub Pages 部署流程

仓库当前没有 `src/`、打包器或生成代码。优先在现有文件中扩展，避免为小改动引入额外工具链。

## 构建、测试与本地开发命令
- `python3 -m http.server 8000`：在 `http://localhost:8000` 本地预览页面
- `node --check script.js`：执行与 CI 一致的 JavaScript 语法检查
- `git status`：提交前确认没有混入无关改动

项目没有本地构建步骤。GitHub Pages 工作流会在 CI 中复制根目录的应用文件并生成 `dist/` 制品。

## 代码风格与命名约定
HTML、CSS、JavaScript 统一使用 2 空格缩进，并保持无依赖、原生浏览器运行的实现方式。

- JavaScript 使用 `camelCase`，常量使用 `UPPER_SNAKE_CASE`
- CSS 类名使用 kebab-case，例如 `.control-panel`、`.ratio-chip`
- DOM `id` 使用语义化 camelCase，例如 `imageInput`、`customRatioFields`

优先复用现有 CSS 自定义属性和交互模式，不要把功能修改与大范围重构混在同一个提交中。

## 测试要求
当前项目没有测试框架，主要依赖轻量校验和手动验证。提交前至少完成以下检查：

- 运行 `node --check script.js`
- 本地启动页面，验证上传图片、切换比例、拖动框体、角点缩放、重置、居中和 PNG/JPEG 导出
- 确认 `demo.svg` 仍可正常加载

如果后续新增自动化测试，请放在独立的 `tests/` 目录下，并按行为命名测试文件。

## 提交与 Pull Request 规范
现有提交信息以简短、祈使句风格为主，例如 `Refine cropper UI and add CI workflow`、`Fix Pages workflow parsing`。新提交请沿用这一模式。

PR 需要说明改动目的和影响范围；若涉及界面、交互或导出结果变化，请附截图或短录屏；如有关联 issue，一并链接。
