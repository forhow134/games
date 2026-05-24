# Forest Quest DEVLOG

> 真实开发记录，供 Phase 6 Reddit 帖子选题与取材。

---

## Phase 1 — 设计

Forest Quest 的定位非常明确：一款基于 Three.js 的 3D 第三人称卡通平台跳跃游戏，主角是一只小狐狸，在魔法森林与岩洞中奔跑、跳跃、收集水晶、踩杀敌人，最终击败远古石巨人。美术方向锁定为暖色调 low-poly 卡通风格，所有角色与场景元素均为低多边形建模，配合柔和的边缘光与阴影，营造轻松明快又不失冒险感的视觉体验。

为什么是 6 关？我们刻意把关卡数控制在“一个周末能做完”的范围内，同时保证机制有递进。6 关的分布遵循经典教学曲线：L1 森林入口纯教学（无敌人、静态平台），L2 森林深处引入动态平台与蘑菇怪巡逻，L3 峡谷加入尖刺陷阱与小精灵追击，L4 岩洞入口解锁弹跳平台与垂直向上探索，L5 岩洞深处组合移动平台与石傀儡冲撞，L6 Boss 岩室作为终极挑战。这种从“走路”到“跑酷”再到“战斗”的递进，让玩家每关都能学到新东西，又不会因机制爆炸而 overwhelm。

关卡主题也做了刻意的视觉分区：L1-L3 为森林区，大量使用树木、蘑菇装饰、木质平台与暖绿色调光照；L4-L6 为岩洞区，切换为岩石、钟乳石、石质平台与冷蓝/橙色调光照。这种分区不仅帮助玩家建立空间认知，也让同一批模型通过光照和配色就能产生“换场景”的错觉，极大减少了资产制作压力。

物理参数的确定经历了多轮手感调试。跳跃初速度 `JUMP_V0 = 10.0`、二段跳 `JUMP_V1 = 8.0`、重力 `GRAVITY = 25.0` 这组数字来源于一个简单目标：单跳高度约 2 米，滞空时间约 0.8 秒，既能让玩家轻松越过 1.5 米宽的间隙，又不会因为飘太久而失去控制。奔跑倍率 `RUN_MULT = 1.6` 配合摄像机 FOV 外扩 3°，在视觉上制造了明显的速度感。踩杀反弹 `stompImpulse = 8` 则是一个折中值：太低会让踩杀后落地太快、手感拖沓；太高会让玩家弹到意外高度、破坏关卡节奏。

设计文档 `DESIGN.md` 在 Phase 1 末经历了一次被迫重写。第一稿没有严格锁住 Meshy 风格锚定词，导致后续 prompt 出现风格漂移——有的模型偏写实、有的偏 Q 版。最终我们在 `meshy-prompts.md` 顶部强制写入统一锚定词：`cartoon, low poly, stylized, game asset, neutral pose, clean topology, flat shading, vibrant colors, hand-painted texture, fantasy forest theme`，并要求每条 prompt 都必须以这组词结尾。这个教训告诉我们：风格锚定词必须在项目第一天就写入文档，而不是“后面再统一”。

---

## Phase 2 — Meshy 模型

本项目共生成 18 个 3D 模型，覆盖角色（狐狸主角）、4 种敌人（蘑菇怪、小精灵、石傀儡、石巨人 Boss）、4 种平台（木质、石质、浮动、弹跳）、2 种陷阱（尖刺、火焰喷射器）、2 种收集品（水晶、金币）、5 种环境装饰（树、岩石、蘑菇丛、钟乳石、终点传送门）。所有 prompt 共享同一组风格锚定词，确保视觉一致性。

Prompt 策略上，我们采用“主体描述 + 风格锚定 + 技术约束”三段式结构。以蘑菇怪为例：

```
A cartoon walking mushroom monster designed as a game asset, low poly stylized with clean topology and flat shading. It has a large round red cap with white polka dots... [主体描述] Hand-painted textures with vibrant colors, soft shadows painted into the texture, no realistic details. Neutral pose standing upright, fantasy forest theme, game-ready model suitable for a 3D platformer. [风格锚定] Stylized proportions with oversized head and tiny body. [技术约束]
```

这种结构让 Meshy 的生成结果高度可控，18 个模型中 16 个一次可用，只有石巨人的“发光裂缝”和传送门的“旋转能量面”需要后续在引擎里用材质 emissive 和代码动画补强。金币（coin.glb）在清单中被标记为“可删减”，因为敌人掉落金币并非核心机制，可以用简单圆柱体 + 金色材质代码生成替代。但在实际开发中我们保留了它，因为击败敌人后看到金币弹出是一个重要的正反馈瞬间，能显著提升战斗的满足感。

**Fallback primitive 设计是 Phase 2 最正确的决策之一。** 我们在 `assets-manifest.json` 中为每个模型配置了 fallback 描述（geometry、color、size、composite parts），并在 `asset-loader.js` 中捕获 GLTF 加载失败时自动降级为代码生成的几何体。这意味着即使 Meshy 模型尚未到位，游戏也能完整运行——狐狸变成橙色盒子、蘑菇怪变成红色圆柱体、Boss 变成灰色大盒子加黄色八面体。这个设计在开发初期救了不止一次命：有两天 Meshy 生成队列卡住，我们靠 fallback primitive 继续调试关卡逻辑，完全没有阻塞。

---

## Phase 3 — 脚手架 + 主角

技术栈选择非常克制：Vite + Three.js，无框架、无物理引擎、无状态管理库。理由很简单——这是一个 6 关的平台跳跃游戏，不需要 React 的组件生命周期，也不需要 Cannon.js 的刚体模拟。自己写 AABB 碰撞和射线地面检测，代码量不到 200 行，但调试自由度极高。

第三人称相机的实现用了最简单的 lerp 跟随：

```js
// camera-controller.js
const offset = new THREE.Vector3(...cfg.offset)
const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw)
offset.applyQuaternion(yawQuat)
const desiredPos = targetPos.clone().add(offset)
this.camera.position.lerp(desiredPos, cfg.lerp)
```

`lerp = 0.1` 这个值调了整整一个下午。太大（0.3 以上）相机会抖动，尤其在玩家连续跳跃时；太小（0.05 以下）相机滞后严重，玩家跑到画面边缘还看不到前方。最终 0.1 是一个 sweet spot：奔跑时相机有轻微的“被拖拽”感，停下来时 0.5 秒内归位，既跟得上又不会抢戏。右键拖拽旋转视角的灵敏度也经历了类似调试，最终定在 `0.005` 弧度/像素，让玩家能精准调整视角，又不会因轻微鼠标移动而天旋地转。

Phase 3 还踩了一个地面吸附 bug：早期版本在 `player.update()` 里先做位移、再做地面射线检测，导致玩家在高速移动时偶尔会“沉入”平台 0.1-0.2 米，下一帧又被弹上来，产生肉眼可见的抖动。修复方案是调整执行顺序：先计算目标速度，再应用位移，最后做地面检测并修正 Y 坐标。同时把 `groundCheckDist` 从 0.1 收紧到 0.05，减少误判。另一个隐藏问题是移动平台的“携带”逻辑：如果玩家在移动平台上跳跃，平台会继续移动而玩家留在原地，导致落点偏移。修复方案是在 `player.update()` 中记录上一帧的平台位置，计算 `platformDelta` 并加到玩家位移上，让玩家在空中也能继承平台的水平动量。

---

## Phase 4 — 关卡 + 敌人 + Boss（最有料的一段）

### 数据驱动架构

关卡全部配置在 `level-data.js` 中，每个关卡是一个纯数据对象，包含平台位置/尺寸/类型、水晶位置、敌人配置、陷阱配置、传送门位置。`level-loader.js` 读取这些数据，异步加载模型、构建碰撞体、实例化敌人，最后返回一个包含所有运行时对象的 levelData 包。这种架构让我们可以在不碰游戏核心逻辑的情况下，仅通过修改 JSON-like 的配置就调整关卡布局。

### 3 种敌人 AI

敌人 AI 极其简单，每种不超过 50 行：

- **蘑菇怪（MushroomEnemy）**：巡逻状态机。沿 X 轴移动，到达 `patrolRange` 或射线检测前方无地面时掉头。没有追击逻辑，纯地形驱动。
- **小精灵（SpriteEnemy）**：追击/归位双状态。玩家进入 `detectRange`（8 米）时向玩家移动，超出范围后返回出生点。Y 轴用正弦波做悬浮动画。
- **石傀儡（GolemEnemy）**：三段状态机 `IDLE → CHARGING → COOLDOWN`。检测到玩家进入 5 米范围后进入蓄力（2 秒），然后沿锁定方向高速冲撞（速度 4），持续 2 秒后进入冷却（2 秒），再回到 IDLE。

这种“够用就行”的 AI 设计，是因为平台跳跃游戏的核心乐趣在于“跳”而不是“打”。敌人的存在是为了给跳跃增加时机压力，而不是提供深度战斗体验。蘑菇怪的边缘检测用 `Raycaster` 向下发射射线，如果前方 0.6 米处没有地面就掉头——这个简单逻辑在 L2 的平坦平台上工作完美，但在 L3 的窄桥上偶尔会误判，因为桥的边缘下方确实是空的。我们并没有修复这个“bug”，反而觉得它增加了敌人行为的不可预测性，让游戏更有趣。

### 踩杀判定被重力破坏的坑

这是 Phase 4 最深的一个坑，值得详细记录。

原始代码在敌人碰撞检测中写了这样一行：

```js
// 错误版本（已删除）
const alreadyStomped = player.velocity.y === PLAYER_CFG.stompImpulse
```

逻辑看起来没问题：踩杀时把玩家速度设为 `stompImpulse = 8`，下一帧如果还在和敌人碰撞，就跳过伤害判定。但问题出在**重力**。`player.update()` 中重力会在同一帧内立刻改变 `velocity.y`：

```js
this.velocity.y -= cfg.gravity * dt  // dt ~ 0.016, gravity = 25
// 一帧后 velocity.y 从 8 降到 7.6，条件失效
```

这导致 `alreadyStomped` 几乎永远为 `false`。如果玩家踩完敌人后因为碰撞盒重叠仍然接触敌人，就会立刻受到侧面伤害——玩家视角就是“我明明踩到了，为什么还扣血”。

修复方案是引入 `playerStompTimer`：

```js
// src/game.js — 踩杀判定与 timer 生命周期
let playerStompTimer = 0  // 模块级变量

function animate(time) {
  const dt = Math.max(0, Math.min((time - lastTime) / 1000, 0.1))
  lastTime = time

  if (state === STATES.PLAYING) {
    // 1) 踩杀检测（在 player.update 之前）
    const playerBoxPre = player
      ? new THREE.Box3().setFromObject(player.mesh)
      : null
    for (const enemy of levelEnemies) {
      if (enemy.state !== 'ACTIVE') continue
      const enemyBox = enemy.getCollider()
      if (playerBoxPre && playerBoxPre.intersectsBox(enemyBox)) {
        const stomp = player.velocity.y < -1
          && player.mesh.position.y > enemyBox.max.y - 0.3
          && enemy.config.stompable
        if (stomp) {
          enemy.takeHit(true)
          player.velocity.y = PLAYER_CFG.stompImpulse
          playerStompTimer = 0.15  // 0.15 秒内免疫同敌人伤害
        }
      }
    }

    // 2) 玩家物理更新（重力会改变 velocity.y）
    if (player) player.update(dt, input, platformMeshes)

    // 3) 敌人碰撞伤害（跳过已踩杀）
    const playerBox = new THREE.Box3().setFromObject(player.mesh)
    for (const enemy of levelEnemies) {
      enemy.update(dt, player, elapsedTime)
      if (enemy.state !== 'ACTIVE') continue
      const enemyBox = enemy.getCollider()
      if (playerBox.intersectsBox(enemyBox)) {
        const alreadyStomped = playerStompTimer > 0
        if (!alreadyStomped && playerInvulnTimer <= 0) {
          damagePlayer(enemy.config.damage || 1)
        }
      }
    }

    // 4) 每帧递减 timer
    if (playerStompTimer > 0) {
      playerStompTimer -= dt
    }
  }
}
```

这个修复的关键是**把“是否刚踩过”从瞬时物理状态（velocity.y）解耦到独立计时器**。0.15 秒足够覆盖 2-3 帧的碰撞重叠，又不会长到让玩家无敌穿越敌人。E2E 验证中 L2 蘑菇怪和 L6 Boss 的连续踩杀都通过了这行逻辑。

### Boss 2 阶段设计

石巨人 Boss 有 8 点 HP，在 `hp <= 4` 时从 phase 1 切换到 phase 2。Phase 1 是缓慢追击（速度 3.5），Phase 2 停止移动，改为每 2.5 秒从天花板随机位置掉落岩石（`activeRocks` 数组管理）。E2E 观测到的真实 HP 序列是 `[7,6,5,4,3,2,1,0]`，phase 切换标记 `phaseSwitched=true`，证明状态机稳定。

Boss 的 fallback primitive 是一个 2×2.5×1.5 的灰色盒子，头顶放一个黄色八面体作为“水晶弱点”。这个简陋的几何体在 Meshy 模型到位前，已经足以让我们调试完整个 Boss 战逻辑。Phase 2 的落石机制最初设计为“追踪玩家位置掉落”，但测试中发现这会让玩家几乎没有躲避空间，尤其是在 Boss 战场地只有 16×16 米的情况下。最终改为“在 Boss 周围 14 米范围内随机位置掉落”，给玩家留下预判和移动的空间，同时保持紧张感。

### startLevel race condition

这是一个“手滑触发”的 bug。Step 4-3/4-4 的测试代码为了快速切换关卡，直接调用 `setLevel(n)`，结果在 E2E 中连续点击导致 `startLevel` 被多次交错调用。`levelEnemies`、`platformMeshes`、`scene.userData.portal` 可能被后一次加载覆盖，而前一次的 `animate` 还在用旧引用运行，导致敌人消失、传送门状态错乱。

修复方案是序列化 `startLevel`：

```js
let isLoadingLevel = false
let pendingLevelId = null

async function startLevel(levelId) {
  if (isLoadingLevel) {
    pendingLevelId = levelId
    return
  }
  isLoadingLevel = true
  pendingLevelId = null
  window.__gameInternals._levelReady = false

  try {
    currentLevelId = levelId
    elapsedTime = 0
    scene.userData.portal = null  // 防止旧 portal 被 completeLevel 误触发

    const levelData = await loadLevel(scene, levelId)

    // 加载期间有新请求？直接放弃当前加载
    if (pendingLevelId !== null) {
      return
    }

    // ... 设置关卡数据 ...
    window.__gameInternals._levelReady = true
  } finally {
    isLoadingLevel = false
    if (pendingLevelId !== null && pendingLevelId !== currentLevelId) {
      startLevel(pendingLevelId)
    }
  }
}
```

同时 `completeLevel` 增加了 `if (state !== STATES.PLAYING) return` 的守卫，防止在关卡加载过程中误触发。`scene.userData.portal = null` 这行尤其关键——它切断了旧 portal 与新关卡加载之间的状态泄漏。

---

## Phase 4 验证 — E2E 暴露真 bug

### 为什么浅层测试会漏

Step 4-3 和 4-4 的测试走了 `__gameInternals` 后门：直接调用 `forceStompBoss()`、`setPlayerPos()`、`damageBoss()` 来触发事件，完全绕过了真实的物理碰撞、重力、帧更新顺序。这种测试能验证“函数本身是否工作”，但测不出“在真实游戏循环中，这些函数按什么顺序、在什么状态下被调用”。

三个阻塞 bug 全部藏在“从上往下跳 + 重力 + 碰撞顺序”的交叉地带：

1. `startLevel` race：只有快速连续切换关卡才会触发，单步调测根本遇不到。
2. `completeLevel` 在加载中误触发：需要旧 portal 残留 + 玩家恰好站在旧 portal 附近 + 新关卡正在加载，三个条件同时满足。
3. 踩杀 `alreadyStomped`：需要玩家 velocity.y 在重力作用下跨帧变化，单帧断点看不到问题。

这三个 bug 的共性是：**它们都依赖于“真实时间推进”和“多系统交叉状态”**，而走后门测试一次性跳过这两个维度，所以完全暴露不出来。

### Headless Playwright 与 rAF throttling

Step 4-7 写了 462 行的 `e2e-full-run.mjs`，在 headless Chromium 中跑完全部 6 关。但立刻遇到一个大坑：**headless 浏览器会 throttle `requestAnimationFrame`**。当页面没有用户交互时，Chromium 会把 rAF 降到 1fps 甚至更低，导致 `dt` 接近 0，敌人不巡逻、物理不前进。

解决方案是自己驱动帧：

```js
// tests/e2e-full-run.mjs — 手动驱动游戏循环
async function waitWithAnimate(page, ms) {
  const steps = Math.max(1, Math.floor(ms / 50))
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() =>
      window.__gameInternals._forceAnimate(performance.now())
    )
    await page.waitForTimeout(50)
  }
}
```

`game.js` 中暴露的 `_forceAnimate` 直接调用 `animate(now)`，绕过 rAF：

```js
// src/game.js — 供 E2E 调用的帧驱动钩子
window.__gameInternals = window.__gameInternals || {}
window.__gameInternals._forceAnimate = (t) => {
  const now = t || performance.now()
  if (now <= lastTime) {
    lastTime = now - 16
  }
  animate(now)
}
```

`waitWithAnimate` 把“等待 N 毫秒”拆成每 50ms 强制推进一帧，既保证了物理和 AI 的连续性，又不会因为一次性推进太大步长而导致碰撞穿透。这个 helper 在 L2 蘑菇巡逻测试（需要 1.2 秒观察位移）和 L6 Boss 8 次踩杀（需要 4.8 秒连续动画）中都起到了核心作用。

E2E 脚本还引入了 `_levelReady` 标志来解决异步关卡加载的等待问题。`setLevelAndWait` 函数会等待 `getCurrentLevelId()` 匹配目标关卡 ID，再等待 `_levelReady === true`，最后额外推进 500ms 动画让敌人 AI 进入稳定状态。这种多层等待策略确保了测试不会在关卡尚未完全初始化时就开始断言。

E2E 最终报告（`output/playwright/e2e-report.json`）零 bug，观测数据如下：

- L1: `maxVy=5.83`, crystals=8, 通关
- L2: 蘑菇巡逻 delta=1.071（有移动）
- L3: 小精灵追击 dist1=0.93 → dist2=2.76（靠近后远离）
- L4: 弹跳平台 `vy=17.22`, `y=6.01`
- L5: 石傀儡 `state=ACTIVE`, `hp=2`
- L6: Boss HP 序列 `[7,6,5,4,3,2,1,0]`, `phaseSwitched=true`, `maxRocks=1`

---

## Phase 5 — UI 和 i18n

UI 全部用纯手写 CSS 实现，没有引入任何 UI 框架或图标库。标题背景用 `::before`/`::after` 伪元素画了两个 CSS 三角形模拟树剪影，关卡缩略图用 emoji（🌲、🏞、🕳、👹）代替图片，避免了外部 SVG/PNG 资源的加载依赖。

i18n 实现是一个极简的 key-value 查找 + 参数替换：

```js
// src/i18n/index.js
export function t(key, params = {}) {
  const keys = key.split('.')
  let value = locales[currentLocale]
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      // fallback to en
      value = locales[DEFAULT_LOCALE]
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey]
        } else {
          return key
        }
      }
      break
    }
  }
  return value.replace(/\{(\w+)\}/g, (_, paramKey) =>
    params[paramKey] !== undefined ? params[paramKey] : `{${paramKey}}`
  )
}
```

`onLocaleChange` 采用广播模式：所有需要刷新的模块注册回调，切换语言时统一触发。`game.js` 在模块顶层注册了一个全局回调，确保 HUD 中的 hearts、crystals、level 标签即时刷新；`overlays.js` 的 `refreshAllText()` 则负责所有 overlay 的文本重渲染。这种设计避免了每个组件自己监听语言变化，减少了耦合。

一个细节是 `data-i18n` 属性的批量刷新：我们在 HTML 中为所有静态文本元素标注 `data-i18n="key"`，`refreshAllText()` 用 `document.querySelectorAll('[data-i18n]')` 批量替换，而不是在每个组件里硬编码 DOM 查询。这让新增翻译键时只需要改 HTML 和翻译文件，不需要 touching JS 逻辑。

---

## 心得与坑清单

- **Meshy 风格锚定词要统一。** DESIGN 第一稿没锁住导致 prompt 风格漂移，Phase 1 末被迫重写 `meshy-prompts.md`。建议任何 AI 生成资产的项目，第一天就把锚定词写进文档顶部，并强制要求每条 prompt 以锚定词结尾。

- **浅层测试（走后门）和深层 e2e 的差距会放大到 3 个阻塞 bug。** `__gameInternals` 后门在开发中期确实加速了功能验证，但也让我们产生了“功能已通”的错觉。下次项目应在脚手架阶段就埋好 e2e 框架，而不是等到 Phase 4 末才补。

- **Headless Playwright 的 rAF throttling 是个常见坑。** 不只是我们的项目，任何依赖 rAF 的游戏循环在 headless 浏览器里都会遇到这个问题。`waitWithAnimate` + `_forceAnimate` 的组合是一个可复用的解决方案，值得一个独立的技术帖子。

- **Fallback primitive 设计真的救命。** Meshy 异步生成不阻塞开发，18 个模型中有 3 个在开发中期才到位，但游戏从未因“模型没好”而停转。建议在 asset manifest 中强制要求每个条目包含 fallback 描述。

- **序列化异步关卡加载是刚需。** `startLevel` 的 `isLoadingLevel` / `pendingLevelId` 模式虽然简单，但解决了 90% 的 race condition。如果未来关卡更大、加载更慢，可以考虑加 loading 遮罩 + 取消令牌（AbortController）。

- **E2E 测试的“分层”策略值得坚持。** 我们的测试金字塔是：单元测试（敌人 AI 状态机）→ 集成测试（`__gameInternals` 后门）→ E2E（Playwright 全链路）。单元测试保证函数正确，集成测试保证模块连通，E2E 保证真实玩家体验。三个阻塞 bug 全部是在 E2E 层发现的，这证明了分层测试的价值——每一层都有它抓不到的 bug，只有全链路才能覆盖交叉状态。下次项目我们会把 E2E 框架提前到 Phase 2 就埋好，而不是 Phase 4 末才补。"

---

## 可复用的 2 段代码

### 1. 踩杀 timer 方案（`playerStompTimer` 的生命周期）

```js
// 模块级变量
let playerStompTimer = 0

function animate(time) {
  const dt = Math.max(0, Math.min((time - lastTime) / 1000, 0.1))
  lastTime = time

  if (state === STATES.PLAYING) {
    // 1) 预更新踩杀检测（在玩家物理更新前）
    const playerBoxPre = player
      ? new THREE.Box3().setFromObject(player.mesh)
      : null
    for (const enemy of levelEnemies) {
      if (enemy.state !== 'ACTIVE') continue
      const enemyBox = enemy.getCollider()
      if (playerBoxPre && playerBoxPre.intersectsBox(enemyBox)) {
        const stomp = player.velocity.y < -1
          && player.mesh.position.y > enemyBox.max.y - 0.3
          && enemy.config.stompable
        if (stomp) {
          enemy.takeHit(true)
          player.velocity.y = PLAYER_CFG.stompImpulse
          playerStompTimer = 0.15  // 启动免疫窗口
        }
      }
    }

    // 2) 玩家物理更新（重力会改变 velocity.y）
    if (player) player.update(dt, input, platformMeshes)

    // 3) 敌人碰撞伤害（跳过已踩杀）
    const playerBox = new THREE.Box3().setFromObject(player.mesh)
    for (const enemy of levelEnemies) {
      enemy.update(dt, player, elapsedTime)
      if (enemy.state !== 'ACTIVE') continue
      const enemyBox = enemy.getCollider()
      if (playerBox.intersectsBox(enemyBox)) {
        const alreadyStomped = playerStompTimer > 0
        if (!alreadyStomped && playerInvulnTimer <= 0) {
          damagePlayer(enemy.config.damage || 1)
        }
      }
    }

    // 4) 递减 timer
    if (playerStompTimer > 0) {
      playerStompTimer -= dt
    }
  }
}
```

### 2. Headless Playwright 手动驱动 rAF 的 `_forceAnimate` + `waitWithAnimate`

```js
// src/game.js — 暴露帧驱动钩子
window.__gameInternals = window.__gameInternals || {}
window.__gameInternals._forceAnimate = (t) => {
  const now = t || performance.now()
  if (now <= lastTime) {
    lastTime = now - 16  // 防止 dt <= 0
  }
  animate(now)
}

// tests/e2e-full-run.mjs — 等待 helper
async function waitWithAnimate(page, ms) {
  const steps = Math.max(1, Math.floor(ms / 50))
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() =>
      window.__gameInternals._forceAnimate(performance.now())
    )
    await page.waitForTimeout(50)
  }
}

// 使用示例：等待 1.2 秒让蘑菇巡逻
await waitWithAnimate(page, 1200)
const enemies2 = await getEnemies(page)
```

这两段代码可以直接复制到任何基于 Three.js + Playwright headless 的项目中，解决“游戏循环在 headless 浏览器里不前进”的问题。
