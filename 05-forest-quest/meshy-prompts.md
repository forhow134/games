# 05-forest-quest / meshy-prompts.md

> 本文档为 Forest Quest（森林大冒险）项目提供所有 3D 模型的 Meshy text-to-3d 生成提示词。
> 统一风格锚定词：cartoon, low poly, stylized, game asset, neutral pose, clean topology, flat shading, vibrant colors, hand-painted texture, fantasy forest theme.

---

## player-fox.glb
**用途**: 玩家主角
**Meshy 建议**: text-to-3d / style=cartoon / topology=quad
**Prompt**:
A cute cartoon fox character designed as a game asset, low poly stylized with clean topology and flat shading. The fox has bright orange fur with a cream-colored belly and tail tip, large expressive amber eyes, and small pointy ears. It stands in a neutral A-pose with slightly rounded limbs and a bushy tail curled gently behind. The model features hand-painted textures with soft gradients, no realistic fur details, and a friendly adventurous expression. Vibrant warm colors, fantasy forest theme, suitable for a 3D platformer game. T-pose or A-pose, neutral pose, game-ready with simple rig-friendly geometry.
**预期尺寸**: ~1.2m 高
**Polycount 建议**: ≤ 6k 三角面
**备注**: 需 A-pose 便于后续跳跃/奔跑/待机动画绑定；尾巴独立分段便于动画摆动

---

## enemy-mushroom.glb
**用途**: 基础敌人 — 蘑菇怪
**Meshy 建议**: text-to-3d / style=cartoon / topology=quad
**Prompt**:
A cartoon walking mushroom monster designed as a game asset, low poly stylized with clean topology and flat shading. It has a large round red cap with white polka dots, a thick beige stalk body, and two stubby little feet. The face on the stalk shows grumpy cartoon eyes and a small frown. The cap slightly overhangs like a helmet. Hand-painted textures with vibrant colors, soft shadows painted into the texture, no realistic details. Neutral pose standing upright, fantasy forest theme, game-ready model suitable for a 3D platformer. Stylized proportions with oversized head and tiny body.
**预期尺寸**: ~0.8m 高
**Polycount 建议**: ≤ 4k 三角面
**备注**: 顶部需平整便于玩家踩踏判定；身体可略微压扁变形作为受击动画

---

## enemy-sprite.glb
**用途**: 飞行敌人 — 小精灵
**Meshy 建议**: text-to-3d / style=cartoon / topology=quad
**Prompt**:
A tiny glowing forest sprite designed as a game asset, low poly stylized with clean topology and flat shading. It has a small ethereal humanoid body made of soft cyan and mint green light, with delicate fairy wings on its back that have a translucent hand-painted look. The head is round with large glowing eyes and a playful smile. It floats in a neutral pose with limbs slightly relaxed. Hand-painted textures with vibrant magical colors, emission-friendly surfaces, fantasy forest theme. Game-ready model suitable for a 3D platformer, stylized and charming.
**预期尺寸**: ~0.5m 高
**Polycount 建议**: ≤ 5k 三角面
**备注**: 翅膀建议独立 mesh 便于透明材质和扇动动画；身体中心发光点便于加 point light

---

## enemy-golem-small.glb
**用途**: 进阶敌人 — 石傀儡
**Meshy 建议**: text-to-3d / style=cartoon / topology=quad
**Prompt**:
A small stone golem creature designed as a game asset, low poly stylized with clean topology and flat shading. Its body is made of chunky angular rock segments in gray and brown tones, with moss growing in the cracks between stones. It has two thick blocky arms, short sturdy legs, and a rectangular head with glowing orange eye slits. The posture is slightly hunched forward in a neutral stance. Hand-painted textures with earthy colors and subtle moss green accents, fantasy cave theme. Game-ready model suitable for a 3D platformer, stylized proportions with heavy solid feel.
**预期尺寸**: ~1.6m 高
**Polycount 建议**: ≤ 6k 三角面
**备注**: 身体分块结构便于做冲撞动画的蓄力/冲刺变形；眼睛独立材质便于发光效果

---

## boss-stone-giant.glb
**用途**: 最终 Boss — 石巨人
**Meshy 建议**: text-to-3d / style=cartoon / topology=quad
**Prompt**:
A massive ancient stone giant designed as a game asset, low poly stylized with clean topology and flat shading. Its colossal body is constructed from huge rough-hewn boulders in dark gray and charcoal tones, with glowing cracks of molten orange lava running between the stone plates. The head is broad and angular with two blazing furnace-like eyes and a jagged stone crown. One shoulder has a cluster of crystal spikes. It stands in a powerful neutral pose with fists clenched. Hand-painted textures with dramatic contrast, dark cave theme, game-ready model suitable for a 3D platformer boss battle. Imposing and heavy proportions.
**预期尺寸**: ~4.5m 高
**Polycount 建议**: ≤ 12k 三角面
**备注**: 头顶需有独立水晶弱点 mesh；身体分块便于受击碎裂动画；发光裂缝需独立材质

---

## platform-wood.glb
**用途**: 森林区基础平台
**Meshy 建议**: text-to-3d / style=cartoon / topology=quad
**Prompt**:
A wooden platform designed as a game asset, low poly stylized with clean topology and flat shading. It is a flat rectangular plank surface made of light brown weathered wood with visible wood grain painted into the texture, supported by thick wooden beams underneath. The edges are slightly rounded. Grass and small flowers grow on the sides. Hand-painted textures with warm natural colors, vibrant and clean, fantasy forest theme. Game-ready model suitable for a 3D platformer, neutral pose as a static prop.
**预期尺寸**: 2m × 2m × 0.3m（可缩放复用）
**Polycount 建议**: ≤ 1k 三角面
**备注**: 顶部平面需完全水平便于碰撞；支持多种缩放组合成不同长度平台

---

## platform-stone.glb
**用途**: 岩洞区基础平台
**Meshy 建议**: text-to-3d / style=cartoon / topology=quad
**Prompt**:
A stone platform designed as a game asset, low poly stylized with clean topology and flat shading. It is a flat rocky slab surface in gray and brown tones with subtle cracks and moss patches painted into the texture, supported by rough stone pillars underneath. The edges are chipped and irregular but the top surface is flat. Hand-painted textures with earthy muted colors, fantasy cave theme. Game-ready model suitable for a 3D platformer, neutral pose as a static prop. Solid and ancient feel.
**预期尺寸**: 2m × 2m × 0.4m（可缩放复用）
**Polycount 建议**: ≤ 1k 三角面
**备注**: 顶部平面水平；与 platform-wood 同尺寸便于关卡编辑器中互换

---

## platform-moving.glb
**用途**: 动态平台（水平/垂直移动）
**Meshy 建议**: text-to-3d / style=cartoon / topology=quad
**Prompt**:
A magical floating platform designed as a game asset, low poly stylized with clean topology and flat shading. It is a circular disk made of enchanted wood and stone hybrid material, with glowing cyan runes carved along the rim. The platform hovers with a subtle magical aura effect suggested by painted texture. The top surface is flat and safe, with a decorative pattern in the center. Hand-painted textures with vibrant magical colors, fantasy forest theme. Game-ready model suitable for a 3D platformer, neutral pose as a floating prop.
**预期尺寸**: 2m 直径 × 0.25m 厚
**Polycount 建议**: ≤ 1.5k 三角面
**备注**: 中心装饰图案可独立材质发光；圆形便于玩家判断落点

---

## platform-bouncy.glb
**用途**: 弹跳平台
**Meshy 建议**: text-to-3d / style=cartoon / topology=quad
**Prompt**:
A bouncy mushroom platform designed as a game asset, low poly stylized with clean topology and flat shading. It is a giant flat-topped mushroom with a wide vibrant purple and blue striped cap that acts as a trampoline surface, and a thick flexible white stalk that bends under weight. The cap top is perfectly flat with a subtle target circle pattern. Hand-painted textures with bright playful colors, fantasy forest theme. Game-ready model suitable for a 3D platformer, neutral pose showing the natural springy shape. Fun and energetic design.
**预期尺寸**: 2m 直径 × 1.2m 高
**Polycount 建议**: ≤ 2k 三角面
**备注**: 顶部需水平且面积足够；stalk 独立 mesh 便于压缩/回弹动画

---

## trap-spike.glb
**用途**: 尖刺陷阱
**Meshy 建议**: text-to-3d / style=cartoon / topology=quad
**Prompt**:
A set of cartoon iron spikes designed as a game asset, low poly stylized with clean topology and flat shading. Five sharp conical spikes emerge from a dark metal base plate, arranged in a row. The spikes have a menacing but stylized look with flat tips and painted metallic gradients in dark gray and rust orange. The base plate has bolt details painted on. Hand-painted textures with industrial dark colors, fantasy dungeon theme. Game-ready model suitable for a 3D platformer hazard, neutral pose as a static trap prop.
**预期尺寸**: 1.5m 宽 × 0.8m 长 × 0.4m 高
**Polycount 建议**: ≤ 1k 三角面
**备注**: 尖刺碰撞体可用简化锥形；支持平铺排列形成连续陷阱带

---

## trap-fire.glb
**用途**: 火焰喷射器陷阱
**Meshy 建议**: text-to-3d / style=cartoon / topology=quad
**Prompt**:
A cartoon stone fire vent designed as a game asset, low poly stylized with clean topology and flat shading. It is a small cylindrical stone pillar with a carved angry face on the front, and a circular opening at the top where fire erupts. The stone is dark gray with orange heat discoloration around the vent. The face has simple stylized eyes and a gaping mouth. Hand-painted textures with warm fiery accents on cool stone, fantasy cave theme. Game-ready model suitable for a 3D platformer hazard, neutral pose as a static prop. The fire itself will be particle effects in engine.
**预期尺寸**: 0.6m 直径 × 0.8m 高
**Polycount 建议**: ≤ 1k 三角面
**备注**: 顶部开口需明显；火焰效果由引擎粒子系统实现，模型本身不含火

---

## crystal.glb
**用途**: 收集品 — 水晶
**Meshy 建议**: text-to-3d / style=cartoon / topology=quad
**Prompt**:
A magical collectible crystal designed as a game asset, low poly stylized with clean topology and flat shading. It is a cluster of three elongated hexagonal crystal shards growing from a small base, in vibrant gradient colors from deep blue at the base to bright cyan at the tips. The surfaces are faceted with sharp geometric planes. Hand-painted textures with bright magical colors and subtle painted highlights, emission-friendly surfaces, fantasy forest theme. Game-ready model suitable for a 3D platformer collectible, neutral pose as a floating rotating item. Eye-catching and rewarding.
**预期尺寸**: ~0.4m 高
**Polycount 建议**: ≤ 800 三角面
**备注**: 需独立材质支持自发光；低面数保证同屏 10+ 颗时性能稳定

---

## coin.glb
**用途**: 备用收集品 — 金币（敌人掉落）
**Meshy 建议**: text-to-3d / style=cartoon / topology=quad
**Prompt**:
A cartoon gold coin designed as a game asset, low poly stylized with clean topology and flat shading. It is a thick round coin with a raised star emblem in the center on both sides, and a ridged edge. The gold surface has hand-painted warm yellow and orange gradients with soft painted highlights, not metallic PBR. Slightly oversized and chunky proportions for visibility. Fantasy forest theme, game-ready model suitable for a 3D platformer collectible, neutral pose as a spinning pickup item. Satisfying and rewarding visual design.
**预期尺寸**: ~0.3m 直径
**Polycount 建议**: ≤ 500 三角面
**备注**: 圆形对称，可用代码控制自转；低面数便于大量实例化

---

## tree-cartoon.glb
**用途**: 森林环境装饰 — 卡通树
**Meshy 建议**: text-to-3d / style=cartoon / topology=quad
**Prompt**:
A cartoon stylized tree designed as a game asset, low poly stylized with clean topology and flat shading. It has a thick brown trunk that curves slightly, and a large round canopy of lush green leaves with a fluffy cloud-like silhouette. Small red apples are scattered in the foliage. The trunk has painted bark texture details and a friendly face-like knot. Hand-painted textures with warm natural colors, vibrant and clean, fantasy forest theme. Game-ready model suitable for a 3D platformer environment, neutral pose as a static decoration prop. Cheerful and inviting atmosphere.
**预期尺寸**: ~4m 高
**Polycount 建议**: ≤ 2k 三角面
**备注**: 树冠可用 billboard 或简化 mesh；支持缩放变体形成树林差异

---

## rock-boulder.glb
**用途**: 通用环境装饰 — 岩石
**Meshy 建议**: text-to-3d / style=cartoon / topology=quad
**Prompt**:
A cartoon boulder designed as a game asset, low poly stylized with clean topology and flat shading. It is an irregular lump of gray-brown rock with chunky angular facets, subtle cracks, and patches of green moss painted into the texture. The bottom is slightly flattened so it sits naturally on the ground. Hand-painted textures with earthy muted colors, fantasy forest and cave theme. Game-ready model suitable for a 3D platformer environment, neutral pose as a static decoration prop. Solid and natural feel with stylized proportions.
**预期尺寸**: ~1.5m 直径（可缩放复用）
**Polycount 建议**: ≤ 1k 三角面
**备注**: 支持多种缩放形成大小岩石；L6 Boss 落石可复用此模型放大版

---

## mushroom-decor.glb
**用途**: 森林环境装饰 — 蘑菇丛
**Meshy 建议**: text-to-3d / style=cartoon / topology=quad
**Prompt**:
A cluster of cartoon mushrooms designed as a game asset, low poly stylized with clean topology and flat shading. Three mushrooms of varying sizes grow together: a large red one with white spots, a medium orange one, and a small yellow one. They have thick white stems and rounded caps. The cluster sits on a small mound of mossy ground. Hand-painted textures with bright playful colors, fantasy forest theme. Game-ready model suitable for a 3D platformer environment decoration, neutral pose as a static prop. Whimsical and charming forest floor detail.
**预期尺寸**: ~0.6m 高
**Polycount 建议**: ≤ 1k 三角面
**备注**: 纯装饰无碰撞；与 enemy-mushroom 区分（敌人更大且有人脸）

---

## stalagmite.glb
**用途**: 岩洞环境装饰 — 钟乳石/石笋
**Meshy 建议**: text-to-3d / style=cartoon / topology=quad
**Prompt**:
A cartoon stalagmite designed as a game asset, low poly stylized with clean topology and flat shading. It is a tall pointed rock formation rising from the ground, with a tapering cone shape and irregular ridges wrapping around it. The color is cool gray with subtle blue and purple painted shading to suggest cave atmosphere. The base is wide and stable. Hand-painted textures with muted cool colors, fantasy cave theme. Game-ready model suitable for a 3D platformer environment, neutral pose as a static decoration prop. Mysterious and ancient cave atmosphere.
**预期尺寸**: ~2.5m 高（可倒置作为钟乳石）
**Polycount 建议**: ≤ 1.5k 三角面
**备注**: 支持倒置使用（天花板钟乳石）；尖端需独立碰撞体防止玩家卡位

---

## portal-finish.glb
**用途**: 关卡终点传送门
**Meshy 建议**: text-to-3d / style=cartoon / topology=quad
**Prompt**:
A magical finish portal designed as a game asset, low poly stylized with clean topology and flat shading. It is a circular stone archway with ancient runes carved into the frame, and a swirling magical energy surface in the center rendered as a flat hand-painted vortex texture in bright cyan and white. The stone frame has moss and small crystals growing on it. Two small floating crystal shards orbit the portal. Hand-painted textures with magical vibrant colors, fantasy forest theme. Game-ready model suitable for a 3D platformer level goal, neutral pose as a static interactive prop. Mysterious and inviting gateway feel.
**预期尺寸**: ~2.5m 高 × 2m 宽
**Polycount 建议**: ≤ 3k 三角面
**备注**: 中心能量面需独立材质支持透明/自发光/旋转动画；门框需实体碰撞

---

## 模型清单调整建议

默认清单共 **18 个模型**，覆盖角色、敌人、平台、陷阱、收集、环境、终点全部需求。以下是可考虑的合并/删减方案及理由：

1. **coin.glb 可删减**：金币为纯视觉加分项，非核心机制。若开发周期紧张，可用简单圆柱体 + 金色材质代码生成替代，无需独立模型。但保留可增加敌人击败反馈的满足感。

2. **platform-wood 与 platform-stone 可合并为 platform-generic**：两者功能完全相同（静态基础平台），仅材质不同。若 Meshy 支持同一模型的多种材质变体，或引擎侧可通过代码替换材质，可合并为一个模型减少生成工作量。但分开生成可确保 wood/stone 的细节差异更自然。

3. **trap-fire 的火焰效果**：模型本身仅为石制喷口，火焰由引擎粒子系统实现。若 Meshy 生成结果不理想，可用简单圆柱体 + 顶部开口替代，细节靠贴图。

4. **rock-boulder 复用策略**：L6 Boss 战的落石可直接复用 rock-boulder 模型并放大 1.5-2 倍，无需单独生成 "falling-rock" 模型。

5. **stalagmite 双向使用**：同一模型倒置即可作为天花板钟乳石，无需额外生成 stalactite 模型。

**推荐保留全部 18 个模型**，因为每个模型职责清晰，且 low-poly 风格下生成成本较低。若必须缩减，优先删除 `coin.glb`（用代码替代），其次考虑合并两个 platform 模型。
