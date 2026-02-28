# Installing ShuttleAI CLI

## Prerequisites

- **Node.js** v20 or later — [nodejs.org](https://nodejs.org)
- **npm** v10 or later (comes with Node.js)
- **git**

---

## Install (one command)

```bash
git clone https://github.com/ethancroissants/shuttle-cli
cd shuttle-cli
bash install.sh
```

The install script:
1. Installs root dependencies (`npm install`)
2. Builds the CLI (~4 seconds)
3. Links `shuttle` globally so you can run it from anywhere

On first run, Shuttle asks for your **ShuttleAI API key** — no env vars to set. Get one free at [shuttleai.com/keys](https://shuttleai.com/keys).

---

## Manual steps (if you prefer)

```bash
git clone https://github.com/ethancroissants/shuttle-cli
cd shuttle-cli
npm install --legacy-peer-deps
cd cli && npm install --legacy-peer-deps && npm run build
npm link    # makes 'shuttle' available globally
```

---

## Updating

```bash
git pull
bash install.sh
```

---

## Uninstall

```bash
cd shuttle-cli/cli
npm unlink
```

Config and session data is in `~/.shuttle/data/` — delete that to fully reset.

---

## Why isn't there a prebuilt binary?

`cli/dist/` is in `.gitignore` — build artifacts don't belong in version control. The build takes ~4 seconds, so it's not a big deal.

---

## Troubleshooting

**`Cannot find module '...'`** — Run `npm install` from the repo root before building.

**`node: bad option`** — Node.js is too old. Install v20+ from [nodejs.org](https://nodejs.org).

**Build errors about missing proto files** — The generated proto files are committed, so this shouldn't happen. If it does, run `node scripts/build-proto.mjs` from the root.

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
