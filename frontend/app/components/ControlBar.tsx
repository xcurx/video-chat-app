import { Button } from '@/components/ui/button'
import { MicIcon, MicOffIcon, PhoneOffIcon, VideoIcon, VideoOffIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { RefObject, useState } from 'react'
import { sendSignal } from '../websocket/sendSignal'

interface ControlBarProps {
  wsRef: RefObject<WebSocket | null>;
  localStreamRef?: React.RefObject<MediaStream | null>
  startSharing: (kind: 'video' | 'audio') => Promise<void>
  onLeave: () => void,
  controles: {video: boolean, audio: boolean}
}

const ControlBar = ({wsRef, localStreamRef, startSharing, controles}:ControlBarProps) => {
  const router = useRouter()
  const [isVideoEnabled, setIsVideoEnabled] = useState(controles.video)
  const [isAudioEnabled, setIsAudioEnabled] = useState(controles.audio)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  const toggleVideo = async () => {
    if (isVideoEnabled) {
      localStreamRef?.current?.getVideoTracks().forEach(track => track.enabled = false)
      setIsVideoEnabled(false)
    } else {
      if (localStreamRef?.current?.getVideoTracks().length) {
        localStreamRef.current.getVideoTracks().forEach(track => track.enabled = true)
      } else {
        await startSharing('video')
      }
      setIsVideoEnabled(true)
    }
    sendSignal({wsRef, type: 'toggle-video', payload: !isVideoEnabled })
  }

  const toggleAudio = async () => {
    if (isAudioEnabled) {
      localStreamRef?.current?.getAudioTracks().forEach(track => track.enabled = false)
      setIsAudioEnabled(false)
    } else {
      if (localStreamRef?.current?.getAudioTracks().length) {
        localStreamRef.current.getAudioTracks().forEach(track => track.enabled = true)
      } else {
        await startSharing('audio')
      }
      setIsAudioEnabled(true)
    }
    sendSignal({wsRef, type: 'toggle-audio', payload: !isAudioEnabled })
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
