"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
// import { peers } from "@/app/example"
import ControlBar from "@/app/components/ControlBar"
import Chat from "@/app/components/Chat"
import Header from "@/app/components/Header"
import VideoGrid from "@/app/components/VideoGrid"
import OnJoin from "@/app/components/OnJoin"
import { wsInit } from "@/app/websocket/init"
import { handleLeaveRoom } from "@/app/websocket/handleLeaveRoom"
import { getMedia } from "@/app/utils/getMedia"

export interface Peer {
  id: string
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  streamId?: string
  remoteStream?: MediaStream
}

export default function RoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const roomId = params.roomId as string
  const [isConnected, setIsConnected] = useState(false)
  const localVideoRef = useRef<HTMLVideoElement>(null);
  // remoteStreams will now store MediaStream objects directly from the SFU
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());

  // refs to store WebSocket, local stream, and the single peer connection to the SFU
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null); // single PC to the SFU
  const localStreamRef = useRef<MediaStream | null>(null);

  const roomName = searchParams.get("roomName")

  const [isChatOpen, setIsChatOpen] = useState(false)
  
  const [controles, setControles] = useState({video: true, audio: true})

  // const [participants, setParticipants] = useState<Peer[]>(peers)
  console.log(remoteStreams)

  const startSharing = async (kind: 'video' | 'audio') => {
    if (!pcRef.current) {
      console.error("PeerConnection not initialized");
      return;
    }
    console.log(`Attempting to share ${kind}`);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ [kind]: true });
        const track = stream.getTracks()[0];

        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream();
        }

        localStreamRef.current.addTrack(track);
        pcRef.current.addTrack(track, localStreamRef.current!);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
    } catch (error) {
        console.error(`Error accessing ${kind} device:`, error);
    }
  }
  
  const handleJoinRoom = async () => {
    // get user's media
    await getMedia({localStreamRef, localVideoRef, video: controles.video, audio: controles.audio});

    // initialize WebSocket and peer connection and event handlers
    wsInit({
      url: `ws://localhost:8080/ws/${roomId}`,
      wsRef,
      pcRef,
      localStreamRef,
      localVideoRef,
      setIsConnected,
      setRemoteStreams,
      setPeers
    })
  };

  // Effect for cleanup
  useEffect(() => {

    return () => {
      handleLeaveRoom({
        wsRef,
        pcRef,
        localStreamRef,
        localVideoRef,
        setIsConnected,
        setRemoteStreams,
        setPeers
      });
    };
  }, [roomId]);

  if (!isConnected) {
    return (  
        <OnJoin roomId={roomId} roomName={roomName as string} handleJoinRoom={handleJoinRoom} controles={controles} setControles={setControles}/>
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <Header 
        roomId={roomId} 
        roomName={roomName} 
        isChatOpen={isChatOpen} 
        setIsChatOpen={setIsChatOpen}
      />

      {/* Main Content */}
      <main className="flex-1 flex overflow-auto">
        {/* Video Grid */}
        <VideoGrid participants={peers} localStreamRef={localStreamRef} />
        

        {isChatOpen && (
          <Chat/>
        )}
      </main>

      {/* Control Bar */}
      <ControlBar 
       wsRef={wsRef}
       localStreamRef={localStreamRef}
       startSharing={startSharing}
       controles={controles}
       onLeave={() => handleLeaveRoom({
        wsRef,
        pcRef,
        localStreamRef,
        localVideoRef,
        setIsConnected,
        setRemoteStreams,
        setPeers
       })}
      />
    </div>
  )
}
