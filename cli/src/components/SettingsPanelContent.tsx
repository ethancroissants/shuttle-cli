/**
 * Settings panel content for inline display in ChatView
 * Uses a tabbed interface: Model, Auto Approve, Features, Other
 */

import type { AutoApprovalSettings } from "@shared/AutoApprovalSettings"
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@shared/AutoApprovalSettings"
import { getProviderModelIdKey, isSettingsKey } from "@shared/storage"
import type { TelemetrySetting } from "@shared/TelemetrySetting"
import { Box, Text, useInput } from "ink"
import Spinner from "ink-spinner"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { buildApiHandler } from "@/core/api"
import type { Controller } from "@/core/controller"
import { StateManager } from "@/core/storage/StateManager"
import { version as CLI_VERSION } from "../../package.json"
import { COLORS } from "../constants/colors"
import { useStdinContext } from "../context/StdinContext"
import { isMouseEscapeSequence } from "../utils/input"
import { fetchShuttleAIModels } from "../utils/shuttleai-models"
import { Checkbox } from "./Checkbox"
import { LanguagePicker } from "./LanguagePicker"
import { Panel, PanelTab } from "./Panel"
import { SearchableList, SearchableListItem } from "./SearchableList"

interface SettingsPanelContentProps {
onClose: () => void
controller?: Controller
initialMode?: "model-picker" | "featured-models"
initialModelKey?: "actModelId" | "planModelId"
}

type SettingsTab = "model" | "auto-approve" | "features" | "other"

interface ListItem {
key: string
label: string
type: "checkbox" | "readonly" | "editable" | "separator" | "header" | "spacer" | "action" | "cycle"
value: string | boolean
description?: string
isSubItem?: boolean
parentKey?: string
}

const TABS: PanelTab[] = [
{ key: "model", label: "Model" },
{ key: "auto-approve", label: "Auto-approve" },
{ key: "features", label: "Features" },
{ key: "other", label: "Other" },
]

// Settings configuration for simple boolean toggles
const FEATURE_SETTINGS = {
subagents: {
stateKey: "subagentsEnabled",
default: false,
label: "Subagents",
description: "Let Shuttle run focused subagents in parallel to explore the codebase for you",
},
autoCondense: {
stateKey: "useAutoCondense",
default: false,
label: "Auto-condense",
description: "Automatically summarize long conversations",
},
webTools: {
stateKey: "clineWebToolsEnabled",
default: true,
label: "Web tools",
description: "Enable web search and fetch tools",
},
strictPlanMode: {
stateKey: "strictPlanModeEnabled",
default: true,
label: "Strict plan mode",
description: "Require explicit mode switching",
},
nativeToolCall: {
stateKey: "nativeToolCallEnabled",
default: true,
label: "Native tool call",
description: "Use model's native tool calling API",
},
parallelToolCalling: {
stateKey: "enableParallelToolCalling",
default: false,
label: "Parallel tool calling",
description: "Allow multiple tools in a single response",
},
doubleCheckCompletion: {
stateKey: "doubleCheckCompletionEnabled",
default: false,
label: "Double-check completion",
description: "Reject first completion attempt and require re-verification",
},
} as const

type FeatureKey = keyof typeof FEATURE_SETTINGS

export const SettingsPanelContent: React.FC<SettingsPanelContentProps> = ({
onClose,
controller,
initialMode,
initialModelKey,
}) => {
const { isRawModeSupported } = useStdinContext()
const stateManager = StateManager.get()

// UI state
const [currentTab, setCurrentTab] = useState<SettingsTab>("model")
const [selectedIndex, setSelectedIndex] = useState(0)
const [isEditing, setIsEditing] = useState(false)
const [isPickingModel, setIsPickingModel] = useState(initialMode === "model-picker")
const [pickingModelKey, setPickingModelKey] = useState<"actModelId" | "planModelId" | null>(
initialMode ? (initialModelKey ?? "actModelId") : null,
)
const [isPickingLanguage, setIsPickingLanguage] = useState(false)
const [editValue, setEditValue] = useState("")

// ShuttleAI model list for picker
const [shuttleModels, setShuttleModels] = useState<string[]>([])
const [isLoadingModels, setIsLoadingModels] = useState(false)

// Settings state - single object for feature toggles
const [features, setFeatures] = useState<Record<FeatureKey, boolean>>(() => {
const initial: Record<string, boolean> = {}
for (const [key, config] of Object.entries(FEATURE_SETTINGS)) {
if (isSettingsKey(config.stateKey)) {
initial[key] = stateManager.getGlobalSettingsKey(config.stateKey)
} else {
initial[key] = stateManager.getGlobalStateKey(config.stateKey)
}
}
return initial as Record<FeatureKey, boolean>
})

// Model tab state
const [separateModels, setSeparateModels] = useState<boolean>(
() => stateManager.getGlobalSettingsKey("planActSeparateModelsSetting") ?? false,
)

// Auto-approve settings
const [autoApproveSettings, setAutoApproveSettings] = useState<AutoApprovalSettings>(() => {
return stateManager.getGlobalSettingsKey("autoApprovalSettings") ?? DEFAULT_AUTO_APPROVAL_SETTINGS
})

// Other tab state
const [preferredLanguage, setPreferredLanguage] = useState<string>(
() => stateManager.getGlobalSettingsKey("preferredLanguage") || "English",
)
const [telemetry, setTelemetry] = useState<TelemetrySetting>(
() => stateManager.getGlobalSettingsKey("telemetrySetting") || "unset",
)

// Refresh trigger to force re-reading model IDs from state
const [modelRefreshKey, setModelRefreshKey] = useState(0)
const refreshModelIds = useCallback(() => setModelRefreshKey((k) => k + 1), [])

// Read model IDs from state (re-reads when refreshKey changes)
const { actModelId, planModelId } = useMemo(() => {
const apiConfig = stateManager.getApiConfiguration()
const actProvider = apiConfig.actModeApiProvider
const planProvider = apiConfig.planModeApiProvider || actProvider
if (!actProvider && !planProvider) {
return { actModelId: "", planModelId: "" }
}
const actKey = actProvider ? getProviderModelIdKey(actProvider, "act") : null
const planKey = planProvider ? getProviderModelIdKey(planProvider, "plan") : null
return {
actModelId: actKey ? (stateManager.getGlobalSettingsKey(actKey) as string) || "" : "",
planModelId: planKey ? (stateManager.getGlobalSettingsKey(planKey) as string) || "" : "",
}
}, [modelRefreshKey, stateManager])

// Get masked API key for display
const maskedApiKey = useMemo(() => {
const config = stateManager.getApiConfiguration() as Record<string, string>
const key = config["openAiApiKey"] || ""
if (!key) return "not set"
return "••••••" + key.slice(-4)
}, [modelRefreshKey, stateManager])

// Toggle a feature setting
const toggleFeature = useCallback(
(key: FeatureKey) => {
const config = FEATURE_SETTINGS[key]
const newValue = !features[key]
setFeatures((prev) => ({ ...prev, [key]: newValue }))
stateManager.setGlobalState(config.stateKey, newValue)
},
[features, stateManager],
)

// Build items list based on current tab
const items: ListItem[] = useMemo(() => {
switch (currentTab) {
case "model":
return [
{
key: "actModelId",
label: "Act model",
type: "editable",
value: actModelId || "not set",
},
...(separateModels
? [
{
key: "planModelId",
label: "Plan model",
type: "editable" as const,
value: planModelId || "not set",
},
]
: []),
{
key: "separateModels",
label: "Separate plan/act models",
type: "checkbox",
value: separateModels,
},
{
key: "apiKey",
label: "API key",
type: "editable",
value: maskedApiKey,
},
]

case "auto-approve": {
const result: ListItem[] = []
const actions = autoApproveSettings.actions

const addActionPair = (
parentKey: string,
parentLabel: string,
parentDesc: string,
childKey: string,
childLabel: string,
childDesc: string,
) => {
result.push({
key: parentKey,
label: parentLabel,
type: "checkbox",
value: actions[parentKey as keyof typeof actions] ?? false,
description: parentDesc,
})
if (actions[parentKey as keyof typeof actions]) {
result.push({
key: childKey,
label: childLabel,
type: "checkbox",
value: actions[childKey as keyof typeof actions] ?? false,
description: childDesc,
isSubItem: true,
parentKey,
})
}
}

addActionPair(
"readFiles",
"Read project files",
"Read files in the working directory",
"readFilesExternally",
"Read all files",
"Read files outside working directory",
)
addActionPair(
"editFiles",
"Edit project files",
"Edit files in the working directory",
"editFilesExternally",
"Edit all files",
"Edit files outside working directory",
)
addActionPair(
"executeSafeCommands",
"Execute safe commands",
"Run low-risk terminal commands",
"executeAllCommands",
"Execute all commands",
"Run any terminal command",
)

result.push(
{
key: "useBrowser",
label: "Use the browser",
type: "checkbox",
value: actions.useBrowser,
description: "Browse and interact with web pages",
},
{
key: "useMcp",
label: "Use MCP servers",
type: "checkbox",
value: actions.useMcp,
description: "Use Model Context Protocol tools",
},
{ key: "separator", label: "", type: "separator", value: false },
{
key: "enableNotifications",
label: "Enable notifications",
type: "checkbox",
value: autoApproveSettings.enableNotifications,
description: "System alerts when Shuttle needs your attention",
},
)
return result
}

case "features":
return Object.entries(FEATURE_SETTINGS).map(([key, config]) => ({
key,
label: config.label,
type: "checkbox" as const,
value: features[key as FeatureKey],
description: config.description,
}))

case "other":
return [
{ key: "language", label: "Preferred language", type: "editable", value: preferredLanguage },
{
key: "telemetry",
label: "Error/usage reporting",
type: "checkbox",
value: telemetry !== "disabled",
description: "Help improve Shuttle by sending anonymous usage data",
},
{ key: "separator", label: "", type: "separator", value: "" },
{ key: "version", label: "", type: "readonly", value: `ShuttleAI CLI v${CLI_VERSION}` },
]

default:
return []
}
}, [
currentTab,
actModelId,
planModelId,
separateModels,
maskedApiKey,
autoApproveSettings,
features,
preferredLanguage,
telemetry,
])

// Reset selection when changing tabs
const handleTabChange = useCallback((tabKey: string) => {
setCurrentTab(tabKey as SettingsTab)
setSelectedIndex(0)
setIsEditing(false)
setIsPickingModel(false)
setPickingModelKey(null)
setIsPickingLanguage(false)
}, [])

// Ensure selected index is valid when items change
useEffect(() => {
if (selectedIndex >= items.length) {
setSelectedIndex(Math.max(0, items.length - 1))
}
}, [items.length, selectedIndex])

const rebuildTaskApi = useCallback(() => {
if (!controller?.task) {
return
}
const currentMode = stateManager.getGlobalSettingsKey("mode")
const apiConfig = stateManager.getApiConfiguration()
controller.task.api = buildApiHandler({ ...apiConfig, ulid: controller.task.ulid }, currentMode)
}, [controller, stateManager])

// Handle toggle/edit for selected item
const handleAction = useCallback(() => {
const item = items[selectedIndex]
if (!item || item.type === "readonly" || item.type === "separator" || item.type === "header" || item.type === "spacer")
return

if (item.type === "editable") {
// For model ID fields, open the ShuttleAI model picker
if (item.key === "actModelId" || item.key === "planModelId") {
setPickingModelKey(item.key as "actModelId" | "planModelId")
setIsPickingModel(true)
setIsLoadingModels(true)
fetchShuttleAIModels().then((models) => {
setShuttleModels(models)
setIsLoadingModels(false)
})
return
}
// For language field, use the language picker
if (item.key === "language") {
setIsPickingLanguage(true)
return
}
// For API key, start with empty value so user types new key
setEditValue(item.key === "apiKey" ? "" : typeof item.value === "string" ? item.value : "")
setIsEditing(true)
return
}

if (item.type === "checkbox") {
const newValue = !item.value

// Feature settings
if (item.key in FEATURE_SETTINGS) {
toggleFeature(item.key as FeatureKey)
return
}

if (item.key === "separateModels") {
setSeparateModels(newValue)
stateManager.setGlobalState("planActSeparateModelsSetting", newValue)
if (!newValue) {
// Sync plan model to act model when disabling separate models
const apiConfig = stateManager.getApiConfiguration()
const actProvider = apiConfig.actModeApiProvider
const planProvider = apiConfig.planModeApiProvider || actProvider
if (actProvider) {
const actKey = getProviderModelIdKey(actProvider, "act")
const planKey = planProvider ? getProviderModelIdKey(planProvider, "plan") : null
const actModel = stateManager.getGlobalSettingsKey(actKey)
if (planKey) stateManager.setGlobalState(planKey, actModel)
}
}
rebuildTaskApi()
return
}

if (item.key === "telemetry") {
const newTelemetry: TelemetrySetting = newValue ? "enabled" : "disabled"
setTelemetry(newTelemetry)
stateManager.setGlobalState("telemetrySetting", newTelemetry)
void stateManager.flushPendingState().then(() => {
controller?.updateTelemetrySetting(newTelemetry)
})
return
}

if (item.key === "enableNotifications") {
const newSettings = {
...autoApproveSettings,
version: (autoApproveSettings.version ?? 1) + 1,
enableNotifications: newValue,
}
setAutoApproveSettings(newSettings)
stateManager.setGlobalState("autoApprovalSettings", newSettings)
return
}

// Auto-approve action toggles
const actionKey = item.key as keyof AutoApprovalSettings["actions"]
const newActions = { ...autoApproveSettings.actions, [actionKey]: newValue }
if (!newValue) {
if (actionKey === "readFiles") newActions.readFilesExternally = false
if (actionKey === "editFiles") newActions.editFilesExternally = false
if (actionKey === "executeSafeCommands") newActions.executeAllCommands = false
}
if (newValue && item.parentKey) {
newActions[item.parentKey as keyof typeof newActions] = true
}
const newSettings = { ...autoApproveSettings, version: (autoApproveSettings.version ?? 1) + 1, actions: newActions }
setAutoApproveSettings(newSettings)
stateManager.setGlobalState("autoApprovalSettings", newSettings)
}
}, [items, selectedIndex, stateManager, autoApproveSettings, toggleFeature, separateModels, rebuildTaskApi, controller])

// Handle model selection from the ShuttleAI model picker
const handleModelSelect = useCallback(
async (modelId: string) => {
if (!pickingModelKey) return

const actKey = getProviderModelIdKey("openai", "act")
const planKey = getProviderModelIdKey("openai", "plan")

if (separateModels) {
const stateKey = pickingModelKey === "actModelId" ? actKey : planKey
stateManager.setGlobalState(stateKey, modelId)
} else {
stateManager.setGlobalState(actKey, modelId)
stateManager.setGlobalState(planKey, modelId)
}

await stateManager.flushPendingState()
rebuildTaskApi()
refreshModelIds()
setIsPickingModel(false)
setPickingModelKey(null)

if (initialMode) {
onClose()
}
},
[pickingModelKey, separateModels, stateManager, rebuildTaskApi, refreshModelIds, initialMode, onClose],
)

// Handle language selection from picker
const handleLanguageSelect = useCallback(
(language: string) => {
setPreferredLanguage(language)
stateManager.setGlobalState("preferredLanguage", language)
setIsPickingLanguage(false)
},
[stateManager],
)

// Handle saving edited value
const handleSave = useCallback(() => {
const item = items[selectedIndex]
if (!item) return

if (item.key === "actModelId" || item.key === "planModelId") {
const actKey = getProviderModelIdKey("openai", "act")
const planKey = getProviderModelIdKey("openai", "plan")
if (separateModels) {
const stateKey = item.key === "actModelId" ? actKey : planKey
stateManager.setGlobalState(stateKey, editValue || undefined)
} else {
stateManager.setGlobalState(actKey, editValue || undefined)
stateManager.setGlobalState(planKey, editValue || undefined)
}
refreshModelIds()
rebuildTaskApi()
} else if (item.key === "apiKey") {
if (editValue.trim()) {
const currentConfig = stateManager.getApiConfiguration()
stateManager.setApiConfiguration({ ...currentConfig, openAiApiKey: editValue.trim() })
void stateManager.flushPendingState()
refreshModelIds()
}
} else if (item.key === "language") {
setPreferredLanguage(editValue)
stateManager.setGlobalState("preferredLanguage", editValue)
}

setIsEditing(false)
}, [items, selectedIndex, editValue, separateModels, stateManager, refreshModelIds, rebuildTaskApi])

// Navigate to next/prev item, skipping non-interactive items
const navigateItems = useCallback(
(direction: "up" | "down") => {
setSelectedIndex((i) => {
let next = direction === "up" ? (i > 0 ? i - 1 : items.length - 1) : i < items.length - 1 ? i + 1 : 0
const skipTypes = ["separator", "header", "spacer"]
while (skipTypes.includes(items[next]?.type) && next !== i) {
next = direction === "up" ? (next > 0 ? next - 1 : items.length - 1) : next < items.length - 1 ? next + 1 : 0
}
return next
})
},
[items],
)

// Navigate tabs
const navigateTabs = useCallback(
(direction: "left" | "right") => {
const tabKeys = TABS.map((t) => t.key)
const currentIdx = tabKeys.indexOf(currentTab)
const newIdx =
direction === "left"
? currentIdx > 0
? currentIdx - 1
: tabKeys.length - 1
: currentIdx < tabKeys.length - 1
? currentIdx + 1
: 0
handleTabChange(tabKeys[newIdx])
},
[currentTab, handleTabChange],
)

// Handle keyboard input
useInput(
(input, key) => {
if (isMouseEscapeSequence(input)) {
return
}

// Model picker mode — escape to close, input handled by SearchableList
if (isPickingModel) {
if (key.escape) {
setIsPickingModel(false)
setPickingModelKey(null)
if (initialMode) {
onClose()
}
}
return
}

// Language picker mode — escape to close
if (isPickingLanguage) {
if (key.escape) {
setIsPickingLanguage(false)
}
return
}

if (isEditing) {
if (key.escape) {
setIsEditing(false)
return
}
if (key.return) {
handleSave()
return
}
if (key.backspace || key.delete) {
setEditValue((prev) => prev.slice(0, -1))
return
}
if (input && !key.ctrl && !key.meta) {
setEditValue((prev) => prev + input)
}
return
}

if (key.escape) {
onClose()
return
}
if (key.leftArrow) {
navigateTabs("left")
return
}
if (key.rightArrow) {
navigateTabs("right")
return
}
if (key.upArrow) {
navigateItems("up")
return
}
if (key.downArrow) {
navigateItems("down")
return
}
if (key.tab || key.return) {
handleAction()
return
}
},
{ isActive: isRawModeSupported },
)

// Render content
const renderContent = () => {
if (isPickingModel && pickingModelKey) {
const label = pickingModelKey === "actModelId" ? "Act model" : "Plan model"

if (isLoadingModels) {
return (
<Box flexDirection="column">
<Text bold color={COLORS.primaryBlue}>
Select: {label}
</Text>
<Box marginTop={1}>
<Text color={COLORS.primaryBlue}>
<Spinner type="dots" />
</Text>
<Text color="gray"> Loading models...</Text>
</Box>
</Box>
)
}

const modelItems: SearchableListItem[] = shuttleModels.map((id) => ({ id, label: id }))
return (
<Box flexDirection="column">
<Text bold color={COLORS.primaryBlue}>
Select: {label}
</Text>
<Box marginTop={1}>
<SearchableList isActive={isPickingModel} items={modelItems} onSelect={(item) => handleModelSelect(item.id)} />
</Box>
<Box marginTop={1}>
<Text color="gray">Type to search, arrows to navigate, Enter to select, Esc to cancel</Text>
</Box>
</Box>
)
}

if (isPickingLanguage) {
return (
<Box flexDirection="column">
<Text bold color={COLORS.primaryBlue}>
Select Language
</Text>
<Box marginTop={1}>
<LanguagePicker isActive={isPickingLanguage} onSelect={handleLanguageSelect} />
</Box>
<Box marginTop={1}>
<Text color="gray">Type to search, arrows to navigate, Enter to select, Esc to cancel</Text>
</Box>
</Box>
)
}

if (isEditing) {
const item = items[selectedIndex]
return (
<Box flexDirection="column">
<Text bold color={COLORS.primaryBlue}>
Edit: {item?.label}
</Text>
<Box marginTop={1}>
<Text color="white">{editValue}</Text>
<Text color="gray">|</Text>
</Box>
<Text color="gray">Enter to save, Esc to cancel</Text>
</Box>
)
}

return (
<Box flexDirection="column">
{items.map((item, idx) => {
const isSelected = idx === selectedIndex

if (item.type === "header") {
return (
<Box key={item.key}>
<Text bold color="white">
{item.label}
</Text>
</Box>
)
}

if (item.type === "spacer") {
return <Box key={item.key} marginTop={1} />
}

if (item.type === "separator") {
return (
<Box
borderBottom={false}
borderColor="gray"
borderDimColor
borderLeft={false}
borderRight={false}
borderStyle="single"
borderTop
key={item.key}
width="100%"
/>
)
}

if (item.type === "checkbox") {
return (
<Box key={item.key} marginLeft={item.isSubItem ? 2 : 0}>
<Checkbox
checked={Boolean(item.value)}
description={item.description}
isSelected={isSelected}
label={item.label}
/>
</Box>
)
}

if (item.type === "action") {
return (
<Text key={item.key}>
<Text bold color={isSelected ? COLORS.primaryBlue : undefined}>
{isSelected ? "❯" : " "}{" "}
</Text>
<Text color={isSelected ? COLORS.primaryBlue : "white"}>{item.label}</Text>
{isSelected && <Text color="gray"> (Enter)</Text>}
</Text>
)
}

// Readonly or editable field
return (
<Text key={item.key}>
<Text bold color={isSelected ? COLORS.primaryBlue : undefined}>
{isSelected ? "❯" : " "}{" "}
</Text>
{item.label && <Text color={isSelected ? COLORS.primaryBlue : "white"}>{item.label}: </Text>}
<Text color={item.type === "readonly" ? "gray" : COLORS.primaryBlue}>
{typeof item.value === "string" ? item.value : String(item.value)}
</Text>
{item.type === "editable" && isSelected && <Text color="gray"> (Tab to edit)</Text>}
</Text>
)
})}
</Box>
)
}

const isSubpage = isPickingModel || isPickingLanguage || isEditing

return (
<Panel currentTab={currentTab} isSubpage={isSubpage} label="Settings" tabs={TABS}>
{renderContent()}
</Panel>
)
}
