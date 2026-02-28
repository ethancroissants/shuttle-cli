# ShuttleAI CLI

<p align="center">
  <strong>🚀 ShuttleAI CLI — Autonomous coding agent powered by ShuttleAI</strong>
</p>

Meet Shuttle, an AI assistant that lives in your terminal. Shuttle can handle complex software development tasks step-by-step — creating and editing files, exploring large projects, running terminal commands, and more.

```bash
npm i -g shuttle-ai

# cd into your project and run:
shuttle
```

---

## 🔑 Getting an API Key

1. Visit [shuttleai.com/keys](https://shuttleai.com/keys)
2. Create a free account and generate an API key (starts with `shuttle-`)
3. Run `shuttle` — you'll be prompted to enter your key on first launch

Or set the environment variable for headless/CI use:

```bash
export SHUTTLEAI_API_KEY=shuttle-your-key-here
shuttle "explain this codebase"
```

---

## 📦 Installation

Build from source — the dist isn't committed, so you need to build it once locally. See **[INSTALL.md](./INSTALL.md)** for the full step-by-step guide.

Quick version:

```bash
git clone https://github.com/YOUR_USERNAME/shuttleai-cli
cd shuttleai-cli
npm install
node scripts/build-proto.mjs
cd cli && npm install && npm run build
node dist/cli.mjs      # or: npm link && shuttle
```

On first run, you'll be prompted for your ShuttleAI API key. No env vars needed.

---

## 🚀 Usage

```bash
# Interactive mode (shows welcome prompt)
shuttle

# Start a task directly
shuttle "refactor this module to use async/await"

# Plan mode
shuttle --plan "design a REST API for a todo app"

# Auto-approve all actions (yolo mode)
shuttle --yolo "add unit tests for all functions"
```

---

## 🤖 Models

ShuttleAI provides access to models from OpenAI, Anthropic, and open-source providers through a single unified API:

| Model | Provider | Tier |
|-------|----------|------|
| `shuttleai/auto` | ShuttleAI | Basic — smart router, picks best model |
| `gpt-5.2` | OpenAI | Basic |
| `gpt-oss-120b` | OpenAI | Free |
| `claude-opus-4.6` | Anthropic | Premium |
| `claude-sonnet-4.6` | Anthropic | Premium |
| `claude-haiku-4.5` | Anthropic | Basic |

Change model with the `--model` flag or `/model` slash command in interactive mode.

---

## ⚙️ Configuration

Config and session data is stored in `~/.shuttle/data/`.

Override with: `export SHUTTLEAI_DATA_DIR=/path/to/data`

---

## 📄 License & Credits

**ShuttleAI CLI** is a fork of [Cline](https://github.com/cline/cline) by Cline Bot Inc., licensed under the [Apache 2.0 License](./LICENSE).

Changes from upstream Cline:
- Replaced multi-provider auth flow with ShuttleAI API key onboarding
- Hardcoded ShuttleAI (`https://api.shuttleai.com/v1`) as the backend — OpenAI-compatible
- Rebranded CLI binary from `cline` → `shuttle`
- Config directory changed from `~/.cline` → `~/.shuttle`
