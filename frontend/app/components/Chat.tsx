import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SendIcon } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: Date
  type: "user" | "system"
}

const Chat = () => {
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [newMessage, setNewMessage] = useState("")

    const handleSendMessage = () => {
       if (newMessage.trim()) {
         const message: ChatMessage = {
           id: Date.now().toString(),
           userId: "current-user",
           userName: "",
           message: newMessage.trim(),
           timestamp: new Date(),
           type: "user",
         }
         setMessages((prev) => [...prev, message])
         setNewMessage("")
       }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    }

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }

    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-card-foreground">Chat</h3>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.userId === "current-user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[80%] ${message.type === "system" ? "w-full text-center" : ""}`}>
                  {message.type === "system" ? (
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <p className="text-sm text-muted-foreground">{message.message}</p>
                    </div>
                  ) : (
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        message.userId === "current-user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {message.userId !== "current-user" && (
                        <p className="text-xs font-medium mb-1 opacity-70">{message.userName}</p>
                      )}
                      <p className="text-sm">{message.message}</p>
                      <p
                        className={`text-xs mt-1 opacity-70 ${
                          message.userId === "current-user" ? "text-right" : "text-left"
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t border-border">
          <div className="flex space-x-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 bg-input border-border text-foreground"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <SendIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
    </div>
  )
}

export default Chat
