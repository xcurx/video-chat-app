import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MicIcon, MicOffIcon, VideoOffIcon } from 'lucide-react'
import React from 'react'

interface Participant {
  id: string
  name: string
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isCurrentUser: boolean
}

interface VideoGridProps {
    participants: Participant[]
    isChatOpen: boolean
}

const VideoGrid = ({participants, isChatOpen}:VideoGridProps) => {
      // Calculate grid layout based on participant count
  const getGridCols = (count: number) => {
    if (count === 1) return "grid-cols-1"
    if (count === 2) return "grid-cols-1 md:grid-cols-2"
    if (count <= 4) return "grid-cols-2"
    if (count <= 6) return "grid-cols-2 md:grid-cols-3"
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
  }

  return (
    <div className={`flex-1 p-4 mb-270 transition-all duration-300 ${isChatOpen ? "mr-80" : ""}`}>
      <div className={`grid gap-4 h-full ${getGridCols(participants.length)}`}>
        {participants.map((participant) => (
          <Card key={participant.id} className="relative mb-52 aspect-video overflow-hidden bg-card border-border">
            <CardContent className="p-0 h-full min-h-[200px] flex items-center justify-center">
              {participant.isVideoEnabled ? (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  {/* Placeholder for video feed */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/30 rounded-full flex items-center justify-center mb-2 mx-auto">
                      <span className="text-2xl font-semibold text-primary">{participant.name.charAt(0)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Video Feed</p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <div className="text-center">
                    <VideoOffIcon className="h-12 w-12 text-muted-foreground mb-2 mx-auto" />
                    <p className="text-sm text-muted-foreground">Camera off</p>
                  </div>
                </div>
              )}

              {/* Participant Info Overlay */}
              <div className="absolute bottom-2 left-2 right-2">
                <div className="bg-black/50 backdrop-blur-sm rounded px-2 py-1 flex items-center justify-between">
                  <span className="text-white text-sm font-medium truncate">{participant.name}</span>
                  <div className="flex items-center space-x-1 ml-2">
                    {participant.isAudioEnabled ? (
                      <MicIcon className="h-3 w-3 text-green-400" />
                    ) : (
                      <MicOffIcon className="h-3 w-3 text-red-400" />
                    )}
                    {participant.isCurrentUser && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        You
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default VideoGrid
