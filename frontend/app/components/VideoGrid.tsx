// import { Badge } from '@/components/ui/badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Peer } from '@/types/types'
import { MicIcon, MicOffIcon, VideoIcon, VideoOffIcon } from 'lucide-react'
// import { MicIcon, MicOffIcon, VideoOffIcon } from 'lucide-react'
import React, { RefObject } from 'react'

interface VideoGridProps {
    participants: Map<string, Peer>
    localStreamRef?: RefObject<MediaStream | null>
}

const VideoGrid = ({participants, localStreamRef}:VideoGridProps) => {
      // Calculate grid layout based on participant count
  const getGridCols = (count: number) => {
    if (count === 1) return "grid-cols-1"
    if (count === 2) return "grid-cols-1 md:grid-cols-2"
    if (count <= 4) return "grid-cols-2 md:grid-cols-2"
    if (count <= 6) return "grid-cols-2 md:grid-cols-3"
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
  }

  console.log("Rendering VideoGrid with participants:", participants);

  return (
    <div className={`flex-1 p-4 transition-all duration-300`}>
      <div className={`grid gap-2 w-full h-full ${getGridCols(1+Array.from(participants.keys()).length)}`}>
        {  localStreamRef?.current?
            (<Card className="overflow-hidden bg-card border-border py-0">
              <CardContent className="p-0 h-full flex items-center justify-center">
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                     <video
                      autoPlay
                      playsInline
                      className='aspect-video w-full h-full object-cover bg-black'
                      ref={(video) => {
                        if (video) video.srcObject = localStreamRef.current;
                      }}
                    ></video>
                  </div>
              </CardContent>
            </Card>) : (
                <Card className="overflow-hidden bg-card border-border py-0">
              <CardContent className="p-0 h-full flex items-center justify-center">
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-primary/30 rounded-full flex items-center justify-center mb-2 mx-auto">
                          <span className="text-2xl font-semibold text-primary">?</span>
                        </div>
                        <p className="text-sm text-muted-foreground">No Video</p>
                      </div>
                  </div>
              </CardContent>
            </Card>
            )
        }
        {Array.from(participants.entries()).map(([id ,peer]) => {
          const hasVideo = peer.remoteStream?.getVideoTracks()[0]?.enabled
          const hasAudio = peer.remoteStream?.getAudioTracks()[0]?.enabled
          console.log(`Rendering participant ${id} - Video: ${hasVideo}, Audio: ${hasAudio}`);
          // console.log(stream.getTracks().some(track => track.enabled),"ss");
          return (
            <Card key={id} className="overflow-hidden bg-card border-border py-0">
              <CardContent className="p-0 h-full flex items-center justify-center">
                { hasVideo || hasAudio ? (
                  <div className="relative w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    {/* Placeholder for video feed
                    <div className="text-center">
                      <div className="w-16 h-16 bg-primary/30 rounded-full flex items-center justify-center mb-2 mx-auto">
                        <span className="text-2xl font-semibold text-primary">{participant.name.charAt(0)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Video Feed</p>
                    </div> */}
                     <video
                      autoPlay
                      playsInline
                      className='aspect-video w-full h-full object-cover bg-black'
                      ref={(video) => {
                        if (video) video.srcObject = peer.remoteStream || null;
                      }}
                    ></video>
                    <div className='absolute w-full bottom-2 left-0 px-2 flex justify-between space-x-2'>
                      <Badge className='bg-black/40 text-white'>
                        Name
                      </Badge>
                      <div className='flex space-x-2'>
                        {peer.isAudioEnabled? (
                          <MicIcon size={20} className='text-green-600'/>
                          ) : (
                          <MicOffIcon size={20} className='text-red-600'/>
                        )}
                        {peer.isVideoEnabled ? (
                          <VideoIcon size={20} className='text-green-600'/>
                          ) : (
                          <VideoOffIcon size={20} className='text-red-600'/>
                        ) }
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className='text-red-600'>
                    No video
                  </div>
                ) }
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default VideoGrid
