# Img_Deskewing_Ts 🖼️✨

**图片半自动拉直工具 · 浏览器版**

基于 OpenCV.js 的浏览器端图像去歪斜工具。无需安装任何软件，打开浏览器即可使用。

> **在线体验**：https://aldiba.github.io/Img_Deskewing_Ts/
>
> **Python 原版**：[Img_Deskewing](../Img_Deskewing)

---

## 功能特色

- **半自动拉直**：点击背景颜色，自动检测前景轮廓并旋转摆正
- **颜色容差调节**：滑块控制颜色容差，适应不同背景复杂度
- **实时预览框**：青色矩形框预览检测区域
- **批量处理**：一次上传多张图片，依次处理
- **批量下载**：全部处理完成后一键下载所有结果
- **拖拽上传**：支持拖拽图片文件到页面
- **纯前端**：所有处理在浏览器本地完成，不上传服务器

## 使用方式

```bash
# 开发
npm install
npm run dev

# 构建
npm run build    # 输出到 build/

# 部署到 GitHub Pages
npm run deploy   # gh-pages -d build
```

### GitHub Pages 部署配置

1. 在 GitHub 仓库 **Settings → Pages** 中设置：
   - Source: **GitHub Actions**（推荐）或 **Deploy from branch**
   - Branch: `main` / folder: `/`（使用 `gh-pages` 分支自动管理）

2. 或者在仓库中启用 GitHub Actions，使用 [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages)

## 技术栈

| 层 | 技术 |
|---|------|
| **框架** | React 18 + TypeScript |
| **构建** | Vite 7 |
| **样式** | TailwindCSS 4 + daisyUI 5 |
| **图像处理** | OpenCV.js 4.10 (CDN, ~8MB WASM) |
| **部署** | GitHub Pages |

## 项目结构

```
Img_Deskewing_Ts/
├── index.html                  # 入口页面
├── package.json
├── vite.config.js
├── tsconfig.json
├── src/
│   ├── main.tsx                # React 入口
│   ├── App.tsx                 # 根组件（状态管理 + 事件协调）
│   ├── types.ts                # 共享类型
│   ├── index.css               # Tailwind + daisyUI 样式
│   ├── utils/
│   │   ├── opencv.ts           # OpenCV.js 异步加载器
│   │   ├── processing.ts       # 核心图像处理
│   │   └── cv.d.ts             # OpenCV.js 类型声明
│   └── components/
│       ├── ImageCanvas.tsx      # Canvas 交互（缩放/平移/取色）
│       ├── ControlPanel.tsx     # 控制面板（容差 + 按钮）
│       └── ColorPreview.tsx     # 颜色预览
├── build/                      # 构建输出
└── README.md
```

## 核心算法

与 Python 版一致：

1. 用户取色 → 颜色容差 inRange 生成背景 mask
2. mask 反色 → findContours 提取前景轮廓
3. minAreaRect 求最小外接矩形 → 角度归一化 [-45, 45]
4. 单次 warpAffine 仿射变换（旋转 + 平移裁剪合并）

## 操作说明

| 操作 | 方式 |
|------|------|
| 上传图片 | 点击「选择图片」或拖拽到上传区 |
| 取色 | 左键点击图片背景区域 |
| 调容差 | 拖动滑块，实时更新青色预览框 |
| 预览 | 点击「预览」在新窗口查看效果 |
| 确认并下一张 | 点击「确认」处理当前并进入下一张 |
| 跳过 | 不处理直接进入下一张 |
| 下载 | 全部处理完后点击「下载全部」 |
| 缩放 | 鼠标滚轮 |
| 平移 | 右键拖拽 |

## License

MIT
