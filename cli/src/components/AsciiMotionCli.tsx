/**
 * Static ShuttleAI logo.
 */
import { Box, Text } from "ink"
import React from "react"

const SHUTTLE = [
"                         ..........       ",
"                     ...............      ",
"                   .................      ",
"                 ...................      ",
"                ........     .......      ",
"       .................     .......      ",
"     ..............................       ",
"    ..............................        ",
"   ..............................         ",
"  ..............................          ",
"   ...........................            ",
"              .............               ",
"               ............               ",
"                ...........               ",
"                ...........               ",
"                ...........               ",
"                .........                 ",
"                ......                    ",
"                                          ",
"             S h u t t l e A I           ",
]

type AsciiMotionCliProps = {
hasDarkBackground?: boolean
autoPlay?: boolean
loop?: boolean
onReady?: (api: { play: () => void; pause: () => void; restart: () => void }) => void
onInteraction?: () => void
}

export const AsciiMotionCli: React.FC<AsciiMotionCliProps> = () => (
<Box alignItems="center" flexDirection="column" paddingBottom={1} paddingTop={1}>
{SHUTTLE.map((line, i) => (
// biome-ignore lint/suspicious/noArrayIndexKey: static array
<Text color="magenta" key={i}>
{line}
</Text>
))}
</Box>
)

export const StaticRobotFrame: React.FC<{ hasDarkBackground?: boolean }> = () => (
<AsciiMotionCli />
)
