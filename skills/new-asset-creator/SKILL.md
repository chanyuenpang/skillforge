---
name: new-asset-creator
version: 1.0.0
description: "新建资产技能 | 用当前Agent化资源生产机制新建 JSON 资产。当前只支持 material（材料）和 consumable（消耗品）。"
metadata:
  openclaw:
    emoji: "🧱"
    priority: high
    type: skill
---

# New Asset Creator - 新建资产技能

## 适用场景
当用户要求：

- 新建一个材料
- 新建一个消耗品
- 帮我批量生成一批材料/消耗品
- 给现有资源补字段 / 复制一份新资源

就使用本技能。

---

## 当前支持的资产类型

### 1. material（材料）
已支持到：

- JSON 源码创建：✅
- Schema 校验：✅
- 引用校验：✅
- Registry 注册：✅
- `.tres` 编译：✅

最小字段：

- `type` = `material`
- `id`
- `name`
- `icon`
- `description`
- `category`
- `grade`
- `craftable`

可选字段示例：

- `base_price`
- `stackable`
- `recipe_ref`
- `tags`

### 2. consumable（消耗品）
已支持到：

- JSON 源码创建：✅
- Schema 校验：✅
- 引用校验：✅
- Registry 注册：✅
- `.tres` 编译：✅

最小字段：

- `type` = `consumable`
- `id`
- `name`
- `icon`
- `description`

常见字段：

- `effects`
- `rarity`
- `price`
- `stackable`
- `max_stack`
- `cooldown`
- `combat_only`

---

## 当前不支持的资产类型

以下类型目前**不要**用本技能直接新建：

- dialogue / 机缘 content
- clue
- entity 模板
- buff
- artifact
- spell / blueprint 类资源
- 任何依赖双向投影的蓝图资源

原因：这些类型还没有完整的 Schema / Validator / Compiler / 回写链路。

---

## 技能输入

建议用户至少提供：

### 新建 material 时
- `id`
- `name`
- `description`
- `icon`
- `category`
- `grade`
- `craftable`

### 新建 consumable 时
- `id`
- `name`
- `description`
- `icon`
- `effects`（如果有）
- `price` / `rarity`（如果有）

如果信息不完整：
- 可以先创建最小可用 JSON
- 但必须保证通过 Schema 校验

---

## 技能输出

执行本技能时，应完成：

1. 在 `assets/src/items/` 下创建对应 JSON 文件
2. 使用现有 Schema 约束字段结构
3. 运行：

```bash
bash tools/pre-commit.sh
python3 compiler/compile.py
```

4. 输出结果应明确说明：
- 创建了哪个 JSON 文件
- 校验是否通过
- 是否成功编译为 `.tres`
- 如果失败，失败点是什么

---

## 操作规则

### 规则1：只改 JSON 源码层
只能创建或修改：

```text
assets/src/items/*.json
```

不要直接手改：

- `assets/generated/compiled/*.tres`
- `data/**/*.tres`

### 规则2：ID 必须稳定
- 只用小写字母、数字、下划线
- 不要中英文混用
- 不要随便改已存在资源的 `id`

### 规则3：任何新资产都要过校验
必须跑：

```bash
bash tools/pre-commit.sh
```

不过校验，不算创建成功。

### 规则4：任何新资产都要可编译
必须跑：

```bash
python3 compiler/compile.py
```

没有 `.tres` 产物，不算链路成功。

---

## 最小工作流

### 新建一个材料
1. 生成 `assets/src/items/<id>.json`
2. 填入 material 所需字段
3. 跑 pre-commit
4. 跑 compile
5. 返回创建结果

### 新建一个消耗品
1. 生成 `assets/src/items/<id>.json`
2. 填入 consumable 所需字段
3. 跑 pre-commit
4. 跑 compile
5. 返回创建结果

---

## 技能边界

本技能的职责是：

- 帮用户新建当前已支持的资产
- 保证新建资产符合当前工具链
- 保证资源能通过校验并编译

本技能**不负责**：

- 设计新的资产类型规范
- 扩展新的 Schema/Compiler
- 改造蓝图类资源链路
- 处理复杂编辑器面板行为

---

## 一句话总结

> 这是一个“当前可用资产类型的新建器”，不是“全资产万能生成器”。
> 现在它只应该服务于 **material** 和 **consumable** 两类资源。
