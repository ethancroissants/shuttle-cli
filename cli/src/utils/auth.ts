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
 * Check if ShuttleAI credentials are stored (openai provider pointing to shuttleai).
 */
export async function checkShuttleAIConfigured(): Promise<boolean> {
	const config = StateManager.get().getApiConfiguration() as Record<string, unknown>
	return !!(config["openAiApiKey"] && config["openAiBaseUrl"] === SHUTTLEAI_BASE_URL)
}

// Keep old name as alias for any remaining callsites
export const checkAnyProviderConfigured = checkShuttleAIConfigured
