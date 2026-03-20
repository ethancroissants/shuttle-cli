# QUICK FIX: See ShuttleAI Error Details

## The Problem
You see "terminated" but not the actual error.

## The Solution
I've added **console.error()** logging that will show you EXACTLY what's failing.

## What You Need to Do

### 1. REBUILD THE CODE
```bash
cd /path/to/github-copilot-cli
npx tsc
# or npm run compile, or npm run build - check package.json
```

### 2. RESTART THE CLI
After rebuilding, restart your CLI/VS Code

### 3. TRY AGAIN
Generate something large that triggers the error

## What You'll See

Instead of just "terminated", you'll now see:

```
━━━ API ERROR (attempt 1/3) ━━━
{
  "status": 524,
  "code": "timeout",
  "type": "gateway_timeout",
  "message": "Gateway timeout - upstream request took too long and exceeded the 60 second timeout limit",
  "provider": "https://api.shuttleai.com/v1",
  "isRateLimit": false,
  "isLastAttempt": false
}
━━━ END API ERROR ━━━
```

This will appear DIRECTLY in your terminal/console.

## Common Errors You'll Likely See

**524 Timeout** = ShuttleAI upstream timeout (large responses failing)
**429 Rate Limit** = Too many requests
**502/503 Bad Gateway** = Provider issues  
**400 Context Length** = Token limit exceeded

## Why This Works

- Uses `console.error()` which CANNOT be disabled
- Logs formatted JSON with full error details
- Catches errors at BOTH retry and stream levels
- Works even if Logger subscribers aren't set up

## Share the Logs

Once you see the error details, share them - they'll show exactly what ShuttleAI is returning!

---

Full documentation in `VERBOSE_ERROR_LOGGING.md`
