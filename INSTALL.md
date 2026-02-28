# Installing ShuttleAI CLI from Source

The built output (`cli/dist/`) is **not committed** to this repository — you need to build it locally. This keeps the repo clean and ensures you're always running from your own build.

---

## Prerequisites

- **Node.js** v20 or later — [nodejs.org](https://nodejs.org)
- **npm** v10 or later (comes with Node.js)
- **git**

Check your versions:

```bash
node --version   # should say v20.x.x or higher
npm --version    # should say 10.x.x or higher
```

---

## 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/shuttleai-cli.git
cd shuttleai-cli
```

---

## 2. Install root dependencies

From the repo root (this is required — the CLI imports code from the parent `src/` directory):

```bash
npm install
```

> This may take a minute. It installs the full dependency tree including AI provider SDKs used internally.

---

## 3. Generate proto types

Required once before building (generates TypeScript types from `.proto` files):

```bash
node scripts/build-proto.mjs
```

---

## 4. Build the CLI

```bash
cd cli
npm install
npm run build
```

This produces `cli/dist/cli.mjs` — the single bundled binary. Build takes ~5 seconds.

---

## 5. Run it

```bash
# From inside the cli/ directory:
node dist/cli.mjs

# Or from anywhere after linking globally:
cd cli
npm link
shuttle
```

On first run, Shuttle will ask for your **ShuttleAI API key** — you don't need to set any environment variables. Just paste it in when prompted.

Get a free key at **[shuttleai.com/keys](https://shuttleai.com/keys)**.

---

## Updating

Pull the latest changes and rebuild:

```bash
git pull
node scripts/build-proto.mjs   # only if proto files changed
cd cli && npm run build
```

---

## Uninstall

```bash
cd cli
npm unlink
```

Config and session data is stored in `~/.shuttle/data/` — delete that directory to fully reset.

---

## Why isn't there a prebuilt binary?

The `cli/dist/` directory is in `.gitignore` intentionally. Committing build artifacts alongside source code leads to merge conflicts and bloated history. Build it once locally — it only takes a few seconds.

---

## Troubleshooting

**`Cannot find module '...'`** — Make sure you ran `npm install` in the repo root (step 2) before building the CLI.

**`node: bad option`** — Your Node.js version is too old. Install v20+ from [nodejs.org](https://nodejs.org).

**Proto errors during build** — Re-run `node scripts/build-proto.mjs` from the repo root.

**API key prompt doesn't appear** — Make sure your terminal supports raw/interactive mode (standard terminals like iTerm2, Terminal.app, and Windows Terminal all do).
