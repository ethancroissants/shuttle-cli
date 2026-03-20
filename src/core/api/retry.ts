import { Logger } from "@/shared/services/Logger"

interface RetryOptions {
	maxRetries?: number
	baseDelay?: number
	maxDelay?: number
	retryAllErrors?: boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
	maxRetries: 3,
	baseDelay: 1_000,
	maxDelay: 10_000,
	retryAllErrors: false,
}

function isNetworkError(error: any): boolean {
	const message = error?.message?.toLowerCase() ?? ""
	const code = error?.code ?? ""
	return (
		error instanceof TypeError &&
		(message === "terminated" ||
			message.includes("fetch failed") ||
			message.includes("network") ||
			message.includes("connection") ||
			message.includes("socket") ||
			message.includes("econnreset") ||
			message.includes("etimedout") ||
			message.includes("econnrefused"))
	) || ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EPIPE", "ENOTFOUND"].includes(code)
}

function isTimeoutError(error: any): boolean {
	const name = error?.name ?? ""
	const message = error?.message ?? ""
	return (
		name === "APIConnectionTimeoutError" ||
		name === "ConnectTimeoutError" ||
		/timed?\s*out/i.test(message) ||
		/timed?\s*out/i.test(String(error?.cause ?? ""))
	)
}

export class RetriableError extends Error {
	status: number = 429
	retryAfter?: number

	constructor(message: string, retryAfter?: number, options?: ErrorOptions) {
		super(message, options)
		this.name = "RetriableError"

		this.retryAfter = retryAfter
	}
}

export function withRetry(options: RetryOptions = {}) {
	const { maxRetries, baseDelay, maxDelay, retryAllErrors } = { ...DEFAULT_OPTIONS, ...options }

	return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value

		descriptor.value = async function* (...args: any[]) {
			for (let attempt = 0; attempt < maxRetries; attempt++) {
				try {
					yield* originalMethod.apply(this, args)
					return
				} catch (error: any) {
					const isRateLimit = error?.status === 429 || error instanceof RetriableError
					const isRetriable = isRateLimit || isNetworkError(error) || isTimeoutError(error)
					const isLastAttempt = attempt === maxRetries - 1

					// Log detailed error information before retry/fail (both Logger and console for visibility)
					const errorDetails = {
						status: error?.status,
						statusText: error?.statusText,
						code: error?.code,
						type: error?.type,
						message: error?.message,
						name: error?.name,
						provider: (this as any)?.options?.openAiBaseUrl || (this as any)?.options?.apiProvider || 'unknown',
						isRateLimit,
						isLastAttempt,
					}
					
					// Always log to console.error for immediate visibility
					console.error(`\n━━━ API ERROR (attempt ${attempt + 1}/${maxRetries}) ━━━`)
					console.error(JSON.stringify(errorDetails, null, 2))
					
					Logger.error(`API Error (attempt ${attempt + 1}/${maxRetries}):`, errorDetails)
					
					// Log response body if available
					if (error?.response) {
						const responseDetails = {
							status: error.response.status,
							statusText: error.response.statusText,
							headers: error.response.headers,
							data: error.response.data,
						}
						console.error('API Error Response:', JSON.stringify(responseDetails, null, 2))
						Logger.error('API Error Response:', responseDetails)
					}
					
					// Log error details from OpenAI SDK format
					if (error?.error) {
						console.error('API Error Details:', JSON.stringify(error.error, null, 2))
						Logger.error('API Error Details:', error.error)
					}

					// Log stack trace for non-rate-limit errors
					if (!isRateLimit && error?.stack) {
						console.error('Error Stack:', error.stack)
						Logger.error('Error Stack Trace:', error.stack)
					}
					
					console.error(`━━━ END API ERROR ━━━\n`)

					if ((!isRetriable && !retryAllErrors) || isLastAttempt) {
						throw error
					}

					// Get retry delay from header or calculate exponential backoff
					// Check various rate limit headers
					const retryAfter =
						error.headers?.["retry-after"] ||
						error.headers?.["x-ratelimit-reset"] ||
						error.headers?.["ratelimit-reset"] ||
						error.retryAfter

					let delay: number
					if (retryAfter) {
						// Handle both delta-seconds and Unix timestamp formats
						const retryValue = parseInt(retryAfter, 10)
						if (retryValue > Date.now() / 1000) {
							// Unix timestamp
							delay = retryValue * 1000 - Date.now()
						} else {
							// Delta seconds
							delay = retryValue * 1000
						}
					} else {
						// Use exponential backoff if no header
						delay = Math.min(maxDelay, baseDelay * 2 ** attempt)
					}

					const handlerInstance = this as any
					if (handlerInstance.options?.onRetryAttempt) {
						try {
							await handlerInstance.options.onRetryAttempt(attempt + 1, maxRetries, delay, error)
						} catch (e) {
							Logger.error("Error in onRetryAttempt callback:", e)
						}
					}

					await new Promise((resolve) => setTimeout(resolve, delay))
				}
			}
		}

		return descriptor
	}
}
