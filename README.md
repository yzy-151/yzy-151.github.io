# Agent Systems Portfolio

面向 Agent / RAG 算法工程方向的匿名技术作品集，重点展示：

- [PaperStorm Agent](https://github.com/yzy-151/paperstorm-agent)
- [Nonlinear NN Agent](https://github.com/yzy-151/nonlinear-nn-agent)
- 其余公开算法、工具与早期项目归档

站点使用纯 HTML、CSS 和原生 JavaScript，不需要构建步骤或运行时依赖。

## 本地预览

```powershell
python -m http.server 8088
```

访问 `http://127.0.0.1:8088/`。

## 验证

```powershell
python -m unittest discover -s tests -v
node --check assets/app.js
```

## 发布

仓库 `main` 分支根目录由 GitHub Pages 自动发布到：

<https://yzy-151.github.io/>
