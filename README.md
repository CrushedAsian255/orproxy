# ORProxy

A proxy for the OpenRouter API that allows deeper customisation from just the model slug.

## Overview

ORProxy is a lightweight Express.js server that acts as a proxy for the OpenRouter API. It allows you to extend model specifications with additional parameters like quantization options, reasoning settings, and provider preferences using extra information in the model name.

Disclaimer: This project is not officially licenced, endorsed, or developed by OpenRouter or their team.

## Features

- **Model Parameter Parsing**: Extend model names with special parameters using the `$` delimiter
- **Quantization Support**: Specify quantization levels (int4, fp8, etc.)
- **Reasoning Options**: Enable and configure reasoning capabilities
- **Provider Filtering**: Restrict requests to specific providers
- **Streaming Support**: Maintains streaming capabilities for real-time responses
- **Usage Tracking**: Automatically includes usage information in responses

## Usage

Install dependencies

```bash
npm install
# or 
bun install
```

Run the server:

```bash
node or_proxy.js
# or
bun or_proxy.js
```

Then, just replace all API calls from `https://openrouter.ai/api/v1` to `http://localhost:3001/v1`. (Note the lack of `/api`)

By default, the server listens on port 3001. You can change this by setting the PORT environment variable:

```bash
PORT=8080 node or_proxy.js
# or 
PORT=8080 bun or_proxy.js
```

## Parameters

The proxy extends model names with additional parameters using the `$` delimiter:

```
{model_name}${param1},{param2},{param3}
```

### Quantization Parameters

- `int4`, `int8`, `fp4`, `fp6`, `fp8`, `fp16`, `bf16`, `fp32`

Example: `moonshotai/kimi-k2$fp8`

### Reasoning Options

- `think` - Enable reasoning
- `think.1000` - Enable reasoning with max 1000 tokens (Anthropic style)
- `think.high` - Enable reasoning with high effort (OpenAI style)

Example: `openai/o3-mini$think.high`

### Provider Filtering

Any parameter that doesn't match quantization or reasoning options is treated as a provider slug.
Provider slug are obtainable by clicking the clipboard icon next to the provider name on OpenRouter.

Example: `deepseek/deepseek-r1-0528$google-vertex`

### Combinations

These can also be combined, for example: `deepseek/deepseek-chat-v3.1$think,fireworks` for DeepSeek V3.1 thinking using Fireworks

## Security

This proxy does not store or log any API keys or request content. All authentication headers are passed through to OpenRouter directly. All traffic is forwarded directly to OpenRouter without any telemetry.
