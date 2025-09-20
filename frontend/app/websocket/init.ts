import { RefObject } from "react";
import { sendSignal } from "./sendSignal";
import { handleLeaveRoom } from "./handleLeaveRoom";
import { Peer } from "../room/[roomId]/page";

interface WebSocketArgs {
    url: string;
    name: string;
    wsRef: RefObject<WebSocket | null>;
    pcRef: RefObject<RTCPeerConnection | null>;
    localStreamRef: RefObject<MediaStream | null>;
    localVideoRef: RefObject<HTMLVideoElement | null>;
    setIsConnected: (connected: boolean) => void;
    setRemoteStreams: React.Dispatch<React.SetStateAction<Map<string, MediaStream>>>;
    setPeers: React.Dispatch<React.SetStateAction<Map<string, Peer>>>;
}

export const wsInit = ({url, name, wsRef, pcRef, localStreamRef, localVideoRef, setIsConnected, setRemoteStreams, setPeers}: WebSocketArgs) => {
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

      pcRef.current.addTransceiver('video', { direction: 'sendrecv' });
      pcRef.current.addTransceiver('audio', { direction: 'sendrecv' });

      //add local tracks to the peer connection
      if (localStreamRef.current) {
        localStreamRef.current?.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

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
          console.log(prev)
          // use the stream ID as a unique key for the remote stream
          // if a stream already exists, update it, otherwise add new
          if (!newMap.has(event.streams[0].id)) {
            newMap.set(event.streams[0].id, event.streams[0]);
          }
          return newMap;
        });

        setPeers((prev) => {
          const newMap = new Map(prev);
          // update the peer info with stream ID
          console.log("Peers before update:", prev, event.streams[0]);
          newMap.forEach((peer, id) => {
            if (peer.streamId === event.streams[0].id) {
              newMap.set(id, { ...peer, streamId: event.streams[0].id, remoteStream: event.streams[0] });
            }
          });
          console.log("Peers after update:", newMap);
          return newMap;
        })
      };

      // handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`SFU Connection state: ${pc.connectionState}`);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
          console.log('SFU connection closed or failed. Cleaning up.');
          handleLeaveRoom({wsRef, pcRef, localStreamRef, localVideoRef, setIsConnected, setRemoteStreams, setPeers}); // Pass a dummy video ref
        }
      };

      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (pc.connectionState === 'new' || pc.connectionState === 'connecting') {
            sendSignal({wsRef, type: 'offer', payload: pc.localDescription });
          } else {
            sendSignal({wsRef, type: 'renegotiation', payload: pc.localDescription });
          } 
        } catch (error) {
          console.error('Error creating or setting offer:', error);
        }
      }

      //create and send the offer to the server
      // try {
      //   const offer = await pc.createOffer();
      //   await pc.setLocalDescription(offer);
      //   sendSignal({wsRef, type: 'offer', payload: pc.localDescription });
      // } catch (error) {
      //   console.error('Error creating or setting offer:', error);
      // }
    };

    ws.onclose = () => {
      console.log('❌ WebSocket disconnected.');
      handleLeaveRoom({wsRef, pcRef, localStreamRef, localVideoRef, setIsConnected, setRemoteStreams, setPeers}); // Clean up everything on disconnect
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
            const payload = signal.payload
            console.log("The answer is here", signal, payload)
            if (Object.keys(payload).includes("sdp")){
              await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
            } else {
              if (!localStreamRef.current) {
                localStreamRef.current = new MediaStream();
              }
              const streamId = localStreamRef.current?.id;
              sendSignal({
                wsRef, 
                type: 'connection-made', 
                payload: { 
                  name,
                  streamId,
                  isVideoEnabled: localStreamRef.current.getVideoTracks()[0]?.enabled || false,
                  isAudioEnabled: localStreamRef.current.getAudioTracks()[0]?.enabled || false
                }})
              setPeers(prev => {
                const newMap = new Map(prev);
                payload.peers?.forEach((p:Omit<Peer, "remoteStream">) => {
                  console.log("New peer",p)
                  newMap.set(p.id, {...p});
                })
                return newMap;
              }) 
            }
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
            setPeers((prev) => {
              const newMap = new Map(prev);
              signal.payload.forEach((streamId: string) => {
                // find peer by streamId and remove
                newMap.forEach((peer, id) => {
                  if (peer.streamId === streamId) {
                    newMap.delete(id);
                  }
                });
              })
              return newMap;
            })
            break;
          
          case 'update-peer':
            console.log('Peer update received from SFU:', signal.payload);
            const peer = signal.payload as Peer;
            setPeers((prev) => {
              const newMap = new Map(prev);
              const existingPeer = newMap.get(peer.id)
              if (existingPeer) {
                newMap.set(peer.id, { ...existingPeer, ...peer });
              } else {
                newMap.set(peer.id, peer);
              }
              return newMap;
            })
            break;

          default:
            console.warn('Unknown signal type from SFU:', signal.type);
        }
      } catch (error) {
        console.error('Error handling signaling message from SFU:', error);
      }
    };
}