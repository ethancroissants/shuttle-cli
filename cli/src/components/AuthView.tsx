/**
 * ShuttleAI Auth view — prompts the user for their ShuttleAI API key.
 * Based on Cline (https://github.com/cline/cline) — Apache 2.0
 */

import { Box, Text, useApp, useInput } from "ink"
import React, { useState } from "react"
import { StateManager } from "@/core/storage/StateManager"
import { COLORS } from "../constants/colors"
import { useStdinContext } from "../context/StdinContext"
import { isMouseEscapeSequence } from "../utils/input"
import { applyProviderConfig } from "../utils/provider-config"

const SHUTTLEAI_BASE_URL = "https://api.shuttleai.com/v1"
const DEFAULT_MODEL = "shuttleai/auto"

interface AuthViewProps {
	controller: any
	onComplete?: () => void
	onError?: () => void
	onNavigateToWelcome?: () => void
}

type Step = "selectApi" | "enterUrl" | "enterKey" | "saving" | "error"

export const AuthView: React.FC<AuthViewProps> = ({ controller, onComplete, onNavigateToWelcome }) => {
	const { exit } = useApp()
	const { isRawModeSupported } = useStdinContext()

	const [step, setStep] = useState<Step>("selectApi")
	const [useCustomApi, setUseCustomApi] = useState(false)
	const [customUrl, setCustomUrl] = useState("")
	const [apiKey, setApiKey] = useState(process.env.SHUTTLEAI_API_KEY ?? "")
	const [errorMsg, setErrorMsg] = useState("")

	const validateUrl = (url: string): boolean => {
		try {
			const parsed = new URL(url)
			return parsed.protocol === "http:" || parsed.protocol === "https:"
		} catch {
			return false
		}
	}

	const handleSubmit = async (key: string) => {
		const trimmed = key.trim()
		if (!trimmed) {
			setErrorMsg("API key cannot be empty.")
			setStep("error")
			return
		}
		setStep("saving")
		try {
			const finalUrl = useCustomApi ? customUrl : SHUTTLEAI_BASE_URL
			await applyProviderConfig({
				providerId: "openai",
				apiKey: trimmed,
				baseUrl: finalUrl,
				modelId: DEFAULT_MODEL,
				controller,
			})
			const stateManager = StateManager.get()
			stateManager.setGlobalState("welcomeViewCompleted", true)
			await stateManager.flushPendingState()
			if (onNavigateToWelcome) {
				onNavigateToWelcome()
			} else if (onComplete) {
				onComplete()
			} else {
				exit()
			}
		} catch (err: any) {
			setErrorMsg(err?.message ?? "Failed to save API key.")
			setStep("error")
		}
	}

	useInput(
		(input, key) => {
			if (isMouseEscapeSequence(input)) return

			// Step 1: Select API type
			if (step === "selectApi") {
				if (input === "s" || input === "S") {
					setUseCustomApi(false)
					setStep("enterKey")
				} else if (input === "c" || input === "C") {
					setUseCustomApi(true)
					setStep("enterUrl")
				}
			}
			// Step 2: Enter custom URL
			else if (step === "enterUrl") {
				if (key.return) {
					const trimmed = customUrl.trim()
					if (!trimmed) {
						setErrorMsg("URL cannot be empty.")
						setStep("error")
					} else if (!validateUrl(trimmed)) {
						setErrorMsg("Invalid URL. Must start with http:// or https://")
						setStep("error")
					} else {
						setStep("enterKey")
					}
				} else if (key.backspace || key.delete) {
					setCustomUrl((v) => v.slice(0, -1))
				} else if (input && !key.ctrl && !key.meta) {
					setCustomUrl((v) => v + input)
				}
			}
			// Step 3: Enter API key
			else if (step === "enterKey") {
				if (key.return) {
					handleSubmit(apiKey)
				} else if (key.backspace || key.delete) {
					setApiKey((v) => v.slice(0, -1))
				} else if (input && !key.ctrl && !key.meta) {
					setApiKey((v) => v + input)
				}
			}
			// Error state
			else if (step === "error") {
				if (key.return) {
					// Return to appropriate step based on error
					if (errorMsg.includes("URL")) {
						setStep("enterUrl")
					} else {
						setStep("enterKey")
					}
					setErrorMsg("")
				}
			}
		},
		{ isActive: isRawModeSupported },
	)

	const maskedKey = apiKey ? "•".repeat(Math.min(apiKey.length, 32)) : ""

	// Render content based on current step
	const renderContent = () => {
		if (step === "saving") {
			return <Text color="yellow">Saving configuration…</Text>
		}

		if (step === "error") {
			return (
				<Box flexDirection="column">
					<Text bold color="red">
						Error
					</Text>
					<Text color="yellow">{errorMsg}</Text>
					<Text color="gray">(Press Enter to try again)</Text>
				</Box>
			)
		}

		if (step === "selectApi") {
			return (
				<Box flexDirection="column">
					<Text bold color="white">
						Choose API Provider
					</Text>
					<Text> </Text>
					<Text>
						<Text color={COLORS.primaryBlue}>[S]</Text> <Text color="white">ShuttleAI</Text>{" "}
						<Text color="gray">(shuttleai.com)</Text>
					</Text>
					<Text>
						<Text color={COLORS.primaryBlue}>[C]</Text> <Text color="white">Custom API</Text>{" "}
						<Text color="gray">(OpenAI-compatible)</Text>
					</Text>
					<Text> </Text>
					<Text color="gray">Press S or C to select</Text>
				</Box>
			)
		}

		if (step === "enterUrl") {
			return (
				<Box flexDirection="column">
					<Text bold color="white">
						Enter Custom API Endpoint
					</Text>
					<Text color="gray">Must be OpenAI-compatible (e.g., https://api.example.com/v1)</Text>
					<Text> </Text>
					<Box>
						<Text color={COLORS.primaryBlue}>&gt; </Text>
						{!customUrl ? (
							<Text color="gray">https://</Text>
						) : (
							<Text color="white">{customUrl}</Text>
						)}
						<Text inverse> </Text>
					</Box>
					<Text> </Text>
					<Text color="gray">(Press Enter to confirm)</Text>
				</Box>
			)
		}

		if (step === "enterKey") {
			const apiName = useCustomApi ? "custom API" : "ShuttleAI"
			const keyExample = useCustomApi ? "sk-..." : "shuttle-..."
			const getKeyUrl = useCustomApi ? customUrl : "shuttleai.com/keys"

			return (
				<Box flexDirection="column">
					<Text bold color="white">
						Enter your {apiName} API key
					</Text>
					{!useCustomApi && <Text color="gray">Get one free at {getKeyUrl}</Text>}
					{useCustomApi && (
						<Text color="gray">
							Endpoint: <Text color="cyan">{customUrl}</Text>
						</Text>
					)}
					<Text> </Text>
					<Box>
						<Text color={COLORS.primaryBlue}>&gt; </Text>
						{!maskedKey ? <Text color="gray">{keyExample}</Text> : <Text color="white">{maskedKey}</Text>}
						<Text inverse> </Text>
					</Box>
					<Text> </Text>
					<Text color="gray">(Press Enter to confirm)</Text>
				</Box>
			)
		}

		return null
	}

	return (
		<Box flexDirection="column" paddingLeft={2} paddingRight={2} width="100%">
			{/* Banner */}
			<Box justifyContent="center" marginBottom={1} marginTop={1}>
				<Text bold color="cyan">
					🚀 ShuttleAI CLI
				</Text>
			</Box>
			<Box justifyContent="center" marginBottom={1}>
				<Text color="gray">Autonomous coding agent powered by ShuttleAI</Text>
			</Box>
			<Box justifyContent="center" marginBottom={1}>
				<Text color="dim">Based on Cline (github.com/cline/cline) · Apache 2.0</Text>
			</Box>

			{/* Content box */}
			<Box
				borderColor="gray"
				borderStyle="round"
				flexDirection="column"
				marginTop={1}
				paddingBottom={1}
				paddingLeft={2}
				paddingRight={2}
				paddingTop={1}>
				{renderContent()}
			</Box>
		</Box>
	)
}
