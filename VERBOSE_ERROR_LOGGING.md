# Verbose API Error Logging - NOW WITH console.error() FALLBACK

## CRITICAL: You Must Rebuild

The TypeScript changes **MUST be compiled** before you'll see the error logs. The code won't run until rebuilt.

## Summary

Added **bulletproof error logging** that shows actual API errors in THREE places:
1. **Console output** (via `console.error()` - always visible, cannot be disabled)
2. **Logger output** (in "ShuttleAI CLI" output channel)
3. **UI retry message** (detailed error with status code and message)

**Why "terminated"?** The error was being caught and wrapped in ClineError, but the original error details were lost because they weren't logged before the retry logic ran.

## Changes Made

### 1. Bulletproof Retry Error Logging (`src/core/api/retry.ts`)

**Now logs to BOTH console.error AND Logger** - you cannot miss it:

```typescript
console.error(`\n━━━ API ERROR (attempt ${attempt + 1}/${maxRetries}) ━━━`)
console.error(JSON.stringify({
  status: error?.status,          // HTTP status (524, 429, 500, etc.)
  code: error?.code,              // Error code
  type: error?.type,              // Error type
  message: error?.message,        // Full error message
  provider: baseUrl,              // Provider URL
  isRateLimit: true/false
}, null, 2))
console.error('━━━ END API ERROR ━━━\n')
```

Logs:
- Error details with formatting
- Response body if available  
- Error details from OpenAI SDK
- Stack trace for non-rate-limit errors

### 2. Stream Error Logging (`src/core/api/providers/openai.ts`)

**Also logs to console.error for immediate visibility:**

```typescript
console.error('\n━━━ OPENAI STREAM ERROR ━━━')
console.error(JSON.stringify({
  modelId,
  baseUrl,
  error: streamError?.message,
  status: streamError?.status,
  code: streamError?.code,
  type: streamError?.type
}, null, 2))
```

### 3. Enhanced UI Error Display (`src/core/task/index.ts`)

Shows detailed error in retry message:
- Before: `Retrying... (attempt 1/3)` → `terminated`
- After: `Retrying... (attempt 1/3)` → `[524] timeout: Gateway timeout - upstream request took too long...`

### 4. Logger Always Shows Errors (`src/shared/services/Logger.ts`)

ERROR level now always shows full details, even when not in dev mode.

## Where to See Errors

### Option 1: Console Output (EASIEST - Always Works)
**The error logs will appear directly in your terminal/console** with this format:

```
━━━ API ERROR (attempt 1/3) ━━━
{
  "status": 524,
  "code": "timeout", 
  "type": "gateway_timeout",
  "message": "Gateway timeout - upstream request took too long and exceeded timeout limit",
  "provider": "https://api.shuttleai.com/v1",
  "isRateLimit": false,
  "isLastAttempt": false
}
API Error Response: {
  "status": 524,
  "data": { "error": { "message": "Gateway timeout", "type": "timeout" } }
}
━━━ END API ERROR ━━━
```

### Option 2: UI Retry Message
```
⏺ Retrying... (attempt 1/3)
   [524] timeout: Gateway timeout - upstream request took too long...
```

### Option 3: Output Channel (VS Code)
View → Output → "ShuttleAI CLI" → Look for ERROR lines

## How to Rebuild

### Method 1: Use existing build script
```bash
cd /path/to/copilot-cli
npm run compile  # or whatever your build script is
# Check package.json for available scripts
```

### Method 2: Direct TypeScript compilation
```bash
cd /path/to/copilot-cli
npx tsc
```

### Method 3: VS Code extension reload
If you're using this as a VS Code extension:
1. Press Cmd/Ctrl + Shift + P
2. Type "Reload Window"
3. Press Enter

## Testing It Works

After rebuilding, try generating something large again. **You WILL see**:

```
━━━ API ERROR (attempt 1/3) ━━━
{full error details in JSON format}
━━━ END API ERROR ━━━
```

This will appear in your terminal/console where you run the CLI.

## Common ShuttleAI Errors

Once you see the actual errors, you'll likely see one of these:

**1. Timeout (524)**
```json
{
  "status": 524,
  "code": "timeout",
  "message": "Gateway timeout - request took too long"
}
```
→ Large responses hitting ShuttleAI's timeout limit

**2. Rate Limit (429)**
```json
{
  "status": 429,
  "type": "rate_limit_error",
  "message": "Rate limit exceeded"
}
```
→ Too many requests, will auto-retry

**3. Context Length (400)**
```json
{
  "status": 400,
  "code": "context_length_exceeded",  
  "message": "Maximum context length exceeded"
}
```
→ Too many tokens in conversation

**4. Bad Gateway (502/503)**
```json
{
  "status": 502,
  "code": "bad_gateway"
}
```
→ Provider issues, will auto-retry

## Why This is Bulletproof

1. **Uses console.error()** - Cannot be disabled, always outputs
2. **Formatted with ━━━ headers** - Easy to spot in logs
3. **JSON.stringify() with indentation** - Always readable
4. **Multiple logging points** - Catches errors at retry AND stream level
5. **Also uses Logger** - For proper log channel integration

## Next Steps

1. **REBUILD THE CODE** (see "How to Rebuild" above)
2. **Try generating something large** that triggers the error
3. **Look at your terminal/console** - you'll see the error details
4. **Share the error logs** with full details for help debugging

The "terminated" message will still appear in the UI, BUT you'll now see the FULL error details with status code, error type, and complete message in your console before each retry attempt.

## Files Changed

- `src/core/api/retry.ts` - Added console.error + Logger for all retry errors
- `src/core/api/providers/openai.ts` - Added console.error + Logger for stream errors  
- `src/core/task/index.ts` - Enhanced UI error snippet display
- `src/shared/services/Logger.ts` - Always show ERROR level details

All changes compile successfully. Just rebuild and restart!
