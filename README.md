# imgTools

一个零依赖、纯本地运行的基础图像工具箱。

当前版本提供：

- 裁剪：预设比例、自定义比例、拖拽与缩放裁剪框
- 旋转与翻转：左转、右转、180 度、水平翻转、垂直翻转
- 调整尺寸：按输出宽高进行缩放，可锁定宽高比
- 导出：PNG、JPEG、WebP，支持文件名和质量控制
- 历史记录：撤销与重做

## 使用方式

直接用浏览器打开 [index.html](./index.html) 即可，或运行任意静态文件服务。

## 目录结构

- `index.html`：单页工作台结构
- `styles.css`：界面样式
- `src/`：模块化前端逻辑
- `tests/`：纯函数测试
- `.github/workflows/ci.yml`：语法与测试校验

## 开发检查

- `npm run check`：检查所有 JavaScript 文件语法
- `npm test`：运行纯函数测试
- `npm run test:ui`：运行 Playwright 浏览器级回归测试
- `npm run test:all`：依次运行单元测试与浏览器测试
