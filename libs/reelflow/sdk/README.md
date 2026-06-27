# Reelflow Creator SDK (high-code)

The authoring surface for video templates. A template is a TypeScript file that
imports this SDK and orchestrates capability methods. The SDK is job-bound
(workspace/user/billing) with metering, retry, asset hosting and checkpointing
built in. External providers are wrapped here, once.

```ts
import { createSdk } from '@libs/reelflow/sdk'
const sdk = createSdk(session)   // session = { id, workspaceId, userId, frozenCredits, renderMp4Requested, imageConcurrency? }
```

## Methods
- **text** (AI 文案) — `sdk.text.generate(prompt, opts)`, `sdk.text.json<T>(prompt, opts)`
- **image** (AI 图像) — `sdk.image.generate(prompt, { size, quality, ... })` → hosted http url
- **tts** (文本转语音) — `sdk.tts.speak(text, { voice, speed, emotion, align })` → url + durationMs + aligned captions
- **captions** (字幕提取/对齐) — `sdk.captions.fromVoice(voiceResult, fallbackText)`; `extract(audioUrl)` reserved (ASR)
- **video** (AI 视频) — `sdk.video.generate(prompt)` reserved (planned: Seedance 2.0 / HappyHorse; config.ai.video)
- **draft** (剪映草稿 + 出片) — `sdk.draft.assemble({ width, height, scenes, audios, captions, captionStyle })`; `sdk.draft.renderMp4(draftUrl)`
- **asset** — `sdk.asset.upload(buffer, opts)`; `sdk.asset.search(query)` reserved (library)

## Orchestration (checkpoint-aware)
- `sdk.stage(code, fn)` — tracked stage; completed stages skip on retry.
- `sdk.item(key, fn)` / `sdk.mapItems(items, fn, { concurrency, key })` — per-item checkpoint + bounded parallelism.
- `sdk.log(level, message, data?)` — job timeline.

## Conventions
- Media URLs must be public http/https (capcut-mate rejects data URLs); `image`/`tts` host automatically.
- Time values in the SDK domain are milliseconds.
- Reserved methods throw `provider_unconfigured` until wired — don't depend on them yet.

A template = `defineTemplate({ code, name, schema, fields, estimate, run(sdk, input) })`; the worker resolves the job's templateCode, builds the SDK session, and runs it.
