# 生日魔塔

一个基于 Vite + TypeScript + 原生 Canvas 的魔塔风格生日彩蛋小游戏，支持桌面键盘与 iPad 触摸操作，通关后播放生日烟花动画。

## 开发

```bash
npm install
cp .env.example .env
npm run dev
```

默认开发地址为 `http://localhost:5173`。

## 构建

```bash
npm run build
```

构建输出目录为 `dist/`。

## 环境变量

项目通过 `import.meta.env` 读取以下变量：

```env
VITE_PLAYER_NAME=小朋友
VITE_PLAYER_AGE=6
```

- `VITE_PLAYER_NAME`：生日祝福中的名字
- `VITE_PLAYER_AGE`：生日祝福中的年龄

## 操作方式

- 键盘：`WASD` / 方向键移动，`Space` 攻击前方，`E` 使用物品
- 触摸：左下角方向键移动，右下角 `攻击` / `物品` 按钮操作

## iPad 适配

- 锁定 viewport 缩放，防止双击缩放
- 禁用长按菜单、文本选中、手势缩放和双击手势
- 底部提供大尺寸虚拟按键，避免误触

## 素材致谢

本项目使用 `ckcz123/mota-js` 提供的像素素材，涵盖 `terrains`、`items`、`animates`、`enemys`、`hero` 等图集。

- 授权协议：BSD-3-Clause
- 著作权归属：`ckcz123`
- 第三方许可证全文见 `LICENSE-THIRD-PARTY.md`

## 部署到 Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist
```
