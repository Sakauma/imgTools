# imgTools

一个运行时零依赖、纯本地运行的基础图像工具箱。

当前版本提供：

- 裁剪：预设比例、自定义比例、拖拽与缩放裁剪框
- 旋转与翻转：左转、右转、180 度、水平翻转、垂直翻转
- 调整尺寸：按输出宽高进行缩放，可锁定宽高比
- 图像调整：亮度、对比度、饱和度、色温、色调、灰度、棕褐色、反相、模糊、锐化
- 外观：目标比例扩边、背景填充、圆角、内侧边框
- 导出：PNG、JPEG、WebP，支持文件名和质量控制
- 历史记录：撤销与重做

## 使用方式

直接用浏览器打开 [index.html](./index.html) 即可，或运行任意静态文件服务。

## 目录结构

- `index.html`：单页工作台结构
- `styles.css`：样式入口，聚合 `styles/` 下的分层样式
- `styles/`：设计变量、布局、面板、控件和工具面板样式
- `src/`：模块化前端逻辑
- `tests/`：单元测试、桌面/移动端 UI 回归、视觉基线和性能 smoke
- `.github/workflows/`：CI 校验与 GitHub Pages 发布流程

## 开发检查

- `npm run check`：检查所有 JavaScript 文件语法
- `npm test`：运行纯函数测试
- `npm run test:ui`：运行 Playwright 浏览器级回归测试
- `npm run test:ui:update`：更新 Playwright 视觉基线截图
- `npm run test:perf`：运行 24MP 桌面端性能 smoke 测试
- `npm run test:all`：依次运行单元测试、UI 回归和性能 smoke

Playwright 的 UI 和性能测试需要本地可用的浏览器环境；仓库内已经自带稳定静态服务脚本用于本地和 CI 的测试启动。
