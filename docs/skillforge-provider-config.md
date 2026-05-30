# SkillForge Provider Config

## Purpose

This document explains how to configure the LLM provider used by `SkillForge` for:

- `betterPlan`
- `betterPrompt`
- skill IR extraction
- skill routing

This is separate from runtime quota control.

Quota is configured in:

`~/.openclaw/runtime/skillforge-flags.json`

Provider credentials are configured through:

- environment variables, or
- `~/.openclaw/openclaw.json`
- repo-local `.skillforge/openclaw.json`

## Real Runtime Environment

The current OpenClaw runtime is on:

```text
ssh yankeeting@192.168.0.12
```

So if you are configuring the real shared runtime, you should edit the config on that machine, not only on your local laptop.

Typical flow:

```bash
ssh yankeeting@192.168.0.12
cd ~/.openclaw
```

Then edit:

```text
~/.openclaw/openclaw.json
```

The repository now also includes a checked-in default provider config:

```text
.skillforge/openclaw.json
```

This is meant to make a fresh pull usable immediately on the runtime machine for:

- model selection
- base URL defaults

It does not store secrets.

## Current Resolution Order

The runtime loader lives in [src/skillforge/provider-config.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/provider-config.mjs).

Current precedence is:

1. `OPENAI_API_KEY` or `DEEPSEEK_API_KEY`
2. `OPENAI_BASE_URL` or `DEEPSEEK_BASE_URL`
3. merged config from:
   - `~/.openclaw/openclaw.json`
   - `.skillforge/openclaw.json`

The current implementation merges user-level config with repo-local config, and repo-local config is allowed to override model and base URL defaults.

If neither environment variables nor config file provide a usable API key, SkillForge fails explicitly with:

`MISSING_PROVIDER_CREDENTIALS`

## Config File Path

SkillForge reads:

```text
~/.openclaw/openclaw.json
```

and also:

```text
.skillforge/openclaw.json
```

## Supported Provider Shapes

The current loader accepts provider entries under:

```json
{
  "models": {
    "providers": {
      "OpenAI": { "...": "..." },
      "openai": { "...": "..." },
      "DeepSeek": { "...": "..." },
      "deepseek": { "...": "..." }
    }
  }
}
```

That means file-based config now supports both:

- OpenAI-style provider entries
- DeepSeek-style provider entries

## Recommended Models

Based on your current runtime note, the recommended models to document are:

- `gpt-5.4-mini`
- `deepseek-v4-flash`

## Recommended Minimal Config: OpenAI

Use this when you want `SkillForge` to run on `gpt-5.4-mini`:

```json
{
  "models": {
    "providers": {
      "OpenAI": {
        "apiKey": "sk-xxxx",
        "baseURL": "https://api.openai.com/v1",
        "models": [
          { "id": "gpt-5.4-mini" }
        ]
      }
    }
  }
}
```

## Recommended Minimal Config: DeepSeek

Use this when you want `SkillForge` to run on `deepseek-v4-flash`:

```json
{
  "models": {
    "providers": {
      "DeepSeek": {
        "apiKey": "sk-xxxx",
        "baseURL": "https://api.deepseek.com/v1",
        "models": [
          { "id": "deepseek-v4-flash" }
        ]
      }
    }
  }
}
```

## Model Selection

SkillForge chooses the model in this order:

1. first configured provider model under `models.providers.*.models[0].id`
2. provider-level `model`
3. top-level `model`
4. `default_model`
5. `llm.model`
6. built-in default: `deepseek-chat`

In practice, the cleanest approach is to always set:

```json
"models": [
  { "id": "your-model" }
]
```

inside the provider block you want to use.

## Environment Variable Override

You can override file-based config with environment variables.

PowerShell examples:

OpenAI:

```powershell
$env:OPENAI_API_KEY = "sk-xxxx"
$env:OPENAI_BASE_URL = "https://api.openai.com/v1"
```

DeepSeek:

```powershell
$env:DEEPSEEK_API_KEY = "sk-xxxx"
$env:DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
```

This is useful for:

- local debugging
- temporary credential switching
- CI or one-off sessions

In the current checked-in setup, the most practical pattern is:

- keep model selection in `.skillforge/openclaw.json`
- keep secrets in environment variables or `~/.openclaw/openclaw.json`

## Endpoint Shape

The runtime converts the provider base URL into:

```text
{baseURL}/chat/completions
```

So if your `baseURL` is:

```text
https://api.openai.com/v1
```

the final endpoint becomes:

```text
https://api.openai.com/v1/chat/completions
```

Likewise, if your `baseURL` is:

```text
https://api.deepseek.com/v1
```

the final endpoint becomes:

```text
https://api.deepseek.com/v1/chat/completions
```

Do not put `/chat/completions` directly into `baseURL`.

## What Happens When Config Is Missing

SkillForge is now in strict LM mode.

That means:

- no provider key => direct failure
- request timeout => direct failure
- bad model response => direct failure

The system no longer falls back to heuristic local output.

Typical structured error:

```json
{
  "success": false,
  "error": {
    "name": "ModelInvocationError",
    "code": "MISSING_PROVIDER_CREDENTIALS",
    "message": "missing provider credentials"
  }
}
```

## Quick Check

After configuring the provider on the real runtime machine, verify with:

```bash
pnpm betterplan -- --plan "Review a simple browser-flow validation plan"
pnpm betterprompt -- --prompt "Compile execution guidance for a browser flow validation task"
```

If provider config is still missing, both commands fail immediately with a structured error.

If the repo-local config is present but the API key is still missing, the most common fix is to add one of:

```powershell
$env:OPENAI_API_KEY = "sk-xxxx"
```

or:

```powershell
$env:DEEPSEEK_API_KEY = "sk-xxxx"
```

## Notes

- Provider config and quota config are different things.
- Setting quota alone does not make the system runnable.
- For the current shared OpenClaw runtime, update provider config on `yankeeting@192.168.0.12`.
- The checked-in `.skillforge/openclaw.json` is safe to commit because it only carries non-secret defaults.
