import { StateManager } from "@/core/storage/StateManager"

const SHUTTLEAI_BASE_URL = "https://api.shuttleai.com/v1"

/**
 * Check if the user has a ShuttleAI API key configured.
 * Supports SHUTTLEAI_API_KEY env var as a shortcut.
 */
export async function isAuthConfigured(): Promise<boolean> {
	// Allow env-var override for headless/CI usage
	if (process.env.SHUTTLEAI_API_KEY) {
		return true
	}

	const stateManager = StateManager.get()

	// Check welcomeViewCompleted as the single source of truth
	const welcomeViewCompleted = stateManager.getGlobalStateKey("welcomeViewCompleted")
	if (welcomeViewCompleted !== undefined) {
		return welcomeViewCompleted
	}

	// First run: check if a ShuttleAI key is already stored
	const hasKey = await checkShuttleAIConfigured()
	stateManager.setGlobalState("welcomeViewCompleted", hasKey)
	await stateManager.flushPendingState()
	return hasKey
}

/**
 * Check if ShuttleAI or custom OpenAI-compatible API credentials are stored.
 * Accepts any endpoint with an API key, not just ShuttleAI's.
 */
export async function checkShuttleAIConfigured(): Promise<boolean> {
	const config = StateManager.get().getApiConfiguration() as Record<string, unknown>
	// Valid if we have an API key and a base URL (either ShuttleAI or custom)
	return !!(config["openAiApiKey"] && config["openAiBaseUrl"])
}

// Keep old name as alias for any remaining callsites
export const checkAnyProviderConfigured = checkShuttleAIConfigured
