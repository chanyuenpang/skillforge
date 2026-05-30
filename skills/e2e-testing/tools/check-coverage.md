# check-coverage

检查 E2E 测试覆盖情况，生成覆盖率报告。

## 使用时机

- **项目进度评估时**：了解测试覆盖情况
- **提交代码前**：确认关键功能有测试覆盖
- **定期检查时**：评估测试完整性

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| feature_list | 否 | feature-list.json 路径，默认使用 workspace 目录 |
| detailed | 否 | 显示详细报告，默认 false |

## 执行命令

```bash
E2E_DIR="$HOME/.openclaw/workspace/e2e-tests"
FEATURE_LIST="{{feature_list:-$HOME/.openclaw/workspace/feature-list.json}}"
DETAILED="{{detailed:-false}}"

echo "========================================"
echo "E2E 测试覆盖率报告"
echo "========================================"
echo ""

# 检查测试目录
if [ ! -d "$E2E_DIR" ]; then
  echo "警告: E2E 测试目录不存在: $E2E_DIR"
  mkdir -p "$E2E_DIR"
fi

# 检查功能列表文件
if [ ! -f "$FEATURE_LIST" ]; then
  echo "警告: 功能列表文件不存在: $FEATURE_LIST"
  echo ""
  echo "仅统计 E2E 测试文件:"
  
  TEST_COUNT=0
  for test_file in "$E2E_DIR"/*_e2e.json; do
    if [ -f "$test_file" ]; then
      TEST_COUNT=$((TEST_COUNT + 1))
      BASENAME=$(basename "$test_file" _e2e.json)
      echo "  - $BASENAME"
    fi
  done
  
  echo ""
  echo "总计: $TEST_COUNT 个测试文件"
  exit 0
fi

# 完整覆盖率分析
python3 << 'PYTHON_SCRIPT'
import json
import os

e2e_dir = "/home/yankeeting/.openclaw/workspace/e2e-tests"
feature_list_path = "/home/yankeeting/.openclaw/workspace/feature-list.json"
detailed = os.environ.get('DETAILED', 'false') == 'true'

# 加载功能列表
try:
    with open(feature_list_path, 'r') as f:
        feature_data = json.load(f)
    features = feature_data.get('features', [])
    project_name = feature_data.get('project', 'Unknown Project')
except:
    features = []
    project_name = 'Unknown Project'

# 获取 E2E 测试文件
e2e_tests = set()
if os.path.exists(e2e_dir):
    for f in os.listdir(e2e_dir):
        if f.endswith('_e2e.json'):
            # 提取功能ID
            test_id = f.replace('_e2e.json', '')
            e2e_tests.add(test_id)

# 统计
total_features = len(features)
features_with_tests = 0
features_without_tests = []
features_passed = 0
features_pending = 0

for feat in features:
    feat_id = feat.get('id', '')
    has_passes = feat.get('passes', False)
    
    if has_passes:
        features_passed += 1
    else:
        features_pending += 1
    
    # 检查是否有测试（尝试多种匹配）
    test_found = False
    for test_id in e2e_tests:
        if feat_id == test_id or feat_id in test_id or test_id in feat_id:
            test_found = True
            break
    
    if test_found:
        features_with_tests += 1
    else:
        features_without_tests.append({
            'id': feat_id,
            'description': feat.get('description', 'N/A'),
            'passes': has_passes
        })

# 计算覆盖率
if total_features > 0:
    coverage = (features_with_tests / total_features) * 100
else:
    coverage = 0

print(f"项目: {project_name}")
print(f"生成时间: $(date '+%Y-%m-%d %H:%M:%S')")
print("")
print("-" * 60)
print("功能统计")
print("-" * 60)
print(f"总功能数: {total_features}")
print(f"已完成: {features_passed}")
print(f"待处理: {features_pending}")
print("")
print("-" * 60)
print("测试覆盖")
print("-" * 60)
print(f"有测试的功能: {features_with_tests}")
print(f"无测试的功能: {len(features_without_tests)}")
print(f"覆盖率: {coverage:.1f}%")
print("")

# 详细报告
if features_without_tests:
    print("-" * 60)
    print("缺少测试的功能")
    print("-" * 60)
    
    for feat in features_without_tests[:10]:
        status = "[PASS]" if feat['passes'] else "[TODO]"
        print(f"  {status} {feat['id']}: {feat['description'][:40]}")
    
    if len(features_without_tests) > 10:
        print(f"  ... 还有 {len(features_without_tests) - 10} 个")

# 详细模式显示更多信息
if detailed and features:
    print("")
    print("-" * 60)
    print("详细功能列表")
    print("-" * 60)
    
    for feat in features:
        feat_id = feat.get('id', '')
        desc = feat.get('description', '')[:40]
        has_passes = feat.get('passes', False)
        
        # 检查测试
        test_found = False
        for test_id in e2e_tests:
            if feat_id == test_id or feat_id in test_id or test_id in feat_id:
                test_found = True
                break
        
        status = "PASS" if has_passes else "TODO"
        test_status = "有测试" if test_found else "无测试"
        
        print(f"  [{status}] {feat_id}: {desc} ({test_status})")

print("")
print("=" * 60)
if coverage >= 80:
    print("测试覆盖率: 良好")
elif coverage >= 50:
    print("测试覆盖率: 中等，建议增加测试")
else:
    print("测试覆盖率: 较低，需要增加测试")
print("=" * 60)
PYTHON_SCRIPT
```

## 使用示例

### 基本用法

```bash
# 查看覆盖率报告
check-coverage

# 详细报告
check-coverage --detailed true

# 指定功能列表文件
check-coverage --feature_list /path/to/feature-list.json
```

## 返回格式

```
========================================
E2E 测试覆盖率报告
========================================

项目: My Project
生成时间: 2026-04-01 10:00:00

------------------------------------------------------------
功能统计
------------------------------------------------------------
总功能数: 10
已完成: 3
待处理: 7

------------------------------------------------------------
测试覆盖
------------------------------------------------------------
有测试的功能: 4
无测试的功能: 6
覆盖率: 40.0%

------------------------------------------------------------
缺少测试的功能
------------------------------------------------------------
  [TODO] feat-003: 导航栏优化
  [TODO] feat-004: 数据导出功能
  [PASS] feat-001: 用户登录功能
  ...

============================================================
测试覆盖率: 较低，需要增加测试
============================================================
```

## 覆盖率评估标准

| 覆盖率 | 评级 | 建议 |
|--------|------|------|
| >= 80% | 良好 | 继续保持 |
| 50-79% | 中等 | 建议增加测试 |
| < 50% | 较低 | 需要增加测试 |

## 注意事项

1. **依赖 feature-list.json** - 需要功能列表文件才能计算覆盖率
2. **测试文件命名** - 测试文件必须是 `*_e2e.json` 格式
3. **ID 匹配规则** - 功能ID与测试文件ID需匹配（包含关系）
