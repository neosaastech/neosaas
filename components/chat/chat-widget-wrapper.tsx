"use client"

import dynamic from 'next/dynamic'
import { UserProvider } from '@/lib/contexts/user-context'

// Dynamically import the chat widget to avoid SSR issues
const ChatWidget = dynamic(
  () => import('./chat-widget').then(mod => ({ default: mod.ChatWidget })),
  { ssr: false }
)

export function ChatWidgetWrapper() {
  return (
    <UserProvider>
      <ChatWidget />
    </UserProvider>
  )
}
