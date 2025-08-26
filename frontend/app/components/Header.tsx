import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageSquareIcon, SettingsIcon, UsersIcon, VideoIcon } from 'lucide-react'
import React from 'react'

interface HeaderProps {
  roomId: string
  roomName: string | null
  participants: { id: string; name: string }[]
  isChatOpen: boolean
  setIsChatOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const Header = ({roomId, roomName, participants, isChatOpen, setIsChatOpen}:HeaderProps) => {
  return (
    <header className="bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <VideoIcon className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-lg font-semibold text-card-foreground">{roomName || `Room ${roomId}`}</h1>
              {roomName && <p className="text-xs text-muted-foreground">ID: {roomId}</p>}
            </div>
          </div>
          <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
            <UsersIcon className="h-3 w-3 mr-1" />
            {participants.length} participants
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setIsChatOpen(!isChatOpen)} className="border-border">
            <MessageSquareIcon className="h-4 w-4 mr-2" />
            Chat
          </Button>
          <Button variant="outline" size="sm" className="border-border bg-transparent">
            <SettingsIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}

export default Header
