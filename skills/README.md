# Reelflow Skills（面向 Agent 的开发技能，入库可分享）

这些 Skill 是给桌面编码 Agent（Claude Code / Codex）用的方法论 playbook，配合仓库的 CLI 驱动平台能力。仓库的 `.claude/` 不入库，所以 Skill 放在这里版本化。

## 激活（Claude Code）
把需要的 skill 软链或拷贝到你的 `.claude/skills/`：

```bash
# 软链（推荐，随仓库更新）
ln -s "$(pwd)/skills/reelflow-video-template" .claude/skills/reelflow-video-template
# 或拷贝
cp -r skills/reelflow-video-template .claude/skills/
```

之后 Claude Code 会按 `SKILL.md` 的 description 自动在相关任务时调用。

## 现有 Skill
- **reelflow-video-template** — 拆解对标视频 → 写高代码模板(defineTemplate + SDK) → 测试 → 上架；驱动 `reelflow` CLI。
