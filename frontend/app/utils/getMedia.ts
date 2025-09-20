import { RefObject } from "react";

interface GetMediaParams {
    localStreamRef: RefObject<MediaStream | null>;
    localVideoRef: RefObject<HTMLVideoElement | null>;
    video?: boolean;
    audio?: boolean;
}

export const getMedia = async ({localStreamRef, localVideoRef, video, audio}:GetMediaParams) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch {
      // console.error("Error accessing media devices.", error);
      localStreamRef.current = new MediaStream(); // Ensure it's at least an empty MediaStream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      return;
    }
}