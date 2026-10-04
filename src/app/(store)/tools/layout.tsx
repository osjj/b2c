import type { ReactNode } from 'react'
import { ToolsFrame } from './tools-frame'

export default function ToolsLayout({ children }: { children: ReactNode }) {
  return <ToolsFrame>{children}</ToolsFrame>
}
