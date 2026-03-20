# Verbose API Error Logging Added

## Summary

Added comprehensive error logging to show **actual API errors** from ShuttleAI (and all providers) in two places:
1. **In the UI** - Shows detailed error info in the retry message (status code, error type, full message)
2. **In the logs** - Full error details in the "ShuttleAI CLI" output channel

Previously, errors were silently retried with only a 50-character snippet, making debugging impossible.

## Changes Made

### 1. Enhanced UI Error Display (`src/core/task/index.ts`)

**Before:** Only showed first 50 characters of error message
```
⏺ Retrying... (attempt 1/3)
```

**After:** Shows status code, error type, and up to 200 characters of the error message
```
⏺ Retrying... (attempt 1/3)
   [524] timeout: Gateway timeout - upstream request took too long and exceeded the 60 second timeout limit. This often happens with large responses.
```

### 2. Enhanced Retry Error Logging (`src/core/api/retry.ts`)

Every error is now logged with full details before each retry attempt:

```typescript
Logger.error(`API Error (attempt ${attempt + 1}/${maxRetries}):`, {
  status: error?.status,              // HTTP status code (e.g., 429, 500, 503)
  statusText: error?.statusText,      // HTTP status text (e.g., "Too Many Requests")
  code: error?.code,                  // Error code from provider
  type: error?.type,                  // Error type (e.g., "rate_limit_error")
  message: error?.message,            // Detailed error message
  name: error?.name,                  // Error class name
  provider: baseUrl,                  // Which provider/URL failed
  isRateLimit: true/false,            // Whether it's a rate limit error
  isLastAttempt: true/false,          // If this is the final attempt
})
```

Additionally logs:
- **Response body** if available (includes API-specific error details)
- **Error details** from OpenAI SDK format errors
- **Stack trace** for non-rate-limit errors (helps debug code issues)

### 3. Stream Error Logging (`src/core/api/providers/openai.ts`)

Added try-catch around the streaming loop to catch and log errors that occur during response generation:

```typescript
catch (streamError: any) {
  Logger.error('OpenAI stream error:', {
    modelId: 'claude-opus-4-6',
    baseUrl: 'https://api.shuttleai.com/v1',
    error: streamError?.message,
    status: streamError?.status,
    code: streamError?.code,
    type: streamError?.type,
  })
}
```

### 4. Logger Always Shows ERROR Details (`src/shared/services/Logger.ts`)

**Changed:** Logger.error() now always shows full error object details, even when not in dev mode.

**Before:** Only showed detailed args when `IS_DEV=true`

**After:** ERROR level always shows full details, other levels still require dev mode

## Where to See the Errors

### Option 1: In the UI (Retry Messages)
The error details now appear directly in the retry status message in the terminal/UI:

```
⏺ Retrying... (attempt 1/3)
   [524] timeout: Gateway timeout - upstream request took too long...
```

### Option 2: In the Output Channel (Full Logs)
1. **In VS Code**: View → Output → Select "ShuttleAI CLI" from dropdown
2. **In CLI**: Logs should appear in your terminal

You'll see detailed logs like:
```
ERROR API Error (attempt 1/3): {
  "status": 524,
  "code": "timeout",
  "type": "gateway_timeout",
  "message": "Gateway timeout - upstream request took too long...",
  "provider": "https://api.shuttleai.com/v1"
}
```

## What You'll See Now

### Example: ShuttleAI Timeout Error

**In UI:**
```
⏺ Retrying... (attempt 1/3)
   [524] timeout: Gateway timeout - upstream request took too long and exceeded the 60 second timeout limit
```

**In Logs:**
```
ERROR [Task abc123] API Error (attempt 1/3): {
  "status": 524,
  "code": "timeout",
  "message": "Gateway timeout - upstream request took too long...",
  "provider": "https://api.shuttleai.com/v1"
}
ERROR API Error Response: {
  "status": 524,
  "data": { "error": { "message": "Gateway timeout", "type": "timeout" } }
}
```

### Example: Rate Limit Error

**In UI:**
```
⏺ Retrying... (attempt 1/3)
   [429] rate_limit_error: Rate limit exceeded. Please slow down your requests.
```

**In Logs:**
```
ERROR API Error (attempt 1/3): {
  "status": 429,
  "type": "rate_limit_error",
  "message": "Rate limit exceeded",
  "isRateLimit": true
}
```

### Example: Stream Interruption

**In UI:**
```
⏺ Retrying... (attempt 2/3)
   [502] bad_gateway: Connection closed unexpectedly during streaming
```

**In Logs:**
```
ERROR OpenAI stream error: {
  "modelId": "shuttleai/auto",
  "baseUrl": "https://api.shuttleai.com/v1",
  "error": "Connection closed unexpectedly",
  "status": 502,
  "code": "bad_gateway"
}
```

## Common ShuttleAI Errors You'll See

1. **Timeout Errors (524, timeout)**
   - `Gateway timeout - upstream request took too long`
   - Usually happens on very large responses
   - ShuttleAI's upstream timeout might be too aggressive

2. **Rate Limit (429, rate_limit_error)**
   - `Rate limit exceeded`
   - Too many requests in a short time
   - Will auto-retry with exponential backoff

3. **Context Length Exceeded (400, context_length_exceeded)**
   - `Maximum context length exceeded`
   - Input + output tokens exceed model's limit
   - Try reducing conversation history

4. **Bad Gateway (502, 503, bad_gateway)**
   - `Bad gateway` or `Service unavailable`
   - ShuttleAI's upstream provider (Anthropic) is having issues
   - Usually temporary, will auto-retry

5. **Insufficient Credits (402, insufficient_quota)**
   - `You have insufficient credits`
   - Out of credits on ShuttleAI account
   - Won't auto-retry (prevents wasting attempts)

## How to Rebuild and See the Changes

### If using the CLI directly:
The TypeScript changes need to be compiled. Depending on your setup:

```bash
# If there's a watch mode running, just restart the CLI
# Otherwise, rebuild the project (check package.json scripts)
npm run compile  # or whatever your build script is
```

### If using VS Code extension:
1. Reload VS Code window (Cmd/Ctrl + Shift + P → "Reload Window")
2. The extension will use the new compiled code

## Testing the Logging

To verify the logging works, try:

1. **Generate a very large file** to trigger timeout:
   ```
   "Generate a 5000 line JavaScript file with detailed comments and complex logic"
   ```

2. **Check the Output Channel**:
   - View → Output
   - Select "ShuttleAI CLI" from dropdown
   - Watch for ERROR logs

3. **Look at the UI retry message** - should now show detailed error info

## What Changed vs Before

| Before | After |
|--------|-------|
| `Retrying... (attempt 1/3)` | `Retrying... (attempt 1/3)`<br>`[524] timeout: Gateway timeout - upstream request took too long...` |
| No logs visible | Full ERROR logs in Output Channel |
| Only 50 chars of error | Up to 200 chars + status code + error type |
| Errors hidden in dev mode only | ERROR level always visible |

## Technical Details

- **Error details always shown**: Changed Logger to always display full error objects for ERROR level
- **UI shows 200 chars**: Increased from 50 to 200 character limit for error snippets
- **Includes status codes**: Now shows HTTP status, error code, and error type
- **Logs location**: "ShuttleAI CLI" output channel (View → Output in VS Code)
- **Performance**: Minimal impact - only logs when errors occur
- **Privacy**: API keys are NOT logged (only provider URLs and error messages)

## Troubleshooting

**Q: I still don't see error details**
- Make sure you've rebuilt/reloaded the CLI
- Check View → Output → "ShuttleAI CLI" channel
- Verify errors are actually occurring (not success on first try)

**Q: Where exactly are the logs?**
- In VS Code: View → Output → Select "ShuttleAI CLI"
- In terminal: Should appear inline with other output
- Look for lines starting with `ERROR`

**Q: Can I make it even more verbose?**
- Set `IS_DEV=true` environment variable for maximum verbosity
- All log levels will show full details, not just ERROR

## Next Steps

Once you see the actual errors:

1. **Share the error logs** with full status code and message if you need help
2. **Check ShuttleAI's status page** if seeing 5xx errors
3. **Contact ShuttleAI support** about timeout issues if it's a recurring 524 error
4. **Monitor rate limits** and adjust request frequency if getting 429 errors

The logs will now show you exactly what ShuttleAI is returning instead of just "failed after 3 retries".
