import { executeTask4Runtime } from './src/skillforge/task4-runtime.mjs';

const raw = '请把 betterPrompt 改成：从自然语言里提取 tag 和核心目标，从命中的 skill 吸收约束与 workflow，success criteria 由系统自动推断补全，最终 prompt 不要暴露任何 skill 名称。';

const runtime = await executeTask4Runtime({
  inputText: raw,
  language: 'zh-CN',
  metadata: { source: 'run_task4.mjs' },
});

const output = runtime.output;

import { writeFileSync } from 'fs';
writeFileSync('./runs/task4-evidence.json', JSON.stringify(output, null, 2));

console.log('DONE');
console.log(JSON.stringify(output));
