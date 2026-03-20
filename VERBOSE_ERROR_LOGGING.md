# Verbose API Error Logging Added

## Summary

Added comprehensive error logging to show actual API errors from ShuttleAI (and all other providers) before retry attempts. Previously, errors were silently retried until final failure without showing what went wrong.

## Changes Made

### 1. Enhanced Retry Error Logging (`src/core/api/retry.ts`)

**Before:** Errors were caught and retried silently - you only saw the final failure after 3 attempts.

**After:** Every error is now logged with full details before each retry attempt:

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

### 2. Stream Error Logging (`src/core/api/providers/openai.ts`)

Added try-catch around the streaming loop to catch and log errors that occur during response generation:

```typescript
catch (streamError: any) {
  Logger.error('OpenAI stream error:', {
    modelId: 'claude-opus-4-6',         // Which model was being used
    baseUrl: 'https://api.shuttleai.com/v1',  // Which provider
    error: streamError?.message,         // Error message
    status: streamError?.status,         // HTTP status if available
    code: streamError?.code,            // Provider error code
    type: streamError?.type,            // Error type
  })
  throw streamError
}
```

## What You'll See Now

### Example: ShuttleAI Timeout Error
```
[ERROR] API Error (attempt 1/3): {
  status: 524,
  statusText: "A timeout occurred",
  code: "timeout",
  message: "The upstream request timed out after 60 seconds",
  provider: "https://api.shuttleai.com/v1",
  isRateLimit: false,
  isLastAttempt: false
}
[ERROR] API Error Response: {
  status: 524,
  data: { error: { message: "Gateway timeout", type: "timeout" } }
}
```

### Example: Rate Limit Error
```
[ERROR] API Error (attempt 1/3): {
  status: 429,
  statusText: "Too Many Requests",
  message: "Rate limit exceeded",
  provider: "https://api.shuttleai.com/v1",
  isRateLimit: true,
  isLastAttempt: false
}
[INFO] Retrying after 1000ms...
```

### Example: Stream Interruption
```
[ERROR] OpenAI stream error: {
  modelId: "shuttleai/auto",
  baseUrl: "https://api.shuttleai.com/v1",
  error: "Connection closed unexpectedly",
  status: 502,
  code: "bad_gateway"
}
```

## Common ShuttleAI Errors You Might See

Based on the error types, here are issues you might encounter:

1. **Timeout Errors (524, timeout)**
   - Stream took too long to generate
   - Usually happens on very large responses
   - ShuttleAI's upstream timeout might be too aggressive

2. **Rate Limit (429, rate_limit_error)**
   - Too many requests in a short time
   - Will auto-retry with exponential backoff

3. **Context Length Exceeded (400, context_length_exceeded)**
   - Input + output tokens exceed model's limit
   - Try reducing conversation history

4. **Bad Gateway (502, 503, bad_gateway)**
   - ShuttleAI's upstream provider (Anthropic) is having issues
   - Usually temporary, will auto-retry

5. **Insufficient Credits (402, insufficient_quota)**
   - Out of credits on ShuttleAI account
   - Won't auto-retry (prevents wasting attempts)

## How to Use

1. **Run the CLI** as normal with ShuttleAI configured
2. **Watch the logs** when errors occur
3. **Look for patterns**:
   - If you see `status: 524` frequently → upstream timeout issue
   - If you see `status: 429` → you're being rate limited
   - If you see `status: 500/502/503` → provider having issues
   - If stream errors appear mid-response → network or timeout problem

## Testing the Logging

To test that verbose logging works, you can:

1. **Use a large prompt** to trigger timeout:
   ```bash
   # Ask it to generate something huge
   "Generate a 10,000 line file with detailed comments"
   ```

2. **Make rapid requests** to trigger rate limit:
   ```bash
   # Run multiple tasks quickly in succession
   ```

3. **Use invalid API key** to see auth error:
   ```bash
   # Set wrong API key temporarily
   ```

## Technical Details

- **Logs Location**: Check your terminal/console output
- **Log Level**: ERROR (will always show unless you've disabled error logging)
- **Performance**: Minimal impact - only logs when errors occur
- **Privacy**: API keys are NOT logged (only provider URLs and error messages)

## Next Steps

Once you see the actual errors:

1. **Share the error logs** if you need help diagnosing
2. **Check ShuttleAI's status page** if seeing 5xx errors
3. **Adjust timeout settings** if needed (contact ShuttleAI about upstream timeouts)
4. **Monitor rate limits** and adjust request frequency

The logs will now show you exactly what's happening instead of just "request failed after 3 retries".
