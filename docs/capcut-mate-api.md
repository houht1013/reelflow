# CapCut-Mate API 参考(接口规范 / 参数 / 流程 / 数据格式)

> 依据上游源码梳理:https://github.com/Hommy-master/capcut-mate(已 clone 到 `reference/capcut-mate/`,gitignore,不入库)。
> 上游是 **Python FastAPI** 服务(`pyJianYingDraft` 生成剪映草稿),我们通过 HTTP 调用它。本文档是我们集成的"权威说明书",供模板/SDK 开发参考。

## 1. 基本约定

- **Base path**:所有接口都在 `/openapi/capcut-mate` 前缀下。默认端口 `30000`(docker/uv)。我们本地经代理挂在 `http://127.0.0.1/openapi/capcut-mate/...`。
- **方法**:除 `get_draft`、`gen_video_active_count` 是 `GET`,其余全部 `POST`,`Content-Type: application/json`。
- **语言**:响应文案随请求头 `Accept-Language`(`zh`/`en`,默认 `zh`)。
- **时间单位:微秒**。1 秒 = `1_000_000`。所有 `start`/`end`/`duration`/动画时长都是微秒——这是最容易踩的坑。
- **颜色**:十六进制字符串,如 `#ffffff`。
- **列表参数是"JSON 字符串"**:`audio_infos`/`image_infos`/`captions`/`effect_infos` 等不是数组,而是**被 `JSON.stringify` 过的字符串**。传数组会 422。

### 响应信封(统一格式,HTTP 恒为 200)
`ResponseMiddleware` 把所有响应包成:
```jsonc
// 成功:code=0 + 业务字段平铺在顶层(不是嵌在 data 里)
{ "code": 0, "message": "成功", "draft_url": "...", "track_id": "...", ... }
// 失败:只有 code + message,无业务字段
{ "code": 2008, "message": "音频添加失败" }
```
**注意**:业务失败也返回 HTTP 200,靠 `code != 0` 判断。我们的 `capcut.ts` 必须检查 `code`,不能只看 HTTP 状态。

### 错误码(exceptions.py)
| 段 | 码 | 含义 |
|---|---|---|
| 基础 | 0 | 成功 |
| | 1001 | 参数校验失败(422 会被转成这个;含字段级 message) |
| | 1002/1003/1004 | 资源不存在 / 权限不足 / 认证失败 |
| 业务 2001–2032 | 2001 | 无效草稿 URL |
| | 2002 | 草稿创建失败 |
| | 2005 | 下载文件失败(素材 URL 拉取失败) |
| | 2006 / 2008 / 2010 | 视频 / 音频 / 图片 添加失败 |
| | 2007 / 2009 / 2018 / 2020 | 无效的 音频 / 图片 / 字幕 / 特效 信息 |
| | 2019 / 2021 | 字幕 / 特效 添加失败 |
| | 2022 / 2025 | 特效 / 遮罩 名称未找到 |
| | 2030 / 2031 / 2032 | 云渲染 提交失败 / 任务未找到 / 状态查询失败 |

> 我们实测遇到过 `1001 audio_url must start with http`(schema 层校验)和 `2008 音频添加失败`(素材无效/空音频)。见 §5 集成经验。

## 2. 调用流程(草稿生命周期)

标准"口播视频"链路(与我们模板一致):
```
create_draft(width,height) ─▶ draft_url
   │
   ├─ add_images   (背景图 / 插图,image_infos)      ┐
   ├─ add_audios   (配音 / BGM / 音效,audio_infos)   │ 任意顺序,多次调用,
   ├─ add_captions (字幕,captions)                    │ 都带同一个 draft_url
   ├─ add_effects  (特效,effect_infos)               │ 往草稿里叠加轨道
   ├─ add_videos / add_sticker / add_masks / ...     ┘
   │
   ├─(可选) save_draft(draft_url)   持久化草稿
   ├─ get_draft(draft_id) ─▶ files[]   取草稿文件(供剪映导入)
   └─(可选,云渲染出成片)
        gen_video(draft_url[,apiKey]) ─▶ 提交异步任务
        gen_video_status(draft_url)   ─▶ 轮询 status/progress/video_url
        gen_video_active_count()      ─▶ 当前渲染并发数
```
关键点:
- **`draft_url` 是贯穿全流程的句柄**。create 产出,后续所有 add_* / save / gen 都要带上它。
- **`get_draft` 用的是 `draft_id`**(20–32 位),不是 `draft_url`。draft_url 里通常含 `draft_id=...`。
- add_* 是**增量叠加**:每次调用新增一条轨道/片段并返回其 `track_id`/`segment_ids`。
- 云渲染是**异步**:`gen_video` 只提交,要 `gen_video_status` 轮询到 `completed` 才有 `video_url`。

## 3. 接口目录(40 个)

### 草稿管理
| 接口 | 方法 | 关键入参 | 返回 |
|---|---|---|---|
| `create_draft` | POST | `width`=1920, `height`=1080 | `draft_url`, `tip_url` |
| `save_draft` | POST | `draft_url` | `draft_url` |
| `get_draft` | GET | `draft_id`(20–32 位) | `files: string[]` |

### 素材添加(核心)
| 接口 | 关键入参(JSON 字符串项见 §4) | 返回 |
|---|---|---|
| `add_videos` | `draft_url`, `video_infos` | `draft_url`,`track_id`,`segment_ids/infos` |
| `add_audios` | `draft_url`, `audio_infos` | `draft_url`,`track_id`,`audio_ids` |
| `add_images` | `draft_url`, `image_infos`, `alpha/scale_x/scale_y/transform_x/transform_y`(全局) | `draft_url`,`track_id`,`image_ids`,`segment_ids/infos` |
| `add_captions` | `draft_url`, `captions`, + 全局样式(见 §4.3) | `draft_url`,`track_id`,`text_ids`,`segment_ids/infos` |
| `add_effects` | `draft_url`, `effect_infos` | `draft_url`,`effect_ids`,`segment_ids`,`track_id` |
| `add_filters` | `draft_url`, `filter_infos` | 轨道/片段 id |
| `add_masks` | `draft_url`, 遮罩参数 | 轨道/片段 id |
| `add_sticker` | `draft_url`, 贴纸参数 | 轨道/片段 id |
| `add_keyframes` | `draft_url`, `keyframes` | 片段 id |
| `add_text_style` | `draft_url`, 文本样式/关键词 | 片段 id |
| `easy_create_material` | 一步创建素材 | 素材信息 |

### 资源查询(可用素材名/动画/特效清单)
`get_text_animations` / `get_image_animations` / `get_text_effects`(花字) / `get_effects`(特效) / `get_filters`(滤镜) / `search_sticker` / `get_audio_duration`(取音频真实时长,微秒) / `get_url`。
> 用途:add_* 里的 `in_animation`/`effect_title`/`text_effect`/滤镜名 **必须是系统已存在的名称**,先用这些接口拿到合法名称,否则 2022/2025 "未找到"。

### 云渲染
| 接口 | 方法 | 入参 | 返回 |
|---|---|---|---|
| `gen_video` | POST | `draft_url`, `apiKey?`(须合法 UUID) | `message`(已提交) |
| `gen_video_status` | POST | `draft_url` | `status`(pending/processing/completed/failed),`progress`0–100,`video_url`,`error_message`,时间戳 |
| `gen_video_active_count` | GET | - | 当前并发渲染数 |

### 工具/转换(把数据整理成 add_* 需要的 JSON 字符串)
`timelines` / `audio_timelines`(按时长排时间线) · `audio_infos` / `imgs_infos` / `caption_infos` / `effect_infos` / `filter_infos` / `keyframes_infos` / `video_infos`(把 URL 列表 + 时间线组装成对应的 `*_infos` JSON 字符串) · `str_to_list` / `str_list_to_objs` / `objs_to_str_list`(字符串↔数组互转)。
> 这些是给 Coze/n8n 无代码编排用的"胶水节点"。我们是高代码,自己在 `capcut.ts` 里拼 JSON,一般用不到,但 `get_audio_duration` 有用(拿真实音频时长对齐)。

## 4. 数据格式(JSON 字符串项的字段)

### 4.1 `audio_infos`(add_audios)—— 数组,每项:
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `audio_url` | string | ✅ | **必须 http/https**(schema 层强校验,否则 1001)。data: / 本地路径会被拒 |
| `start` | number | ✅ | 时间轴开始(微秒) |
| `end` | number | ✅ | 时间轴结束(微秒);实际播放时长 = end−start |
| `duration` | number | ❌ | 音频文件总时长(微秒),不传则服务端自动获取 |
| `volume` | number | ❌ | 音量 0.0–2.0,默认 1.0 |
| `audio_effect` | string | ❌ | 音频效果名,如 `reverb` |

### 4.2 `image_infos`(add_images)—— 数组,每项:
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `image_url` | string | ✅ | **必须 http/https**(否则 1001) |
| `start` / `end` | number | ✅ | 显示起止(微秒) |
| `width` / `height` | number | ❌ | 像素;不传则以图片文件为准 |
| `in_animation`/`out_animation`/`loop_animation` | string | ❌ | 动画名(多个用 `|` 分隔),须是合法名称 |
| `*_animation_duration` | number | ❌ | 动画时长(微秒) |
| `transition` / `transition_duration` | string/number | ❌ | 转场;时长 100000–2500000 微秒 |
> add_images 顶层还有全局 `alpha`/`scale_x`/`scale_y`/`transform_x`(像素)/`transform_y`(像素),作用于本次所有图片。

### 4.3 `captions`(add_captions)—— 数组,每项:
`start`(微秒✅) · `end`(微秒✅) · `text`(✅) · `keyword`(高亮词,`|` 分隔) · `keyword_color`(默认 `#ff7100`) · `keyword_font_size` · `font_size`(默认 15) · `in/out/loop_animation` + 各自 `_duration`(微秒) · `text_effect`(花字名/effect_id)。
顶层全局样式:`text_color`(默认 `#ffffff`)、`border_color`、`alignment`(0–5:0左1中2右,3–5 竖排)、`alpha`、`font`(字体名)、`font_size`(默认 **15**)、`letter_spacing`、`line_spacing`、`scale_x/y`、`transform_x/y`、`bold`/`italic`/`underline`、`has_shadow`+`shadow_info`{shadow_color/alpha/diffuse/distance/angle}、`text_effect`。
> ⚠️ **字号坑**:`font_size` 默认 15,数值偏大。Coze 原工作流字幕用 **5**。我们模板已从 16 调到 **6**。

### 4.4 `effect_infos`(add_effects)—— 数组,每项:
`effect_title`(✅ 系统已存在的特效名,如 `录制边框 III`/`金粉闪闪`) · `start`(微秒✅) · `end`(微秒✅)。名称非法→2022。

## 5. 我们的集成现状 & 经验(对应 `libs/reelflow/capcut.ts`)

- 我们封装了:`create_draft` → `add_images`(背景/插图) → `add_audios`(配音) → `add_captions`(字幕),最终把 `draft_url` 作为产物交付(任务详情页可复制)。`gen_video` 走任务的可选 MP4 渲染开关。
- **`captionStyle.fontSize` 直接映射 add_captions 的 `font_size`**——用 6 左右,别用 15/16。
- **所有素材 URL 必须 http/https 且服务端可拉取**:
  - 图片:`REELFLOW_IMAGE_HOST=1` 已托管到 OSS(公网可读)。
  - 音频:TTS 若返回 `data:` 需先托管 OSS(已在 `tts.ts` 修复);**mock 静音必须是合法 mp3**(空 ID3 会 2008,已换 1s 合法静音)。
- 错误处理:判 `code != 0`,把 `message` 透传上层(如 `1001`/`2008`)。
- 草稿链接目前是 `127.0.0.1` 本地地址——**仅部署机可导入**;上线需把 capcut-mate 地址改成可配置的公网域名。

## 6. 待评估(若要还原 Coze 全部效果)
Coze 工作流用到但我们 `capcut.assemble` 暂未接的能力,均可用上表接口补齐:
- **BGM / 开场音效**:多次 `add_audios`(不同 volume/start)。
- **特效**(3D环绕屏、金粉闪闪):`add_effects`(先 `get_effects` 拿合法名)。
- **关键词大字/花字**:`add_captions` 的 `keyword`/`text_effect`(先 `get_text_effects`)。
- **背景图 + 前景插图分层**:两次 `add_images`(缩放/位置不同)。
- **抠图透明**:capcut-mate 无此能力,需在生图/独立抠图服务侧做。

扩展方向:给 `capcut.assemble` 增加 `bgm` / `effects` / `bgImages` / `keyword` 入参,内部多调对应 add_*——这属于"打基础"里的 SDK 增强项(见记忆 video-template-architecture)。
