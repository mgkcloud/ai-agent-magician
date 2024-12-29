# Automation Worker

This Cloudflare Worker processes screenshots and user goals to generate automation steps using AI models.

## Features

- Analyzes screenshots using Llama 3.2 Vision model
- Generates automation steps using Hermes 2 Pro model
- Supports various automation actions (click, type, wait, hover)
- Type-safe API with TypeScript

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Configure Cloudflare credentials:
```bash
# Add your Cloudflare account ID and API token
wrangler login
```

3. Development:
```bash
yarn dev
```

4. Deploy:
```bash
yarn deploy
```

## API

### POST /

Accepts a JSON payload with:
- `screenshot`: Base64 encoded image
- `goal`: String describing the automation goal

Returns:
```typescript
{
  steps: Array<{
    type: 'click' | 'type' | 'wait' | 'hover';
    target?: string;
    value?: string;
    description: string;
  }>;
  error?: string;
}
```

## Models Used

- `@cf/meta/llama-3.2-11b-vision-instruct`: For screenshot analysis
- `@hf/nousresearch/hermes-2-pro-mistral-7b`: For generating automation steps
