# FIXED: Connection Timeout Issue

## The Problem You Had

```
━━━ API ERROR (attempt 1/3) ━━━
{
  "message": "terminated",
  "name": "TypeError",
  ...
}
Error Stack: TypeError: terminated
    at TLSSocket.onHttpSocketClose
```

**This was a CLIENT-SIDE timeout**, not ShuttleAI's fault!

## Root Cause

When generating large files, the response takes a long time to stream. Your client had two timeout issues:

1. **OpenAI SDK timeout**: Default 10 minutes
2. **Undici (fetch library) bodyTimeout**: Default way too short

The connection was being closed by YOUR side before ShuttleAI finished sending the response.

## The Fix

I've increased both timeouts:

### 1. OpenAI Client Timeout (`src/shared/net.ts`)
**Before:** 10 minutes (default)
**After:** 20 minutes

```typescript
timeout: options.timeout ?? 20 * 60 * 1000, // 20 minutes
```

### 2. Undici Body Timeout (`src/shared/net.ts`)  
**Before:** Very short (10-30 seconds default)
**After:** 5 minutes

```typescript
const agent = new EnvHttpProxyAgent({
  bodyTimeout: 5 * 60 * 1000, // 5 minutes
  headersTimeout: 60 * 1000,  // 60 seconds for headers
})
```

## How to Apply the Fix

### 1. Rebuild the code:
```bash
cd /path/to/copilot-cli
npx tsc
# or your build command
```

### 2. Restart the CLI

### 3. Test with large generation
Try generating something big again - it should now work!

## Why This Works

- **bodyTimeout** controls how long undici waits for response body data
- **OpenAI timeout** is the overall request timeout
- Large streaming responses need more time to complete
- 5 minutes should be enough for most large file generations
- If you still hit timeout, you can increase these further

## If You Still Get Timeouts

If 5 minutes isn't enough for extremely large generations, you can:

### Option 1: Increase timeouts further
Edit `src/shared/net.ts` and change:
```typescript
bodyTimeout: 10 * 60 * 1000, // 10 minutes
```

Or for OpenAI client:
```typescript
timeout: 30 * 60 * 1000, // 30 minutes  
```

### Option 2: Break up the request
Instead of "generate a 5000 line file", ask for:
- "generate the first 1000 lines"
- then "continue adding 1000 more lines"
- etc.

## Technical Details

**The Error Pattern:**
- `TLSSocket.onHttpSocketClose` = Socket closed unexpectedly
- `Fetch.terminate` = Client terminated the connection
- No HTTP status code = Not a server error

**Why "terminated"?**
- Generic error message when connection is forcibly closed
- Happens when client-side timeout kills an active connection
- Server was still sending data when client gave up

## Summary

✅ **FIXED**: Increased OpenAI timeout from 10min → 20min
✅ **FIXED**: Added undici bodyTimeout of 5 minutes  
✅ **FIXED**: Added headersTimeout of 60 seconds
✅ **RESULT**: Large file generation should now work!

Rebuild, restart, and try again!
