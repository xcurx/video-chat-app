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
  setControles: React.Dispatch<React.SetStateAction<{video: boolean, audio: boolean}>>
}

const ControlBar = ({wsRef, localStreamRef, startSharing, controles, setControles}:ControlBarProps) => {
  const router = useRouter()
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  const toggleVideo = async () => {
    if (controles.video) {
      localStreamRef?.current?.getVideoTracks().forEach(track => track.enabled = false)
      setControles(prev => ({...prev, video: false}))
    } else {
      if (localStreamRef?.current?.getVideoTracks().length) {
        localStreamRef.current.getVideoTracks().forEach(track => track.enabled = true)
      } else {
        await startSharing('video')
      }
      setControles(prev => ({...prev, video: true}))
    }
    sendSignal({wsRef, type: 'toggle-video', payload: !controles.video })
  }

  const toggleAudio = async () => {
    if (controles.audio) {
      localStreamRef?.current?.getAudioTracks().forEach(track => track.enabled = false)
      setControles(prev => ({...prev, audio: false}))
    } else {
      if (localStreamRef?.current?.getAudioTracks().length) {
        localStreamRef.current.getAudioTracks().forEach(track => track.enabled = true)
      } else {
        await startSharing('audio')
      }
      setControles(prev => ({...prev, audio: true}))
    }
    sendSignal({wsRef, type: 'toggle-audio', payload: !controles.audio })
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
            variant={controles.audio ? "default" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            className={controles.audio ? "bg-secondary hover:bg-secondary/90 text-secondary-foreground" : ""}
          >
            {controles.audio ? <MicIcon className="h-5 w-5" /> : <MicOffIcon className="h-5 w-5" />}
          </Button>

          <Button
            variant={controles.video ? "default" : "destructive"}
            size="lg"
            onClick={toggleVideo}
            className={controles.video ? "bg-secondary hover:bg-secondary/90 text-secondary-foreground" : ""}
          >
            {controles.video ? <VideoIcon className="h-5 w-5" /> : <VideoOffIcon className="h-5 w-5" />}
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
