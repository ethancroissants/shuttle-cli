/**
 * Utility to fetch and cache ShuttleAI models for the CLI
 */

import { StateManager } from "@/core/storage/StateManager"
import { fetch } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"

export const SHUTTLE_DEFAULT_MODEL = "shuttleai/auto"
export const SHUTTLE_BASE_URL = "https://api.shuttleai.com/v1"

interface ShuttleAIModel {
	id: string
	owned_by?: string
}

// In-memory cache
let cachedModels: string[] | null = null
let fetchPromise: Promise<string[]> | null = null

/**
 * Fetch ShuttleAI models from the API using the stored API key.
 * Returns cached results if available, or fetches from API.
 */
export async function fetchShuttleAIModels(): Promise<string[]> {
	// Return cached models if available
	if (cachedModels) {
		return cachedModels
	}

	// If already fetching, wait for that promise
	if (fetchPromise) {
		return fetchPromise
	}

	fetchPromise = (async () => {
		try {
			const config = StateManager.get().getApiConfiguration() as Record<string, string>
			const apiKey = config["openAiApiKey"] || process.env.SHUTTLEAI_API_KEY || ""
			if (!apiKey) {
				return []
			}

			const response = await fetch(`${SHUTTLE_BASE_URL}/models`, {
				headers: { Authorization: `Bearer ${apiKey}` },
			})
			if (!response.ok) {
				throw new Error(`Failed to fetch models: ${response.status}`)
			}

			const data = (await response.json()) as { data?: ShuttleAIModel[] }
			if (data?.data) {
				const models = data.data.map((m) => m.id).sort((a, b) => a.localeCompare(b))
				cachedModels = models
				return models
			}
			return []
		} catch (error) {
			Logger.debug("Failed to fetch ShuttleAI models:", error)
			return []
		} finally {
			fetchPromise = null
		}
	})()

	return fetchPromise
}
