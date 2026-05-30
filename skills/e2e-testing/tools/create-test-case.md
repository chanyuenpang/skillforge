# create-test-case

创建新的 E2E 测试用例文件。

## 使用时机

- **功能实现完成后**：创建对应的 E2E 测试用例
- **添加新测试场景时**：创建新的测试用例

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| feature_id | 是 | 功能ID，如 "feat-001" |
| name | 是 | 测试名称 |
| description | 否 | 测试描述 |

## 执行命令

```bash
E2E_DIR="$HOME/.openclaw/workspace/e2e-tests"
FEATURE_ID="{{feature_id}}"
NAME="{{name}}"
DESCRIPTION="{{description:-}}"

mkdir -p "$E2E_DIR"

if [ -z "$FEATURE_ID" ] || [ -z "$NAME" ]; then
  echo "错误: 必须提供 feature_id 和 name 参数"
  exit 1
fi

TEST_FILE="$E2E_DIR/${FEATURE_ID}_e2e.json"

if [ -f "$TEST_FILE" ]; then
  echo "警告: 测试文件已存在: $TEST_FILE"
  exit 1
fi

python3 << 'PYTHON_SCRIPT'
import json

test_file = "/home/yankeeting/.openclaw/workspace/e2e-tests/test_case.json"
feature_id = "PLACEHOLDER"
name = "PLACEHOLDER"
description = "PLACEHOLDER"

test_case = {
    "featureId": feature_id,
    "name": name,
    "description": description if description else f"{name} 的 E2E 测试",
    "preconditions": [
        {"check": "service_running", "service": "application"}
    ],
    "steps": [
        {"step": 1, "action": "访问功能页面", "tool": "browser", "timeout": 10, "expected": "页面正常加载"},
        {"step": 2, "action": "执行主要操作", "tool": "browser", "timeout": 15, "expected": "操作成功"}
    ],
    "verifications": [
        {"check": "element_visible", "target": "success-element", "expected": "true", "description": "验证成功"}
    ],
    "cleanup": ["清理测试数据"]
}

with open(test_file, 'w') as f:
    json.dump(test_case, f, indent=2, ensure_ascii=False)

print("测试用例已创建:", test_file)
PYTHON_SCRIPT

# 替换占位符
sed -i "s/PLACEHOLDER/$FEATURE_ID/g" "$TEST_FILE" 2>/dev/null || true
sed -i "s/PLACEHOLDER/$NAME/g" "$TEST_FILE" 2>/dev/null || true

echo "========================================"
echo "E2E 测试用例已创建"
echo "========================================"
echo "文件: $TEST_FILE"
echo "功能ID: $FEATURE_ID"
echo "名称: $NAME"
echo ""
echo "下一步: 编辑测试文件完善测试步骤"
```

## 使用示例

```bash
# 创建基本测试用例
create-test-case --feature_id feat-001 --name "用户登录功能 E2E 测试"

# 带描述
create-test-case --feature_id feat-002 \
  --name "用户注册功能 E2E 测试" \
  --description "验证新用户可以成功注册账户"
```

## 生成的测试文件格式

```json
{
  "featureId": "feat-001",
  "name": "用户登录功能 E2E 测试",
  "description": "用户登录功能 的 E2E 测试",
  "preconditions": [
    {"check": "service_running", "service": "application"}
  ],
  "steps": [
    {"step": 1, "action": "访问功能页面", "tool": "browser", "timeout": 10, "expected": "页面正常加载"}
  ],
  "verifications": [
    {"check": "element_visible", "target": "success-element", "expected": "true", "description": "验证成功"}
  ],
  "cleanup": ["清理测试数据"]
}
```

## 注意事项

1. **文件命名规范** - 自动生成 `{feature_id}_e2e.json`
2. **文件已存在时不覆盖** - 需要手动删除后重新创建
3. **生成后需要编辑** - 模板生成的步骤需要根据实际情况修改
