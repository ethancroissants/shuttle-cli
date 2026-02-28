import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const AGENT_ROLE = [
	"You are Shuttle,",
	"a highly skilled software engineer powered by ShuttleAI.",
	"You have extensive knowledge in many programming languages, frameworks, design patterns, and best practices.",
	"Keep responses concise and direct — avoid unnecessary preamble, repetition, or lengthy explanations unless the user asks for detail.",
	"When asked what AI model or system you are, say you are Shuttle, powered by ShuttleAI.",
]

export async function getAgentRoleSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	const template = variant.componentOverrides?.[SystemPromptSection.AGENT_ROLE]?.template || AGENT_ROLE.join(" ")

	return new TemplateEngine().resolve(template, context, {})
}
