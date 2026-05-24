# Forest Quest — Meshy 生成总表(开发完成后使用)

本表是 `meshy-prompts.md` 的紧凑版,用于**全部开发完成后**一次性批量生成 18 个 glb。
生成时逐条复制 `Prompt` 到 Meshy → Text to 3D,用 `Filename` 字段的文件名下载后放到 `public/models/`。

**统一风格锚定词**(所有 prompt 已内置):
`cartoon, low poly, stylized, game asset, neutral pose, clean topology, flat shading, vibrant colors, hand-painted texture, fantasy forest theme`

**通用 Meshy 参数建议**:
- Mode: Text to 3D
- Style: Cartoon
- Topology: Quad
- Format: GLB
- Polycount: 按每行 "三角面上限" 对齐

---

## 批次 A — 角色(5 个,最关键)

| # | Filename | 用途 | 尺寸 | 三角面 | 备注 |
|---|---|---|---|---|---|
| 1 | `player-fox.glb` | 玩家主角 | ~1.2m 高 | ≤ 6k | A-pose,尾巴独立分段 |
| 2 | `enemy-mushroom.glb` | 巡逻敌人 | ~0.8m 高 | ≤ 4k | 顶部平整便于踩踏 |
| 3 | `enemy-sprite.glb` | 飞行敌人 | ~0.5m 高 | ≤ 5k | 翅膀独立 mesh,身体中心发光点 |
| 4 | `enemy-golem-small.glb` | 冲撞敌人 | ~1.6m 高 | ≤ 6k | 身体分块便于蓄力动画 |
| 5 | `boss-stone-giant.glb` | 最终 Boss | ~4.5m 高 | ≤ 12k | 头顶水晶弱点,分块碎裂 |

### Prompt 1 — player-fox.glb
```
A cute cartoon fox character designed as a game asset, low poly stylized with clean topology and flat shading. The fox has bright orange fur with a cream-colored belly and tail tip, large expressive amber eyes, and small pointy ears. It stands in a neutral A-pose with slightly rounded limbs and a bushy tail curled gently behind. The model features hand-painted textures with soft gradients, no realistic fur details, and a friendly adventurous expression. Vibrant warm colors, fantasy forest theme, suitable for a 3D platformer game. T-pose or A-pose, neutral pose, game-ready with simple rig-friendly geometry.
```

### Prompt 2 — enemy-mushroom.glb
```
A cartoon walking mushroom monster designed as a game asset, low poly stylized with clean topology and flat shading. It has a large round red cap with white polka dots, a thick beige stalk body, and two stubby little feet. The face on the stalk shows grumpy cartoon eyes and a small frown. The cap slightly overhangs like a helmet. Hand-painted textures with vibrant colors, soft shadows painted into the texture, no realistic details. Neutral pose standing upright, fantasy forest theme, game-ready model suitable for a 3D platformer. Stylized proportions with oversized head and tiny body.
```

### Prompt 3 — enemy-sprite.glb
```
A tiny glowing forest sprite designed as a game asset, low poly stylized with clean topology and flat shading. It has a small ethereal humanoid body made of soft cyan and mint green light, with delicate fairy wings on its back that have a translucent hand-painted look. The head is round with large glowing eyes and a playful smile. It floats in a neutral pose with limbs slightly relaxed. Hand-painted textures with vibrant magical colors, emission-friendly surfaces, fantasy forest theme. Game-ready model suitable for a 3D platformer, stylized and charming.
```

### Prompt 4 — enemy-golem-small.glb
```
A small stone golem creature designed as a game asset, low poly stylized with clean topology and flat shading. Its body is made of chunky angular rock segments in gray and brown tones, with moss growing in the cracks between stones. It has two thick blocky arms, short sturdy legs, and a rectangular head with glowing orange eye slits. The posture is slightly hunched forward in a neutral stance. Hand-painted textures with earthy colors and subtle moss green accents, fantasy cave theme. Game-ready model suitable for a 3D platformer, stylized proportions with heavy solid feel.
```

### Prompt 5 — boss-stone-giant.glb
```
A massive ancient stone giant designed as a game asset, low poly stylized with clean topology and flat shading. Its colossal body is constructed from huge rough-hewn boulders in dark gray and charcoal tones, with glowing cracks of molten orange lava running between the stone plates. The head is broad and angular with two blazing furnace-like eyes and a jagged stone crown. One shoulder has a cluster of crystal spikes. It stands in a powerful neutral pose with fists clenched. Hand-painted textures with dramatic contrast, dark cave theme, game-ready model suitable for a 3D platformer boss battle. Imposing and heavy proportions.
```

---

## 批次 B — 平台与陷阱(6 个,形状简单)

| # | Filename | 用途 | 尺寸 | 三角面 | 备注 |
|---|---|---|---|---|---|
| 6 | `platform-wood.glb` | 森林区基础平台 | 2×2×0.3m | ≤ 1k | 顶部水平,可缩放 |
| 7 | `platform-stone.glb` | 岩洞区基础平台 | 2×2×0.4m | ≤ 1k | 与 wood 同尺寸便于互换 |
| 8 | `platform-moving.glb` | 动态平台 | Ø2m×0.25m | ≤ 1.5k | 圆形,中心发光符文 |
| 9 | `platform-bouncy.glb` | 弹跳平台 | Ø2m×1.2m | ≤ 2k | 大蘑菇,stalk 独立 |
| 10 | `trap-spike.glb` | 尖刺陷阱 | 1.5×0.8×0.4m | ≤ 1k | 可平铺 |
| 11 | `trap-fire.glb` | 火焰喷射器 | Ø0.6×0.8m | ≤ 1k | 火焰由引擎粒子,模型只含石柱 |

### Prompt 6 — platform-wood.glb
```
A wooden platform designed as a game asset, low poly stylized with clean topology and flat shading. It is a flat rectangular plank surface made of light brown weathered wood with visible wood grain painted into the texture, supported by thick wooden beams underneath. The edges are slightly rounded. Grass and small flowers grow on the sides. Hand-painted textures with warm natural colors, vibrant and clean, fantasy forest theme. Game-ready model suitable for a 3D platformer, neutral pose as a static prop.
```

### Prompt 7 — platform-stone.glb
```
A stone platform designed as a game asset, low poly stylized with clean topology and flat shading. It is a flat rocky slab surface in gray and brown tones with subtle cracks and moss patches painted into the texture, supported by rough stone pillars underneath. The edges are chipped and irregular but the top surface is flat. Hand-painted textures with earthy muted colors, fantasy cave theme. Game-ready model suitable for a 3D platformer, neutral pose as a static prop. Solid and ancient feel.
```

### Prompt 8 — platform-moving.glb
```
A magical floating platform designed as a game asset, low poly stylized with clean topology and flat shading. It is a circular disk made of enchanted wood and stone hybrid material, with glowing cyan runes carved along the rim. The platform hovers with a subtle magical aura effect suggested by painted texture. The top surface is flat and safe, with a decorative pattern in the center. Hand-painted textures with vibrant magical colors, fantasy forest theme. Game-ready model suitable for a 3D platformer, neutral pose as a floating prop.
```

### Prompt 9 — platform-bouncy.glb
```
A bouncy mushroom platform designed as a game asset, low poly stylized with clean topology and flat shading. It is a giant flat-topped mushroom with a wide vibrant purple and blue striped cap that acts as a trampoline surface, and a thick flexible white stalk that bends under weight. The cap top is perfectly flat with a subtle target circle pattern. Hand-painted textures with bright playful colors, fantasy forest theme. Game-ready model suitable for a 3D platformer, neutral pose showing the natural springy shape. Fun and energetic design.
```

### Prompt 10 — trap-spike.glb
```
A set of cartoon iron spikes designed as a game asset, low poly stylized with clean topology and flat shading. Five sharp conical spikes emerge from a dark metal base plate, arranged in a row. The spikes have a menacing but stylized look with flat tips and painted metallic gradients in dark gray and rust orange. The base plate has bolt details painted on. Hand-painted textures with industrial dark colors, fantasy dungeon theme. Game-ready model suitable for a 3D platformer hazard, neutral pose as a static trap prop.
```

### Prompt 11 — trap-fire.glb
```
A cartoon stone fire vent designed as a game asset, low poly stylized with clean topology and flat shading. It is a small cylindrical stone pillar with a carved angry face on the front, and a circular opening at the top where fire erupts. The stone is dark gray with orange heat discoloration around the vent. The face has simple stylized eyes and a gaping mouth. Hand-painted textures with warm fiery accents on cool stone, fantasy cave theme. Game-ready model suitable for a 3D platformer hazard, neutral pose as a static prop. The fire itself will be particle effects in engine.
```

---

## 批次 C — 收集品 + 环境 + 终点(7 个,最轻量)

| # | Filename | 用途 | 尺寸 | 三角面 | 备注 |
|---|---|---|---|---|---|
| 12 | `crystal.glb` | 水晶收集品 | ~0.4m 高 | ≤ 800 | 3 根六边柱簇,自发光 |
| 13 | `coin.glb` | 金币(敌人掉落) | Ø0.3m | ≤ 500 | 圆形对称便于自转,可删 |
| 14 | `tree-cartoon.glb` | 森林装饰 - 卡通树 | ~4m 高 | ≤ 2k | 支持缩放变体 |
| 15 | `rock-boulder.glb` | 通用岩石 | ~1.5m 直径 | ≤ 1k | L6 落石可复用放大 |
| 16 | `mushroom-decor.glb` | 装饰蘑菇丛 | ~0.6m 高 | ≤ 1k | 与 enemy-mushroom 区分(无脸) |
| 17 | `stalagmite.glb` | 岩洞钟乳石 | ~2.5m 高 | ≤ 1.5k | 可倒置使用 |
| 18 | `portal-finish.glb` | 关卡终点传送门 | ~2.5m 高×2m 宽 | ≤ 3k | 中心能量面独立材质 |

### Prompt 12 — crystal.glb
```
A magical collectible crystal designed as a game asset, low poly stylized with clean topology and flat shading. It is a cluster of three elongated hexagonal crystal shards growing from a small base, in vibrant gradient colors from deep blue at the base to bright cyan at the tips. The surfaces are faceted with sharp geometric planes. Hand-painted textures with bright magical colors and subtle painted highlights, emission-friendly surfaces, fantasy forest theme. Game-ready model suitable for a 3D platformer collectible, neutral pose as a floating rotating item. Eye-catching and rewarding.
```

### Prompt 13 — coin.glb
```
A cartoon gold coin designed as a game asset, low poly stylized with clean topology and flat shading. It is a thick round coin with a raised star emblem in the center on both sides, and a ridged edge. The gold surface has hand-painted warm yellow and orange gradients with soft painted highlights, not metallic PBR. Slightly oversized and chunky proportions for visibility. Fantasy forest theme, game-ready model suitable for a 3D platformer collectible, neutral pose as a spinning pickup item. Satisfying and rewarding visual design.
```

### Prompt 14 — tree-cartoon.glb
```
A cartoon stylized tree designed as a game asset, low poly stylized with clean topology and flat shading. It has a thick brown trunk that curves slightly, and a large round canopy of lush green leaves with a fluffy cloud-like silhouette. Small red apples are scattered in the foliage. The trunk has painted bark texture details and a friendly face-like knot. Hand-painted textures with warm natural colors, vibrant and clean, fantasy forest theme. Game-ready model suitable for a 3D platformer environment, neutral pose as a static decoration prop. Cheerful and inviting atmosphere.
```

### Prompt 15 — rock-boulder.glb
```
A cartoon boulder designed as a game asset, low poly stylized with clean topology and flat shading. It is an irregular lump of gray-brown rock with chunky angular facets, subtle cracks, and patches of green moss painted into the texture. The bottom is slightly flattened so it sits naturally on the ground. Hand-painted textures with earthy muted colors, fantasy forest and cave theme. Game-ready model suitable for a 3D platformer environment, neutral pose as a static decoration prop. Solid and natural feel with stylized proportions.
```

### Prompt 16 — mushroom-decor.glb
```
A cluster of cartoon mushrooms designed as a game asset, low poly stylized with clean topology and flat shading. Three mushrooms of varying sizes grow together: a large red one with white spots, a medium orange one, and a small yellow one. They have thick white stems and rounded caps. The cluster sits on a small mound of mossy ground. Hand-painted textures with bright playful colors, fantasy forest theme. Game-ready model suitable for a 3D platformer environment decoration, neutral pose as a static prop. Whimsical and charming forest floor detail.
```

### Prompt 17 — stalagmite.glb
```
A cartoon stalagmite designed as a game asset, low poly stylized with clean topology and flat shading. It is a tall pointed rock formation rising from the ground, with a tapering cone shape and irregular ridges wrapping around it. The color is cool gray with subtle blue and purple painted shading to suggest cave atmosphere. The base is wide and stable. Hand-painted textures with muted cool colors, fantasy cave theme. Game-ready model suitable for a 3D platformer environment, neutral pose as a static decoration prop. Mysterious and ancient cave atmosphere.
```

### Prompt 18 — portal-finish.glb
```
A magical finish portal designed as a game asset, low poly stylized with clean topology and flat shading. It is a circular stone archway with ancient runes carved into the frame, and a swirling magical energy surface in the center rendered as a flat hand-painted vortex texture in bright cyan and white. The stone frame has moss and small crystals growing on it. Two small floating crystal shards orbit the portal. Hand-painted textures with magical vibrant colors, fantasy forest theme. Game-ready model suitable for a 3D platformer level goal, neutral pose as a static interactive prop. Mysterious and inviting gateway feel.
```

---

## 生成建议顺序

1. **先做批次 A 主角(player-fox)** —— 替换后 Phase 5 录 GIF 视觉效果立刻起来
2. **再做批次 A Boss(boss-stone-giant)** —— 帖子里 Boss 图是最吸睛的
3. **批次 A 剩余 3 个敌人** —— 完成后敌人 AI 视觉到位
4. **批次 B 平台陷阱 6 个** —— 关卡视觉全面升级
5. **批次 C 收集环境 7 个** —— 收尾,锦上添花

## 下载命名提示

- 严格按表中 `Filename` 列,全小写 kebab-case
- 下载时 Meshy 可能给随机名,重命名后再丢进 `games/05-forest-quest/public/models/`
- 放进去后**无需重启 dev**,刷新浏览器即可看到真模型替换 fallback
