"use client"

import type React from "react"

import { useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { peers } from "@/app/example"
import ControlBar from "@/app/components/ControlBar"
import Chat from "@/app/components/Chat"
import Header from "@/app/components/Header"
import VideoGrid from "@/app/components/VideoGrid"
import { Button } from "@/components/ui/button"
import { MicIcon, User, VideoIcon } from "lucide-react"

interface Participant {
  id: string
  name: string
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isCurrentUser: boolean
}

export default function RoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const roomId = params.roomId as string
  const [isConnected, setIsConnected] = useState(false)

  const roomName = searchParams.get("roomName")

  const [isChatOpen, setIsChatOpen] = useState(false)

  const [participants, setParticipants] = useState<Participant[]>(peers)

  if (!isConnected) {
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
              <Button className="p-3 rounded-full bg-muted hover:bg-muted/80 transition">
                <MicIcon color="white"/>
              </Button>
              <Button className="p-3 rounded-full bg-muted hover:bg-muted/80 transition">
                <VideoIcon color="white"/>
              </Button>
            </div>
          </div>

          <Button
            onClick={() => setIsConnected(true)}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 rounded-md font-medium transition-colors"
          >
            Join now
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <Header 
        roomId={roomId} 
        roomName={roomName} 
        participants={participants} 
        isChatOpen={isChatOpen} 
        setIsChatOpen={setIsChatOpen}
      />

      {/* Main Content */}
      <main className="flex-1 flex overflow-auto">
        {/* Video Grid */}
        <VideoGrid participants={participants} isChatOpen={isChatOpen}/>
        

        {isChatOpen && (
          <Chat/>
        )}
      </main>

      {/* Control Bar */}
      <ControlBar setParticipants={setParticipants}/>
    </div>
  )
}
