# 高中物理可视化实验室

一个面向高中物理教学与视频演示的交互式实验室站点，基于 `React + TypeScript + Vite` 构建。

当前包含：

- 力学与波动实验：单摆、抛体、弹簧振子、碰撞、机械波、双缝干涉
- 单独的真题交互页：离子注入磁分析器可视化解题页面
- 面向 GitHub Pages 的部署配置：相对资源路径 + `HashRouter`

## 本地开发

```bash
npm install
npm run dev
```

## 构建检查

```bash
npm run build
npm run lint
```

## GitHub Pages

这个项目已经改成适合静态托管的形式：

- `vite.config.ts` 使用 `base: './'`
- 路由使用 `HashRouter`
- 发布产物可直接放到 `docs/` 目录由 GitHub Pages 托管

因此无论托管在 `username.github.io/repo-name/` 还是其他静态目录下，都可以直接打开。
