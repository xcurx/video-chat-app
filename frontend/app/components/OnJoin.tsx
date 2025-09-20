import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MicIcon, MicOffIcon, User, VideoIcon, VideoOffIcon } from 'lucide-react'
import React from 'react'

interface OnJoinProps {
  roomId?: string
  roomName?: string
  name: string
  setName: React.Dispatch<React.SetStateAction<string>>
  handleJoinRoom: () => Promise<void>
  controles: {video: boolean, audio: boolean}
  setControles: React.Dispatch<React.SetStateAction<{video: boolean; audio: boolean}>>
}

const OnJoin = ({roomId, roomName, name, setName, handleJoinRoom, controles, setControles}:OnJoinProps) => {
  return (
     <div className="h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Ready to join?</h1>
            <p className="text-muted-foreground">
              {roomName ? `Room: ${roomName}` : `Room ID: ${roomId}`}
            </p>
          </div>
          
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User/>
              </div>
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button
               onClick={() => setControles(prev => ({...prev, audio: !prev.audio}))}
               className="p-3 rounded-full bg-muted hover:bg-muted/80 transition">
                {
                  controles.audio ? <MicIcon color="white"/> : <MicOffIcon color="red" />
                }
              </Button>
              <Button 
               onClick={() => setControles(prev => ({...prev, video: !prev.video}))}
               className="p-3 rounded-full bg-muted hover:bg-muted/80 transition">
                {
                  controles.video ? <VideoIcon color="white"/> : <VideoOffIcon color="red"/>
                }
              </Button>
            </div>
          </div>

          <div>
            <Input value={name} placeholder='Enter name' onChange={(e) => setName(e.target.value)}/>
          </div>

          <Button
            onClick={() => handleJoinRoom()}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 rounded-md font-medium transition-colors"
          >
            Join now
          </Button>
        </div>
      </div>
  )
}

export default OnJoin
