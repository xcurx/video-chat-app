import { Button } from '@/components/ui/button'
import { MicIcon, MicOffIcon, PhoneOffIcon, VideoIcon, VideoOffIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

interface Participant {
  id: string
  name: string
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isCurrentUser: boolean
}

interface ControlBarProps {
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>
}
  

const ControlBar = ({setParticipants}:ControlBarProps) => {
  const router = useRouter()
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled)
    // Update current user's video status
    setParticipants((prev) => prev.map((p) => (p.isCurrentUser ? { ...p, isVideoEnabled: !isVideoEnabled } : p)))
  }

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled)
    // Update current user's audio status
    setParticipants((prev) => prev.map((p) => (p.isCurrentUser ? { ...p, isAudioEnabled: !isAudioEnabled } : p)))
  }

  const handleLeaveRoom = () => {
    if (showLeaveConfirm) {
      router.push("/")
    } else {
      setShowLeaveConfirm(true)
      setTimeout(() => setShowLeaveConfirm(false), 3000) // Auto-hide after 3 seconds
    }
  }

  return (
     <footer className="bg-card border-t border-border px-4 py-4">
        <div className="flex items-center justify-center space-x-4">
          <Button
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            className={isAudioEnabled ? "bg-secondary hover:bg-secondary/90 text-secondary-foreground" : ""}
          >
            {isAudioEnabled ? <MicIcon className="h-5 w-5" /> : <MicOffIcon className="h-5 w-5" />}
          </Button>

          <Button
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleVideo}
            className={isVideoEnabled ? "bg-secondary hover:bg-secondary/90 text-secondary-foreground" : ""}
          >
            {isVideoEnabled ? <VideoIcon className="h-5 w-5" /> : <VideoOffIcon className="h-5 w-5" />}
          </Button>

          <Button
            variant="destructive"
            size="lg"
            onClick={handleLeaveRoom}
            className={`bg-destructive hover:bg-destructive/90 text-destructive-foreground ${
              showLeaveConfirm ? "animate-pulse" : ""
            }`}
          >
            <PhoneOffIcon className="h-5 w-5" />
            {showLeaveConfirm && <span className="ml-2 text-xs">Click again to leave</span>}
          </Button>
        </div>
      </footer>
  )
}

export default ControlBar
