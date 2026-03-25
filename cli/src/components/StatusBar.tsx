/**
 * Status bar component
 * Shows git branch, model, context window usage, token count, and cost
 */

import { execSync } from "child_process"
import { Box, Text } from "ink"
import React, { useEffect, useState } from "react"

interface StatusBarProps {
	modelId: string
	tokensIn?: number
	tokensOut?: number
	totalCost?: number
	contextWindowSize?: number
	customContextLimit?: number
	cwd?: string
}

/**
 * Get current git branch name
 */
function getGitBranch(cwd?: string): string | null {
	try {
		const branch = execSync("git rev-parse --abbrev-ref HEAD", {
			cwd: cwd || process.cwd(),
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		}).trim()
		return branch
	} catch {
		return null
	}
}

/**
 * Get directory basename
 */
function getDirName(cwd?: string): string {
	const path = cwd || process.cwd()
	return path.split("/").pop() || path
}

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
	return num.toLocaleString()
}

/**
 * Create a progress bar for context window usage
 * Returns bar with color based on usage percentage
 */
function createContextBar(used: number, total: number, width: number = 8): { bar: string; color: string } {
	const ratio = Math.min(used / total, 1)
	const filled = Math.round(ratio * width)
	const empty = width - filled
	const bar = "█".repeat(filled) + "░".repeat(empty)
	
	// Color based on usage: green < 70%, yellow < 90%, red >= 90%
	let color = "green"
	if (ratio >= 0.9) color = "red"
	else if (ratio >= 0.7) color = "yellow"
	
	return { bar, color }
}

export const StatusBar: React.FC<StatusBarProps> = ({
	modelId,
	tokensIn = 0,
	tokensOut = 0,
	totalCost = 0,
	contextWindowSize = 200000, // Default Claude context window
	customContextLimit,
	cwd,
}) => {
	const [branch, setBranch] = useState<string | null>(null)
	const dirName = getDirName(cwd)

	useEffect(() => {
		setBranch(getGitBranch(cwd))
	}, [cwd])

	const totalTokens = tokensIn + tokensOut
	
	// Use custom limit if set and lower than model's max, otherwise use model's max
	const effectiveLimit = customContextLimit && customContextLimit < contextWindowSize ? customContextLimit : contextWindowSize
	const { bar: contextBar, color: barColor } = createContextBar(totalTokens, effectiveLimit)
	
	// Show warning if approaching limit (>= 90%)
	const isNearLimit = totalTokens >= effectiveLimit * 0.9

	// Format model ID for display (shorten if needed)
	const displayModel = modelId.length > 20 ? modelId.substring(0, 17) + "..." : modelId

	return (
		<Box flexDirection="column">
			<Box gap={1}>
				{/* Directory and branch */}
				<Text color="gray">
					{dirName}
					{branch && (
						<Text color="gray">
							{" "}
							(<Text color="cyan">{branch}</Text>)
						</Text>
					)}
				</Text>
				<Text color="gray">|</Text>

				{/* Model and context bar */}
				<Text color="white">{displayModel}</Text>
				<Text color={barColor}>{contextBar}</Text>
				<Text color={isNearLimit ? "yellow" : "gray"}>
					({formatNumber(totalTokens)}/{formatNumber(effectiveLimit)})
					{customContextLimit && customContextLimit < contextWindowSize && <Text color="cyan"> [custom]</Text>}
				</Text>
				<Text color="gray">|</Text>

				{/* Cost */}
				<Text color="green">${totalCost.toFixed(4)}</Text>
			</Box>
		</Box>
	)
}
