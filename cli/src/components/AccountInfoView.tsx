/**
 * Account info view component
 * Shows provider and current model info for ShuttleAI
 */

import { Box, Text } from "ink"
import React, { useMemo } from "react"
import { getProviderModelIdKey } from "@shared/storage"
import { StateManager } from "@/core/storage/StateManager"

interface AccountInfoViewProps {
controller?: unknown
}

export const AccountInfoView: React.FC<AccountInfoViewProps> = React.memo(() => {
const currentModel = useMemo(() => {
const stateManager = StateManager.get()
const apiConfig = stateManager.getApiConfiguration()
const provider = apiConfig.actModeApiProvider
if (!provider) return "not set"
const modelKey = getProviderModelIdKey(provider, "act")
return (stateManager.getGlobalSettingsKey(modelKey) as string) || "not set"
}, [])

return (
<Box>
<Text color="gray">Provider: </Text>
<Text color="cyan">ShuttleAI</Text>
<Text color="gray"> • Model: </Text>
<Text color="white">{currentModel}</Text>
</Box>
)
})
