# Sprite Atlas Index (mota-js)

所有图集都是 32 像素宽、垂直排列，第 N 项的 sprite 位置：x=0, y=N*32 (单位 px)。
hero.png 特殊：32x48 一格，4 行(下/左/右/上) × 3 列(stop/leftFoot/rightFoot)。

## terrains.png（地形, 32×32 each）
| name | index | 用途 |
|---|---|---|
| ground | 0 | 普通地砖（推荐当 floor 用，干净）|
| grass | 1 | 草地 1（花花的，不要用）|
| grass2 | 2 | 草地 2（不要用）|
| ground2 | 3 | 地砖 2 |
| ground3 | 4 | 地砖 3 |
| downFloor | 5 | 下楼梯 ✅ |
| upFloor | 6 | 上楼梯 ✅ |

## animates.png（动画/门, 32×32, 取第一帧即可）
| name | index | 用途 |
|---|---|---|
| yellowDoor | 4 | 黄门 ✅ |
| blueDoor | 5 | 蓝门 ✅ |
| redDoor | 6 | 红门 ✅ |

## items.png（道具, 32×32 each）
| name | index | 用途 |
|---|---|---|
| yellowKey | 0 | 黄钥匙 ✅ |
| blueKey | 1 | 蓝钥匙 ✅ |
| redKey | 2 | 红钥匙 ✅ |
| redPotion | 20 | 红药水 ✅ |
| bluePotion | 21 | 蓝药水 ✅ |
| greenPotion | 22 | 绿药水 |
| redGem | 16 | 红宝石 |
| blueGem | 17 | 蓝宝石 ✅（用作 gem）|
| greenGem | 18 | 绿宝石 |
| sword1 | 50 | 铁剑（可用作攻击装备图标）|
| shield1 | 55 | 铁盾 |
| coin | 11 | 金币 |

## enemys.png（怪物, 32×32 each, 注意源图宽 64=2 列，但每个怪 32 宽位于左列）
**重要**：enemys.png 实际是 64×N，每个怪占 32×32 在 (x=0, y=index*32)。
另外可能存在第 2 列（x=32）作为同怪物的另一帧或不同怪。我们只取第 1 列。

| name | index | 我们的映射 |
|---|---|---|
| greenSlime | 0 | - |
| skeleton | 8 | **skeleton** ✅ |
| zombie | 12 | **zombie** ✅ |
| bat | 4 | **spider**（用蝙蝠代替蜘蛛）✅ |
| bigBat | 5 | - |
| swordsman | 23 | - |
| skeletonCaptain | 10 | - |
| brownWizard | 18 | **creeper**（用棕巫师代替苦力怕）✅ |
| darkKnight | 27 | **enderman**（用暗黑骑士代替末影人）✅ |
| dragon | 56 | **wither**（用龙代替凋灵 BOSS）✅ |

## hero.png（主角, 32×48 each, 4 行 × 3 列）
布局（行 / 列）:
- 行 0 = down（朝下）
- 行 1 = left
- 行 2 = right
- 行 3 = up

每行 3 列：
- 列 0 = stop（站立）
- 列 1 = leftFoot（左脚迈出）
- 列 2 = rightFoot（右脚迈出）

行走动画：stop → leftFoot → stop → rightFoot → 循环

## 我们最终用到的 sprite map（建议直接照抄到代码）

```ts
export const ATLAS = {
  hero: { src: '/sprites/hero.png', frameW: 32, frameH: 48, dirs: { down: 0, left: 1, right: 2, up: 3 } },
  // terrains.png
  floor:     { src: '/sprites/terrains.png', x: 0, y: 0  * 32, w: 32, h: 32 }, // ground
  wall:      null, // 走 animates.png 的 yellowWall(10)/whiteWall(11)/blueWall(12) 任选；或者直接用 sWall* 系列。简单起见用 ground 反色或自己画一个深色矩形
  stairUp:   { src: '/sprites/terrains.png', x: 0, y: 6  * 32, w: 32, h: 32 }, // upFloor
  stairDown: { src: '/sprites/terrains.png', x: 0, y: 5  * 32, w: 32, h: 32 }, // downFloor
  // animates.png（门，取每一帧的第一帧 = x:0）
  doorYellow: { src: '/sprites/animates.png', x: 0, y: 4 * 32, w: 32, h: 32 },
  doorBlue:   { src: '/sprites/animates.png', x: 0, y: 5 * 32, w: 32, h: 32 },
  doorRed:    { src: '/sprites/animates.png', x: 0, y: 6 * 32, w: 32, h: 32 },
  // items.png
  keyYellow:  { src: '/sprites/items.png', x: 0, y: 0  * 32, w: 32, h: 32 },
  keyBlue:    { src: '/sprites/items.png', x: 0, y: 1  * 32, w: 32, h: 32 },
  keyRed:     { src: '/sprites/items.png', x: 0, y: 2  * 32, w: 32, h: 32 },
  redPotion:  { src: '/sprites/items.png', x: 0, y: 20 * 32, w: 32, h: 32 },
  bluePotion: { src: '/sprites/items.png', x: 0, y: 21 * 32, w: 32, h: 32 },
  gem:        { src: '/sprites/items.png', x: 0, y: 17 * 32, w: 32, h: 32 }, // blueGem
  // enemys.png（取左列 x:0，每个怪 32×32）
  zombie:    { src: '/sprites/enemys.png', x: 0, y: 12 * 32, w: 32, h: 32 },
  skeleton:  { src: '/sprites/enemys.png', x: 0, y: 8  * 32, w: 32, h: 32 },
  spider:    { src: '/sprites/enemys.png', x: 0, y: 4  * 32, w: 32, h: 32 }, // bat
  creeper:   { src: '/sprites/enemys.png', x: 0, y: 18 * 32, w: 32, h: 32 }, // brownWizard
  enderman:  { src: '/sprites/enemys.png', x: 0, y: 27 * 32, w: 32, h: 32 }, // darkKnight
  wither:    { src: '/sprites/enemys.png', x: 0, y: 56 * 32, w: 32, h: 32 }, // dragon (BOSS)
};
```

## 墙（wall）方案
terrains.png 第 21-34 都是 sWall* 系列（带方向的墙），单独的全墙没现成。简单做法：
- 用一个深灰色 `fillRect` 加几条暗纹自己画，覆盖在 floor 之上
- 或者用 animates.png 的 whiteWall(11) / yellowWall(10)（取第 11/10 个 32×32）

推荐：用 animates.png 第 11 项 whiteWall 当墙。
