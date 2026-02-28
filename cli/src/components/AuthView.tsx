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

export const AuthView: React.FC<AuthViewProps> = ({ controller, onComplete, onNavigateToWelcome }) => {
	const { exit } = useApp()
	const { isRawModeSupported } = useStdinContext()

	const [apiKey, setApiKey] = useState(process.env.SHUTTLEAI_API_KEY ?? "")
	const [status, setStatus] = useState<"input" | "saving" | "error">("input")
	const [errorMsg, setErrorMsg] = useState("")

	const handleSubmit = async (key: string) => {
		const trimmed = key.trim()
		if (!trimmed) {
			setErrorMsg("API key cannot be empty.")
			setStatus("error")
			return
		}
		setStatus("saving")
		try {
			await applyProviderConfig({
				providerId: "openai",
				apiKey: trimmed,
				baseUrl: SHUTTLEAI_BASE_URL,
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
			setStatus("error")
		}
	}

	useInput(
		(input, key) => {
			if (isMouseEscapeSequence(input)) return
			if (status === "input") {
				if (key.return) {
					handleSubmit(apiKey)
				} else if (key.backspace || key.delete) {
					setApiKey((v) => v.slice(0, -1))
				} else if (input && !key.ctrl && !key.meta) {
					setApiKey((v) => v + input)
				}
			} else if (status === "error") {
				if (key.return) {
					setStatus("input")
					setErrorMsg("")
				}
			}
		},
		{ isActive: isRawModeSupported },
	)

	const maskedKey = apiKey ? "•".repeat(Math.min(apiKey.length, 32)) : ""

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

			{/* Key input box */}
			<Box
				borderColor="gray"
				borderStyle="round"
				flexDirection="column"
				marginTop={1}
				paddingBottom={1}
				paddingLeft={2}
				paddingRight={2}
				paddingTop={1}>
				{status === "saving" ? (
					<Text color="yellow">Saving API key…</Text>
				) : status === "error" ? (
					<Box flexDirection="column">
						<Text bold color="red">
							Error
						</Text>
						<Text color="yellow">{errorMsg}</Text>
						<Text color="gray">(Press Enter to try again)</Text>
					</Box>
				) : (
					<Box flexDirection="column">
						<Text bold color="white">
							Enter your ShuttleAI API key
						</Text>
						<Text color="gray">Get one free at shuttleai.com/keys</Text>
						<Text> </Text>
						<Box>
							<Text color={COLORS.primaryBlue}>&gt; </Text>
							{!maskedKey ? <Text color="gray">e.g. shuttle-…</Text> : <Text color="white">{maskedKey}</Text>}
							<Text inverse> </Text>
						</Box>
						<Text> </Text>
						<Text color="gray">(Press Enter to confirm)</Text>
					</Box>
				)}
			</Box>
		</Box>
	)
}
