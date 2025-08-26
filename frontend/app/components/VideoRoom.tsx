'use client';

import { useRef, useState, useEffect } from 'react';
import { getMedia } from '../utils/getMedia';
import { wsInit } from '../websocket/init';
import { handleLeaveRoom } from '../websocket/handleLeaveRoom';

export default function VideoRoom() {
  const [roomId, setRoomId] = useState<string>('default-room');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  // remoteStreams will now store MediaStream objects directly from the SFU
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  // refs to store WebSocket, local stream, and the single peer connection to the SFU
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null); // single PC to the SFU
  const localStreamRef = useRef<MediaStream | null>(null);

  // Effect for cleanup
  useEffect(() => {
    return () => {
      handleLeaveRoom({
        wsRef,
        pcRef,
        localStreamRef,
        localVideoRef,
        setIsConnected,
        setRemoteStreams
      });
    };
  }, []);

  const handleJoinRoom = async () => {
    // get user's media
    await getMedia(localStreamRef, localVideoRef);   
    
    // initialize WebSocket and peer connection and event handlers
    wsInit({
      url: `ws://localhost:8080/ws/${roomId}`,
      wsRef,
      pcRef,
      localStreamRef,
      localVideoRef,
      setIsConnected,
      setRemoteStreams
    })
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Go + Next.js WebRTC SFU 🚀</h1>
      {!isConnected ? (
        <div>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter Room ID"
            style={{ padding: '10px', marginRight: '10px' }}
          />
          <button onClick={handleJoinRoom} style={{ padding: '10px 20px' }}>
            Join Room
          </button>
        </div>
      ) : (
        <div>
          <p>✅ Connected to room: <strong>{roomId}</strong></p>
          <button 
            onClick={() => handleLeaveRoom({
              wsRef,
              pcRef,
              localStreamRef,
              localVideoRef,
              setIsConnected,
              setRemoteStreams
            })} 
            style={{ padding: '10px 20px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '4px' }}>
            Leave Room
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '20px' }}>
        <div>
          <h3>You</h3>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{ width: '300px', backgroundColor: 'black', margin: '5px' }}
          ></video>
        </div>

        {Array.from(remoteStreams.entries()).map(([id, stream]) => (
          <div key={id}>
            <h3>Remote User ({id.substring(0, 6)})</h3>
            <video
              autoPlay
              playsInline
              style={{ width: '300px', backgroundColor: 'black', margin: '5px' }}
              ref={(video) => {
                if (video) video.srcObject = stream;
              }}
            ></video>
          </div>
        ))}
      </div>
    </div>
  );
}
