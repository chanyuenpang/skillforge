#!/usr/bin/env node

import path from 'node:path';
import {
  RELATIONAL_INDEX_PATH,
  openRelationalIndexDb,
  assertReadableIndex,
  countIndexRows,
} from '../src/skillforge/relational-index.sqlite.mjs';

function parseArgs(argv) {
  const args = {
    dbPath: RELATIONAL_INDEX_PATH,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const [flag, inlineValue] = token.split('=', 2);
    const takeValue = () => {
      if (inlineValue !== undefined) return inlineValue;
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        i += 1;
        return next;
      }
      return '';
    };
    if (flag === '--db-path') args.dbPath = path.resolve(takeValue());
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { db, path: dbPath } = openRelationalIndexDb(args.dbPath);
  const meta = assertReadableIndex(db);
  const counts = countIndexRows(db);
  console.log(JSON.stringify({
    ok: true,
    dbPath,
    meta,
    counts,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: {
      name: error.name,
      code: error.code || null,
      message: error.message,
      meta: error.meta || null,
    },
  }, null, 2));
  process.exit(2);
});
