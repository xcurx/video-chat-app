import { RefObject } from "react";

export const getMedia = async (localStreamRef: RefObject<MediaStream | null>, localVideoRef: RefObject<HTMLVideoElement | null>) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing media devices.", error);
      alert("Could not access camera/microphone.");
      return;
    }
}