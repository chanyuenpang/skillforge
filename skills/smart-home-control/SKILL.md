---
name: smart-home-control
version: 2.0.0
description: "智能家居控制 | 控制灯光、开关、空调、窗帘等设备，支持模糊匹配和场景模式。触发词：开灯、关灯、空调、窗帘、温度、场景、设备状态、智能家居。"
metadata:
  openclaw:
    emoji: "🏠"
    priority: high
    requires:
      config: ["homeassistant"]
---

# Smart Home Control - 智能家居控制

通过 Home Assistant REST API 控制智能家居设备，支持自然语言理解和设备名称模糊匹配。

## 配置读取

**配置文件**: `~/.openclaw/config.yaml`

```yaml
homeassistant:
  enabled: true
  url: "http://localhost:8123"
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**实际配置值** (当前已配置):
- URL: `http://localhost:8123`
- Token: 已配置 Long-Lived Access Token

**配置文档**: 参考 [homeassistant-xiaomi-setup.md](../docs/homeassistant-xiaomi-setup.md) 了解 Home Assistant 和小米设备的配置详情。

执行命令前设置环境变量：
```bash
# 从配置文件读取
HA_URL=$(grep -A3 "^homeassistant:" ~/.openclaw/config.yaml | grep "url:" | awk '{print $2}' | tr -d '"')
HA_TOKEN=$(grep -A3 "^homeassistant:" ~/.openclaw/config.yaml | grep "token:" | awk '{print $2}' | tr -d '"')

# 或直接使用已知值
HA_URL="http://localhost:8123"
HA_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2NGY4Nzg3ZjY3NTA0ZjZkODRmMGIzNmJjNzVkY2E2NCIsImlhdCI6MTc3MzgzOTIzOSwiZXhwIjoyMDg5MTk5MjM5fQ.flFMJ4ATQqx-k9Xitx6RmSKdpCwGSj3Q8EuBkD6BAvo"
```

---

## Quick Reference

| 操作 | 命令模板 |
|-----|---------|
| 搜索设备 | `curl -s -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/states" \| jq '...'` |
| 开灯/开关 | `curl -X POST "$HA_URL/api/services/light/turn_on" -d '{"entity_id":"..."}'` |
| 关灯/开关 | `curl -X POST "$HA_URL/api/services/light/turn_off" -d '{"entity_id":"..."}'` |
| 设置温度 | `curl -X POST "$HA_URL/api/services/climate/set_temperature" -d '{"entity_id":"...","temperature":26}'` |
| 查询状态 | `curl -s "$HA_URL/api/states/<entity_id>" \| jq '{state,friendly_name}'` |
| 激活场景 | `curl -X POST "$HA_URL/api/services/scene/turn_on" -d '{"entity_id":"scene.xxx"}'` |
| 关闭所有灯 | `curl -X POST "$HA_URL/api/services/light/turn_off" -d '{"entity_id":"all"}'` |

---

## 触发条件

当用户请求满足以下任一条件时激活此技能：

### 意图关键词
| 意图类型 | 触发词示例 |
|---------|-----------|
| 开关控制 | 开、关、打开、关闭、切换、启动、停止 |
| 设备类型 | 灯、开关、空调、窗帘、风扇、插座、浴霸 |
| 状态查询 | 状态、温度、亮度、开没开、什么状态、多少度 |
| 场景模式 | 场景、模式、回家、离家、睡眠、起床、观影 |
| 批量操作 | 所有、全部、这几个、批量、一起 |

### 位置关键词
客厅、卧室、房间、大房间、小房间、厨房、洗手间、卫生间、书房、门口、阳台

---

## 核心工作流程

```
用户输入
    │
    ▼
Step 1: 意图识别
    │ 识别：操作类型 + 设备类型 + 位置 + 参数值
    │
    ▼
Step 2: 设备匹配
    │ 搜索 friendly_name 匹配实体
    │ 处理多匹配/无匹配情况
    │
    ▼
Step 3: 执行操作
    │ 构造 API 请求并执行
    │
    ▼
Step 4: 结果反馈
    │ 返回操作结果或错误信息
    │
    ▼
完成
```

---

## Step 1: 意图识别

### 操作类型映射

| 用户表达 | 操作类型 | API 服务 |
|---------|---------|---------|
| 开、打开、启动 | turn_on | `domain/turn_on` |
| 关、关闭、停止 | turn_off | `domain/turn_off` |
| 切换、反转 | toggle | `domain/toggle` |
| 设成、调到、设为 | set_value | `domain/set_xxx` |
| 状态、什么情况、查一下 | query | `GET /api/states/{id}` |
| 场景、模式 | scene | `scene.turn_on` |

### 设备域映射

| 关键词 | 域 | entity_id 前缀 |
|-------|-----|---------------|
| 灯、灯光、照明 | light | `light.*` |
| 开关、插座 | switch | `switch.*` |
| 空调、温度、暖气、浴霸 | climate | `climate.*` |
| 窗帘、百叶窗、卷帘 | cover | `cover.*` |
| 风扇 | fan | `fan.*` |
| 电视、音箱 | media_player | `media_player.*` |
| 场景 | scene | `scene.*` |
| 按钮 | button | `button.*` |

### 参数提取

| 参数类型 | 匹配模式 | 示例 |
|---------|---------|-----|
| 温度 | `\d+度`、`调到\d+` | "空调调到26度" → temperature=26 |
| 亮度百分比 | `亮度\d+%?`、`\d+%亮度` | "亮度50%" → brightness_pct=50 |
| 位置百分比 | `开\d+%`、`关\d+%` | "窗帘开50%" → position=50 |
| 色温 | 暖色、冷色、白光 | "灯调成暖色" → color_temp=400 |

---

## Step 2: 设备模糊匹配

### 匹配流程

```
输入: 用户设备名称 (如 "客厅灯")
输出: entity_id

1. 获取所有实体状态
2. 在 friendly_name 和 entity_id 中搜索关键词
3. 精确匹配优先，部分匹配次之
4. 按匹配度排序返回
```

### 搜索命令模板

**单域搜索（推荐，响应快）**：
```bash
# 搜索灯光设备（按位置关键词）
curl -s -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/states" | \
  jq -r '.[] | select(.entity_id | startswith("light.")) |
    select(.attributes.friendly_name | test("客厅|living"; "i")) |
    {entity_id, friendly_name: .attributes.friendly_name, state}'
```

**多域搜索**：
```bash
# 搜索所有可控设备（非传感器）
curl -s -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/states" | \
  jq -r '.[] | select(.entity_id | test("^light\\.|^switch\\.|^climate\\.|^cover\\.|^fan\\.")) |
    select(.attributes.friendly_name | test("客厅"; "i")) |
    {entity_id, friendly_name: .attributes.friendly_name, state, domain: .entity_id | split(".")[0]}'
```

### 中文-英文位置映射

| 中文 | 英文关键词 |
|-----|-----------|
| 客厅 | living, lounge |
| 卧室/房间 | bedroom, room |
| 大房间 | 大房间, master |
| 小房间 | 小房间 |
| 厨房 | kitchen |
| 洗手间/卫生间 | bathroom, toilet |
| 书房 | study |
| 门口 | 门口, entrance |
| 阳台 | balcony |

### 匹配结果处理

**单匹配** → 直接使用该 entity_id

**多匹配** → 让用户选择或进一步筛选：
```
找到多个设备：
1. light.lumi_cn_374647633_acn01_s_2_light (客厅网关 RGB彩灯)
2. light.lumi_cn_332614091_mgl03_s_6_indicator_light (大房间网关 指示灯)
请指定要控制的设备，或使用"所有"进行批量操作。
```

**无匹配** → 提示用户并提供设备列表：
```
未找到匹配"xxx"的设备。可用的灯：
- 客厅网关 RGB彩灯 (light.lumi_cn_374647633_acn01_s_2_light)
- 小房间风扇 指示灯 (light.xxx)
...
```

### 列出设备命令

```bash
# 列出所有灯
curl -s -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/states" | \
  jq -r '.[] | select(.entity_id | startswith("light.")) |
    "- \(.attributes.friendly_name) (\(.entity_id))"'

# 列出所有开关
curl -s -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/states" | \
  jq -r '.[] | select(.entity_id | startswith("switch.")) |
    "- \(.attributes.friendly_name) (\(.entity_id))"'

# 列出所有场景
curl -s -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/states" | \
  jq -r '.[] | select(.entity_id | startswith("scene.")) |
    "- \(.attributes.friendly_name // .entity_id)"'
```

---

## Step 3: 执行操作

### 通用请求头

```bash
AUTH_HEADER="Authorization: Bearer $HA_TOKEN"
CONTENT_TYPE="Content-Type: application/json"
```

### 灯光控制

```bash
# 开灯
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "light.xxx"}' \
  "$HA_URL/api/services/light/turn_on"

# 关灯
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "light.xxx"}' \
  "$HA_URL/api/services/light/turn_off"

# 切换
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "light.xxx"}' \
  "$HA_URL/api/services/light/toggle"

# 设置亮度 (0-100%)
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "light.xxx", "brightness_pct": 50}' \
  "$HA_URL/api/services/light/turn_on"

# 设置色温 (暖色 500, 冷色 153)
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "light.xxx", "color_temp": 350}' \
  "$HA_URL/api/services/light/turn_on"

# 设置颜色 (RGB)
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "light.xxx", "rgb_color": [255, 100, 50]}' \
  "$HA_URL/api/services/light/turn_on"
```

### 开关控制

```bash
# 开
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "switch.xxx"}' \
  "$HA_URL/api/services/switch/turn_on"

# 关
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "switch.xxx"}' \
  "$HA_URL/api/services/switch/turn_off"
```

### 空调/温度控制

```bash
# 设置温度
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "climate.xxx", "temperature": 26}' \
  "$HA_URL/api/services/climate/set_temperature"

# 设置模式 (off, heat, cool, auto, dry, fan_only)
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "climate.xxx", "hvac_mode": "cool"}' \
  "$HA_URL/api/services/climate/set_hvac_mode"

# 关闭空调
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "climate.xxx"}' \
  "$HA_URL/api/services/climate/turn_off"
```

### 窗帘控制

```bash
# 打开
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "cover.xxx"}' \
  "$HA_URL/api/services/cover/open_cover"

# 关闭
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "cover.xxx"}' \
  "$HA_URL/api/services/cover/close_cover"

# 停止
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "cover.xxx"}' \
  "$HA_URL/api/services/cover/stop_cover"

# 设置位置 (0=关闭, 100=全开)
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "cover.xxx", "position": 50}' \
  "$HA_URL/api/services/cover/set_cover_position"
```

### 风扇控制

```bash
# 开/关
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "fan.xxx"}' \
  "$HA_URL/api/services/fan/turn_on"

# 设置速度百分比
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "fan.xxx", "percentage": 50}' \
  "$HA_URL/api/services/fan/set_percentage"
```

### 场景激活

```bash
# 激活场景
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "scene.good_night"}' \
  "$HA_URL/api/services/scene/turn_on"

# 临时场景 (scene.apply)
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entities": {"light.living_room": {"state": "on", "brightness_pct": 30}}}' \
  "$HA_URL/api/services/scene/apply"
```

### 批量操作

```bash
# 关闭所有灯
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "all"}' \
  "$HA_URL/api/services/light/turn_off"

# 打开所有灯
curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"entity_id": "all"}' \
  "$HA_URL/api/services/light/turn_on"

# 批量操作多个设备
for entity in light.1 light.2 light.3; do
  curl -X POST -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
    -d "{\"entity_id\": \"$entity\"}" \
    "$HA_URL/api/services/light/turn_on"
done
```

---

## Step 4: 状态查询与反馈

### 查询单个设备

```bash
curl -s -H "Authorization: Bearer $HA_TOKEN" \
  "$HA_URL/api/states/light.xxx" | \
  jq '{
    state,
    friendly_name: .attributes.friendly_name,
    brightness: .attributes.brightness,
    brightness_pct: .attributes.brightness_pct
  }'
```

### 查询某类设备

```bash
# 查询所有灯的状态
curl -s -H "Authorization: Bearer $HA_TOKEN" \
  "$HA_URL/api/states" | \
  jq '.[] | select(.entity_id | startswith("light.")) | {
    entity_id,
    friendly_name: .attributes.friendly_name,
    state
  }'
```

### 查询空调状态

```bash
curl -s -H "Authorization: Bearer $HA_TOKEN" \
  "$HA_URL/api/states/climate.xxx" | \
  jq '{
    state: .state,
    friendly_name: .attributes.friendly_name,
    current_temperature: .attributes.current_temperature,
    temperature: .attributes.temperature,
    hvac_mode: .attributes.hvac_mode
  }'
```

### 成功反馈格式

```
✅ 已打开 客厅网关 RGB彩灯
✅ 空调已设置到 26°C，模式：制冷
✅ 窗帘已打开到 50%
✅ 已激活场景 睡眠模式
```

### 状态查询反馈

```
📍 客厅网关 RGB彩灯
   状态: 开启
   亮度: 50%

📍 浴霸
   状态: 关闭
   当前温度: 24°C
   设定温度: 26°C
   模式: 制冷
```

### 批量操作反馈

```
✅ 已关闭所有灯（共 15 个设备）
✅ 已关闭: 客厅灯、卧室灯、厨房灯...
```

---

## 错误处理

| 错误情况 | 处理方式 | 提示信息 |
|---------|---------|---------|
| 设备未找到 | 搜索相似设备并提示 | "未找到'xxx'，您是否指：客厅灯、卧室灯？" |
| 多设备匹配 | 列出设备让用户选择 | "找到多个设备，请指定：1. xxx 2. xxx" |
| API 连接失败 | 检查 HA 服务状态 | "无法连接 Home Assistant，请检查服务是否运行" |
| 权限错误 | 检查 Token 有效性 | "认证失败，请检查 Token 配置" |
| 设备不可用 | 提示设备离线 | "设备'xxx'当前离线，无法控制" |
| 操作失败 | 返回 API 错误信息 | "操作失败：{错误详情}" |

### 错误检测命令

```bash
# 检查 API 连接
curl -s -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/" | jq '.message'

# 检查设备是否可用
curl -s -H "Authorization: Bearer $HA_TOKEN" \
  "$HA_URL/api/states/light.xxx" | \
  jq 'if .state == "unavailable" then "设备离线" else "设备在线" end'
```

---

## 场景定义

### 常见预设场景

| 场景名称 | 典型触发词 | 典型操作 |
|---------|-----------|---------|
| 回家模式 | 回家、到家、我回来了 | 开客厅灯、调亮度 50% |
| 离家模式 | 离家、出门、走了 | 关所有灯、关空调 |
| 睡眠模式 | 睡觉、晚安、睡眠 | 关客厅灯、卧室灯调暗到 20% |
| 起床模式 | 起床、早安 | 开窗帘、开灯 |
| 观影模式 | 看电影、观影 | 灯光调暗到 10%、窗帘关闭 |

### 场景使用方式

1. **使用 HA 预定义场景**：直接激活 `scene.xxx` 实体
2. **临时场景**：使用 `scene.apply` 服务动态创建

---

## 示例对话

### 示例 1：开灯

```
用户: 把客厅的灯打开

Step 1 - 意图识别:
- 操作: turn_on
- 设备类型: light
- 位置: 客厅

Step 2 - 设备匹配:
curl -s -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/states" | \
  jq '.[] | select(.entity_id | startswith("light.")) |
    select(.attributes.friendly_name | test("客厅")) | .entity_id'

结果: light.lumi_cn_374647633_acn01_s_2_light

Step 3 - 执行:
curl -X POST -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "light.lumi_cn_374647633_acn01_s_2_light"}' \
  "$HA_URL/api/services/light/turn_on"

反馈: ✅ 已打开 客厅网关 RGB彩灯
```

### 示例 2：查询状态

```
用户: 客厅灯开了没？

Step 1 - 意图识别:
- 操作: query
- 设备类型: light
- 位置: 客厅

Step 2 - 设备匹配: light.lumi_cn_374647633_acn01_s_2_light

Step 3 - 查询:
curl -s -H "Authorization: Bearer $HA_TOKEN" \
  "$HA_URL/api/states/light.lumi_cn_374647633_acn01_s_2_light" | \
  jq '{state, friendly_name: .attributes.friendly_name}'

反馈: 📍 客厅网关 RGB彩灯 状态: 关闭
```

### 示例 3：设置温度

```
用户: 空调调到26度

Step 1 - 意图识别:
- 操作: set_temperature
- 设备类型: climate
- 参数: temperature=26

Step 2 - 设备匹配:
curl -s -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/states" | \
  jq '.[] | select(.entity_id | startswith("climate.")) | .entity_id'

结果: climate.yeelink_cn_407821471_v6

Step 3 - 执行:
curl -X POST -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "climate.yeelink_cn_407821471_v6", "temperature": 26}' \
  "$HA_URL/api/services/climate/set_temperature"

反馈: ✅ 浴霸已设置到 26°C
```

### 示例 4：模糊匹配多设备

```
用户: 打开房间灯

Step 2 - 设备匹配:
curl -s -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/states" | \
  jq '.[] | select(.entity_id | startswith("light.")) |
    select(.attributes.friendly_name | test("房间|room|bedroom")) |
    {entity_id, friendly_name: .attributes.friendly_name}'

结果: 找到多个设备
- light.xxx (大房间网关 指示灯)
- light.yyy (小房间风扇 指示灯)

反馈: 找到多个设备：
1. 大房间网关 指示灯
2. 小房间风扇 指示灯
请指定要控制的设备，或者说"所有"一起操作。
```

### 示例 5：批量操作

```
用户: 把所有灯都关了

Step 1 - 意图识别:
- 操作: turn_off
- 设备类型: light
- 批量: all

Step 3 - 执行:
curl -X POST -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "all"}' \
  "$HA_URL/api/services/light/turn_off"

反馈: ✅ 已关闭所有灯
```

---

## API 参考

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/` | GET | 检查 API 状态 |
| `/api/states` | GET | 获取所有实体 |
| `/api/states/<entity_id>` | GET | 获取单个实体状态 |
| `/api/services/<domain>/<service>` | POST | 调用服务 |
| `/api/events/<event_type>` | POST | 触发事件 |

---

## 注意事项

1. **安全操作**：首次操作不确定的设备时，建议先查询状态
2. **设备离线**：操作前检查设备状态是否为 `unavailable`
3. **批量操作**：使用 `entity_id: "all"` 可操作某类所有设备
4. **场景优先**：对于复杂的多设备操作，优先使用预定义场景
5. **Token 安全**：不要在日志中暴露 Token 信息

---

## 相关技能

- `executor` - 此技能专供 executor Agent 使用
- `automation-workflows` - 复杂自动化场景设计

---

## 相关文档

- [Home Assistant + 小米设备集成配置指南](../docs/homeassistant-xiaomi-setup.md) - HA 安装、小米集成、OAuth 配置
- [Home Assistant REST API 文档](https://developers.home-assistant.io/docs/api/rest/) - 官方 API 参考
