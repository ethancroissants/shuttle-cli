import * as fs from "fs/promises"

export async function rmrf(p) {
	await fs.rm(p, { recursive: true, force: true })
}
