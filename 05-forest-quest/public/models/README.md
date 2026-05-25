# 05-forest-quest / public/models

本目录存放所有 GLB 模型文件。模型由 Meshy 异步生成，**不作为 Phase 3 脚手架的前置条件**；代码在 glb 缺失或加载失败时会自动降级为 Three.js 原始几何占位物。

---

## 命名规则

- 文件名使用 **kebab-case**，与 `assets-manifest.json` 中的 `name` 字段严格一致。
- 扩展名固定为 **`.glb`**。
- 示例：`player-fox.glb`、`boss-stone-giant.glb`、`platform-wood.glb`

---

## Fallback 机制

当某个 `.glb` 文件缺失或加载失败时，代码会读取 `../assets-manifest.json` 中对应条目的 `fallback` 字段，用 Three.js primitive 几何拼出占位 Mesh：

- `box` / `sphere` / `cylinder` / `cone` → 单一几何
- `composite` → 多 `parts` 组合，每个 part 可独立指定几何、尺寸、颜色和局部偏移

占位 Mesh 保留原模型的类别颜色和整体尺寸，确保在开发阶段即可辨识角色、敌人、平台、陷阱、收集品等。

---

## 添加新模型流程

1. 将生成好的 `.glb` 文件放入本目录。
2. 打开 `games/05-forest-quest/public/assets-manifest.json`，确认对应 `name` / `file` 条目已存在。
3. 若是全新资源，在 `assets` 数组中新增一条，填写 `name`、`file`、`category`、`size`、`fallback` 和 `notes`。

---

## 导出约定（供 Meshy 用户参考）

| 项目 | 要求 |
|------|------|
| 格式 | GLB（可选 Draco 压缩） |
| 坐标系 | Y-up |
| 原点 | 角色模型原点在脚底；物件/平台原点在底部中心 |
| 面数建议 | 见 `meshy-prompts.md` 中各模型的 Polycount 建议 |
| 风格 | cartoon, low poly, stylized, flat shading, hand-painted texture |
| 材质 | 优先使用标准材质；发光部件建议独立材质便于引擎加 emission |
| 绑定 | 角色需 A-pose / T-pose，关节独立 mesh 便于代码驱动动画 |

---

## 当前模型清单（18 个）

详见 `../assets-manifest.json`。按类别划分：

- **character**: player-fox
- **enemy**: enemy-mushroom, enemy-sprite, enemy-golem-small
- **boss**: boss-stone-giant
- **platform**: platform-wood, platform-stone, platform-moving, platform-bouncy
- **trap**: trap-spike, trap-fire
- **collectible**: crystal, coin
- **decor**: tree-cartoon, rock-boulder, mushroom-decor, stalagmite
- **portal**: portal-finish
