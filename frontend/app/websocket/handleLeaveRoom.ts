import { Peer } from "@/types/types";
import { RefObject } from "react";

interface HandleLeaveRoomArgs {
    wsRef: RefObject<WebSocket | null>;
    pcRef: RefObject<RTCPeerConnection | null>;
    localStreamRef: RefObject<MediaStream | null>;
    localVideoRef: RefObject<HTMLVideoElement | null>;
    setIsConnected: (connected: boolean) => void;
    setRemoteStreams: React.Dispatch<React.SetStateAction<Map<string, MediaStream>>>;
    setPeers: React.Dispatch<React.SetStateAction<Map<string, Peer>>>; // Optional, in case you want to clear peers as well
}

export const handleLeaveRoom = ({wsRef, pcRef, localStreamRef, localVideoRef, setIsConnected, setRemoteStreams, setPeers}: HandleLeaveRoomArgs) => {
    pcRef.current?.close();
    pcRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setIsConnected(false);
    setRemoteStreams(new Map()); // Clear all remote streams
    setPeers(new Map()); // Clear all peers if needed
    console.log('Left the room and cleaned up.');
}