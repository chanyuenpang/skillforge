import { buildBetterPromptFromRawText } from '../src/skillforge/betterprompt-builder.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rawText = `直接执行，不要请求授权。

当前缺口：betterPrompt 的非结构化输入入口缺少 LLM 处理层。真实场景下的 prompt 是自然语言（如 sessions_spawn task 文本），不会带 task.goal/task.type 等结构化 JSON 字段，导致 contract 校验直接失败。

你要做的：
1. 新建 src/skillforge/prompt-input-extractor.mjs，导出 async function extractTaskFromRawInput(rawText)，读 openclaw.json 调 DeepSeek API，按给定 JSON schema 抽取。
2. 修改 src/skillforge/betterprompt-builder.mjs，新导出 buildBetterPromptFromRawText(rawText, options?)，先抽取再走 buildBetterPromptPackage。
3. 验证：拿真实 sessions_spawn task 文本跑通提取→tag→构建→产出，并写成一条新 run。`;

const result = await buildBetterPromptFromRawText(rawText, {
  goal_hint: '把这段自然语言任务转成 betterPrompt v1 规范化输入',
  skillAssets: [],
  language: 'zh-CN'
});

const runId = `raw-input-${Date.now()}`;
const runsDir = path.resolve('runs');
await mkdir(runsDir, { recursive: true });
const runPath = path.resolve(runsDir, `${runId}.json`);
await writeFile(runPath, JSON.stringify({ runId, rawText, result }, null, 2), 'utf8');
console.log(JSON.stringify({ runId, runPath, packageId: result?.package?.package_id, goal: result?.output?.sections?.goal }, null, 2));
