import { RefObject } from "react";
import { sendSignal } from "./sendSignal";
import { handleLeaveRoom } from "./handleLeaveRoom";

interface WebSocketArgs {
    url: string;
    wsRef: RefObject<WebSocket | null>;
    pcRef: RefObject<RTCPeerConnection | null>;
    localStreamRef: RefObject<MediaStream | null>;
    localVideoRef: RefObject<HTMLVideoElement | null>;
    setIsConnected: (connected: boolean) => void;
    setRemoteStreams: React.Dispatch<React.SetStateAction<Map<string, MediaStream>>>;
}

export const wsInit = ({url, wsRef, pcRef, localStreamRef, localVideoRef, setIsConnected, setRemoteStreams}: WebSocketArgs) => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = async () => {
      console.log('✅ WebSocket connected!');
      setIsConnected(true);

      //create a single RTCPeerConnection to the SFU
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      //add local tracks to the peer connection
      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      //handle ICE candidates from our PC to send to the SFU
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({wsRef, type: 'candidate', payload: event.candidate });
        }
      };

      // handle incoming remote tracks from the SFU
      pc.ontrack = (event) => {
        console.log('Track received from SFU:', event.track.kind, event.streams[0].id);
        // the SFU sends all tracks on the same peer connection.
        // we need to manage multiple MediaStream objects for display.
        setRemoteStreams((prev) => {
          const newMap = new Map(prev);
          // use the stream ID as a unique key for the remote stream
          // if a stream already exists, update it, otherwise add new
          if (!newMap.has(event.streams[0].id)) {
            newMap.set(event.streams[0].id, event.streams[0]);
          }
          return newMap;
        });
      };

      // handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`SFU Connection state: ${pc.connectionState}`);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
          console.log('SFU connection closed or failed. Cleaning up.');
          handleLeaveRoom({wsRef, pcRef, localStreamRef, localVideoRef, setIsConnected, setRemoteStreams}); // Pass a dummy video ref
        }
      };

      // create and send the offer to the server
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({wsRef, type: 'offer', payload: pc.localDescription });
      } catch (error) {
        console.error('Error creating or setting offer:', error);
      }
    };

    ws.onclose = () => {
      console.log('❌ WebSocket disconnected.');
      handleLeaveRoom({wsRef, pcRef, localStreamRef, localVideoRef, setIsConnected, setRemoteStreams}); // Clean up everything on disconnect
    };

    // handle messages from the signaling server (SFU)
    ws.onmessage = async (event) => {
      try {
        const signal = JSON.parse(event.data);
        console.log('Received signal from SFU:', signal.type, signal.payload);

        const pc = pcRef.current;
        if (!pc) {
          console.error('PeerConnection not initialized.');
          return;
        }

        switch (signal.type) {
          case 'offer':
            console.log('Offer received from SFU');

            await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            sendSignal({wsRef, type: 'answer', payload: pc.localDescription });
            break;

          case 'answer':
            console.log('Answer received from SFU');
            await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
            break;

          case 'candidate':
            console.log('Candidate received from SFU');
            await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
            break;
          
          case 'remove':
            console.log('Remove signal received from SFU for stream:', signal.payload);
            setRemoteStreams((prev) => {
              const newMap = new Map(prev);
              signal.payload.forEach((streamId: string) => {
                newMap.delete(streamId); // payload should be the stream ID to remove
              })
              return newMap;
            });
            break;

          default:
            console.warn('Unknown signal type from SFU:', signal.type);
        }
      } catch (error) {
        console.error('Error handling signaling message from SFU:', error);
      }
    };
}