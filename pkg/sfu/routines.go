package sfu

import (
	"io"
	"log"
	"time"

	"github.com/pion/rtcp"
	"github.com/pion/webrtc/v4"
)

func pli(pc *webrtc.PeerConnection, remoteTrack *webrtc.TrackRemote) {
	ticker := time.NewTicker(time.Second * 2)
	defer ticker.Stop()
    
	for range ticker.C {
		err := pc.WriteRTCP([]rtcp.Packet{&rtcp.PictureLossIndication{MediaSSRC: uint32(remoteTrack.SSRC())}})
		if err != nil {
			log.Printf("Error sending PLI: %v", err)
			return
		}
	}
}

func readTrack(localTrack *webrtc.TrackLocalStaticRTP, remoteTrack *webrtc.TrackRemote, room *Room) {
	rtpBuf := make([]byte, 1500)
	for {
		i, _, readErr := remoteTrack.Read(rtpBuf)
		if readErr != nil {
			if readErr == io.EOF {
                room.RemoveTrack(remoteTrack.StreamID() ,remoteTrack.ID())
				return // track ended
			}
			log.Printf("Error reading from remote track: %v", readErr)
			return
		}

		if _, writeErr := localTrack.Write(rtpBuf[:i]); writeErr != nil && writeErr != io.ErrClosedPipe {
			log.Printf("Error writing to local track: %v", writeErr)
			return
		}
	}
}