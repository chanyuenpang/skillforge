import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveProviderConfig } from '../../src/skillforge/provider-config.mjs';

test('resolveProviderConfig can force zhipu provider and model via environment', () => {
  const oldProvider = process.env.SKILLFORGE_PROVIDER;
  const oldModel = process.env.SKILLFORGE_MODEL;

  process.env.SKILLFORGE_PROVIDER = 'zhipu';
  process.env.SKILLFORGE_MODEL = 'glm-5-turbo';

  try {
    const result = resolveProviderConfig({
      models: {
        providers: {
          zhipu: {
            apiKey: 'zhipu-key',
            baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
            models: [{ id: 'glm-5-turbo' }],
          },
          DeepSeek: {
            apiKey: 'deepseek-key',
            baseUrl: 'https://api.deepseek.com/v1',
            models: [{ id: 'deepseek-v4-flash' }],
          },
        },
      },
    });

    assert.equal(result.apiKey, 'zhipu-key');
    assert.equal(result.baseUrl, 'https://open.bigmodel.cn/api/coding/paas/v4');
    assert.equal(result.llm.model, 'glm-5-turbo');
    assert.equal(result.endpoint, 'https://open.bigmodel.cn/api/coding/paas/v4/chat/completions');
  } finally {
    if (oldProvider === undefined) delete process.env.SKILLFORGE_PROVIDER;
    else process.env.SKILLFORGE_PROVIDER = oldProvider;
    if (oldModel === undefined) delete process.env.SKILLFORGE_MODEL;
    else process.env.SKILLFORGE_MODEL = oldModel;
  }
});
