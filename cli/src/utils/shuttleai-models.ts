/**
 * Utility to fetch and cache models for OpenAI-compatible APIs (ShuttleAI or custom)
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

// In-memory cache - keyed by endpoint URL
const cachedModels: Map<string, string[]> = new Map()
const fetchPromises: Map<string, Promise<string[]>> = new Map()

/**
 * Fetch models from an OpenAI-compatible API endpoint using the stored API key.
 * Returns cached results if available, or fetches from API.
 * Supports both ShuttleAI and custom endpoints.
 */
export async function fetchShuttleAIModels(): Promise<string[]> {
	const config = StateManager.get().getApiConfiguration() as Record<string, string>
	const apiKey = config["openAiApiKey"] || process.env.SHUTTLEAI_API_KEY || ""
	const baseUrl = config["openAiBaseUrl"] || SHUTTLE_BASE_URL

	// Check cache first
	const cached = cachedModels.get(baseUrl)
	if (cached) {
		return cached
	}

	// If already fetching for this endpoint, wait for that promise
	const existingPromise = fetchPromises.get(baseUrl)
	if (existingPromise) {
		return existingPromise
	}

	const fetchPromise = (async () => {
		try {
			if (!apiKey) {
				return []
			}

			const response = await fetch(`${baseUrl}/models`, {
				headers: { Authorization: `Bearer ${apiKey}` },
			})
			if (!response.ok) {
				throw new Error(`Failed to fetch models: ${response.status}`)
			}

			const data = (await response.json()) as { data?: ShuttleAIModel[] }
			if (data?.data) {
				const models = data.data.map((m) => m.id).sort((a, b) => a.localeCompare(b))
				cachedModels.set(baseUrl, models)
				return models
			}
			return []
		} catch (error) {
			Logger.debug(`Failed to fetch models from ${baseUrl}:`, error)
			return []
		} finally {
			fetchPromises.delete(baseUrl)
		}
	})()

	fetchPromises.set(baseUrl, fetchPromise)
	return fetchPromise
}

/**
 * Clear the model cache (useful when switching endpoints)
 */
export function clearModelCache(endpoint?: string): void {
	if (endpoint) {
		cachedModels.delete(endpoint)
	} else {
		cachedModels.clear()
	}
}
