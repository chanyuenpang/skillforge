#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const TARGET_TOOLS = new Set(['plan_write', 'sessions_spawn']);

function printHelp() {
  console.log(`extract-session-tool-samples

批量提取 OpenClaw sessions 中 plan_write / sessions_spawn 调用样本。

用法:
  node scripts/extract-session-tool-samples.mjs [options]

选项:
  --sessionKey <key>           指定 sessionKey，可重复
  --sessionKeyFile <file>      从文件读取 sessionKey（每行一个，支持 # 注释）
  --toolName <name>            plan_write | sessions_spawn | both（默认 both）
  --limit <n>                  最大输出条数（默认不限）
  --from <iso|ms>              起始时间（含）ISO 字符串或毫秒时间戳
  --to <iso|ms>                结束时间（含）ISO 字符串或毫秒时间戳
  --format <fmt>               json | jsonl（默认 json）
  --out <file>                 输出文件路径（不传则输出到 stdout）
  --baseDir <dir>              sessions 根目录（默认当前目录下 sessions）
  --help                       显示帮助

输入文件格式:
  脚本会在 baseDir 下按 sessionKey 定位日志文件，优先尝试：
  1) <baseDir>/<sessionKey>.jsonl
  2) <baseDir>/<sessionKey>/events.jsonl

输出字段:
  sessionKey, timestamp, toolName, toolCallId,
  toolArgumentsSnippet, toolResultSnippet, sourceFile
`);
}

function parseArgs(argv) {
  const args = {
    sessionKeys: [],
    sessionKeyFile: null,
    toolName: 'both',
    limit: Infinity,
    from: null,
    to: null,
    format: 'json',
    out: null,
    baseDir: path.resolve(process.cwd(), 'sessions'),
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => argv[++i];

    if (a === '--help' || a === '-h') {
      args.help = true;
    } else if (a === '--sessionKey') {
      const v = next();
      if (!v) throw new Error('--sessionKey 需要值');
      args.sessionKeys.push(v);
    } else if (a === '--sessionKeyFile') {
      const v = next();
      if (!v) throw new Error('--sessionKeyFile 需要值');
      args.sessionKeyFile = v;
    } else if (a === '--toolName') {
      const v = next();
      if (!['plan_write', 'sessions_spawn', 'both'].includes(v)) {
        throw new Error('--toolName 必须是 plan_write|sessions_spawn|both');
      }
      args.toolName = v;
    } else if (a === '--limit') {
      const v = Number(next());
      if (!Number.isFinite(v) || v <= 0) throw new Error('--limit 必须是正数');
      args.limit = Math.floor(v);
    } else if (a === '--from') {
      args.from = parseTime(next(), '--from');
    } else if (a === '--to') {
      args.to = parseTime(next(), '--to');
    } else if (a === '--format') {
      const v = next();
      if (!['json', 'jsonl'].includes(v)) throw new Error('--format 必须是 json|jsonl');
      args.format = v;
    } else if (a === '--out') {
      const v = next();
      if (!v) throw new Error('--out 需要值');
      args.out = v;
    } else if (a === '--baseDir') {
      const v = next();
      if (!v) throw new Error('--baseDir 需要值');
      args.baseDir = path.resolve(v);
    } else {
      throw new Error(`未知参数: ${a}`);
    }
  }

  if (args.from && args.to && args.from > args.to) {
    throw new Error('--from 不能晚于 --to');
  }

  return args;
}

function parseTime(raw, flagName) {
  if (!raw) throw new Error(`${flagName} 需要值`);
  if (/^\d+$/.test(raw)) {
    return new Date(Number(raw));
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`${flagName} 时间格式无效: ${raw}`);
  }
  return d;
}

function readSessionKeys(file) {
  const content = fs.readFileSync(file, 'utf8');
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function resolveSessionFile(baseDir, sessionKey) {
  const p1 = path.join(baseDir, `${sessionKey}.jsonl`);
  const p2 = path.join(baseDir, sessionKey, 'events.jsonl');
  if (fs.existsSync(p1)) return p1;
  if (fs.existsSync(p2)) return p2;
  return null;
}

function normalizeToolName(obj) {
  const candidates = [
    obj?.toolName,
    obj?.name,
    obj?.tool?.name,
    obj?.payload?.toolName,
    obj?.payload?.name,
    obj?.data?.toolName,
    obj?.data?.name,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && TARGET_TOOLS.has(c)) return c;
  }
  return null;
}

function normalizeTimestamp(obj) {
  const candidates = [
    obj?.timestamp,
    obj?.time,
    obj?.createdAt,
    obj?.payload?.timestamp,
    obj?.payload?.time,
    obj?.data?.timestamp,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' || typeof c === 'number') {
      const d = new Date(c);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function normalizeToolCallId(obj) {
  const candidates = [
    obj?.toolCallId,
    obj?.callId,
    obj?.id,
    obj?.payload?.toolCallId,
    obj?.payload?.callId,
    obj?.data?.toolCallId,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' || typeof c === 'number') return String(c);
  }
  return '';
}

function snippet(value, max = 300) {
  let text = '';
  if (typeof value === 'string') {
    text = value;
  } else if (value !== undefined) {
    try {
      text = JSON.stringify(value);
    } catch {
      text = String(value);
    }
  }
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function extractArgs(obj) {
  return (
    obj?.toolArguments ??
    obj?.arguments ??
    obj?.args ??
    obj?.payload?.arguments ??
    obj?.payload?.args ??
    obj?.data?.arguments
  );
}

function extractResult(obj) {
  return (
    obj?.toolResult ??
    obj?.result ??
    obj?.output ??
    obj?.payload?.result ??
    obj?.payload?.output ??
    obj?.data?.result
  );
}

function inTimeRange(ts, from, to) {
  if (!ts) return true;
  if (from && ts < from) return false;
  if (to && ts > to) return false;
  return true;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const keys = new Set(args.sessionKeys);
  if (args.sessionKeyFile) {
    for (const k of readSessionKeys(args.sessionKeyFile)) keys.add(k);
  }

  if (keys.size === 0) {
    throw new Error('至少需要提供一个 --sessionKey 或 --sessionKeyFile');
  }

  const wantedTools = args.toolName === 'both'
    ? TARGET_TOOLS
    : new Set([args.toolName]);

  const rows = [];

  for (const sessionKey of keys) {
    const sourceFile = resolveSessionFile(args.baseDir, sessionKey);
    if (!sourceFile) continue;

    const lines = fs.readFileSync(sourceFile, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }

      const toolName = normalizeToolName(obj);
      if (!toolName || !wantedTools.has(toolName)) continue;

      const ts = normalizeTimestamp(obj);
      if (!inTimeRange(ts, args.from, args.to)) continue;

      rows.push({
        sessionKey,
        timestamp: ts ? ts.toISOString() : '',
        toolName,
        toolCallId: normalizeToolCallId(obj),
        toolArgumentsSnippet: snippet(extractArgs(obj)),
        toolResultSnippet: snippet(extractResult(obj)),
        sourceFile,
      });

      if (rows.length >= args.limit) break;
    }

    if (rows.length >= args.limit) break;
  }

  const output = args.format === 'jsonl'
    ? `${rows.map((r) => JSON.stringify(r)).join('\n')}${rows.length ? '\n' : ''}`
    : `${JSON.stringify(rows, null, 2)}\n`;

  if (args.out) {
    fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
    fs.writeFileSync(args.out, output, 'utf8');
  } else {
    process.stdout.write(output);
  }
}

try {
  main();
} catch (err) {
  console.error(`[extract-session-tool-samples] ${err.message}`);
  process.exit(1);
}
