# 生日魔塔 · 项目开发指南

## 项目概述

为儿子生日开发的魔塔风格 RPG 小游戏。13×13 网格，6 层塔，回合制自动战斗，经典像素风格。

- **技术栈**：Vite 7 + TypeScript + 原生 Canvas 2D，零运行时依赖
- **部署**：Cloudflare Pages（`wrangler.toml`）
- **个性化**：环境变量 `VITE_PLAYER_NAME` / `VITE_PLAYER_AGE` 定制生日祝福

## 核心架构

```
src/game/
├── config.ts       ← 所有数值配置（唯一调参文件）
├── engine.ts       ← 游戏主循环、状态机、战斗逻辑
├── floor.ts        ← Cell/Grid 类型定义、地图解析器
├── floors.ts       ← 6 层地图数据（从 docs/level/*.txt 转换）
├── player.ts       ← 玩家状态、升级、道具效果、开门
├── monster.ts      ← 怪物定义、战斗公式
├── renderer.ts     ← Canvas 渲染、右侧面板、Banner 定位
├── sprite-atlas.ts ← 精灵图加载与绘制
├── input.ts        ← 键盘输入
├── joystick.ts     ← 触屏虚拟摇杆
├── victory.ts      ← 胜利烟花特效
├── save.ts         ← localStorage 存档
├── debug.ts        ← 开发环境 debug 面板（仅 DEV）
```

## 地图设计流程

1. 用户在 `docs/level/L{n}.txt` 中用字符画设计地图（13×13）
2. 字符规则见 `docs/level/地图说明.md`
3. 空格 = 空地，代码中转换为 `.`
4. 开发者将 txt 转为 `floors.ts` 中的字符串数组
5. **转换命令**：
   ```bash
   node -e "
   const lines = require('fs').readFileSync('docs/level/L1.txt','utf8').replace(/\r/g,'').trim().split('\n');
   for (const line of lines) { console.log(\"    '\" + line.split('').map(c=>c===' '?'.':c).join('') + \"',\"); }"
   ```

### 楼梯标记规则
- `@` = 玩家初始位置（仅 L1）
- `!` = 从上层下来后出现的位置
- `U` = 上楼梯（走到这里去上一层）
- `D` = 下楼梯（走到这里去下一层）
- L1: 必须有 `@` + `U`，无 `D` `!`
- L2~L5: 必须有 `D` `@` `U` `!`
- L6: 必须有 `D` `@`，无 `U` `!`

## 数值配置

**所有游戏数值集中在 `src/game/config.ts`**，包括：
- 玩家初始属性、升级增益
- 道具效果（红/蓝药水、红/蓝宝石、★宝物倍率）
- 商店价格与增益
- 6 种怪物属性（HP/攻/防/金币/经验）
- 战斗最小伤害、动画时长

修改数值只需改这一个文件。

## UI 布局规则

详见 `docs/UI_SPEC.md`，核心要点：
- **13×13 画布独立居中**，不受其他元素影响
- Banner（楼层标识）和右侧面板通过**绝对定位**跟随画布
- 重新开始按钮在右侧面板下方，与画布底部对齐
- 右侧面板所有行统一布局：icon(24px) + label(flex:1) + value(右对齐min48px)
- 各分区标题上下有分隔线

## 战斗机制

- 无损失（damageTaken == 0）：直接战斗
- 有损失：弹出模态确认弹窗，显示对手信息和 HP 变化
- 致死警告：弹窗中红色提示 "⚠ 你会被击败！"
- 战斗胜利 toast：显示获得金币和经验
- 死亡：弹窗提示 + 重新开始按钮，清除存档

## 存档系统

- 存储：`localStorage`，key = `birthday-tower-save`
- 保存时机：战斗/拾取/开门/换层/商店购买
- 内容：楼层索引、玩家属性、所有楼层 grid 状态
- **地图更新后必须清存档**（点重新开始或清 localStorage），否则加载旧 grid

## Debug 工具

仅开发环境（`import.meta.env.DEV`）显示，左上角浮动面板：
- 楼层跳转：F1-F6 一键跳转
- 玩家属性：HP/攻/防/金 为 input 输入框（点击清空，keydown 阻止冒泡），经验/钥匙为 +/- 按钮
- 升级属性：所需经验、HP/攻/防增益
- 道具属性：红/蓝药水、红/蓝宝石效果（★宝物不可调）
- 怪物数值：6 种怪物 HP/攻/防/金/经验
- 所有分区可折叠
- **debug 只改内存运行时数据**，不写回 config.ts，刷新恢复

## 开发注意事项

1. **不要自作主张**：只改用户明确要求的内容，不做额外修改
2. **地图更新流程**：用户改 txt → 开发者转换更新 floors.ts → 提醒清存档
3. **怪物梯度**：每层一种主力怪物 + 混搭低层怪物，楼层越高越强
4. **钥匙紧缺设计**：主路径钥匙刚好够用，选错门需要重来
5. **★宝物陷阱**：L2 红门后，过早拿 = BOSS 必败，留到最后拿才能赢
6. **商人仅在 L3**
7. **L6 BOSS 层不变**：纯 BOSS 房，单一龙王决战
8. **生产构建不包含 debug 面板**
