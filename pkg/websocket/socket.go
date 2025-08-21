package websocket

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v4"
	webrtc_pkg "github.com/xcurx/video/pkg/webrtc"
)

type Socket struct {
	upgrader    websocket.Upgrader
	roomManager *RoomManager
}

func InitializeSocket() *Socket {
	return &Socket{
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
		roomManager: NewRoomManager(),
	}
}

func (s *Socket) HandleConnect(c *gin.Context) {
	roomID := c.Param("roomID")
	if roomID == "" {
		c.JSON(400, gin.H{"error": "roomID is required"})
	}

	conn, err := s.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Websocket upgrade failed: %v\n", err)
		c.JSON(500, gin.H{"error": "Failed to upgrade connection"})
		return
	}
	defer conn.Close()
	log.Println("New WebSocket connection established")

	room := s.roomManager.GetOrCreateRoom(roomID)

	peerConnection, err := webrtc_pkg.CreatePeerConnection()
	if err != nil {
		log.Println("Failed to create PeerConnection:", err)
		c.JSON(500, gin.H{"error": "Failed to create PeerConnection"})
		return
	}

	room.AddParticipant(conn, peerConnection)
	
	// Handle new participant setup - ensure existing tracks are available
	// room.HandleNewParticipant(conn)
	
	room.Mutex.RLock()
	currentParticipant := room.Participants[conn]
	room.Mutex.RUnlock()

	peerConnection.OnICECandidate(func(c *webrtc.ICECandidate) {
		if c == nil {
			return
		}

		currentParticipant.Send(Signal{
			Type:    "candidate",
			Payload: c.ToJSON(),
		})
	})

	peerConnection.OnTrack(func(remoteTrack *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		log.Printf(
			"Track received from client: Type=%s, Codec=%s, SSRC=%d\n",
			remoteTrack.Kind(),
			remoteTrack.Codec().MimeType,
			remoteTrack.SSRC(),
		)

		localTrack, newTrackErr := webrtc.NewTrackLocalStaticRTP(
			remoteTrack.Codec().RTPCodecCapability,
			remoteTrack.ID(),
			remoteTrack.StreamID(),
		)
		if newTrackErr != nil {
			log.Panicln("Error creating local track:", newTrackErr)
			return
		}

		room.Mutex.Lock()
		currentParticipant.VideoTrack = localTrack
		room.Mutex.Unlock()

		go func() {
			rtpBuf := make([]byte, 1500)
			for {
				i, _, readErr := remoteTrack.Read(rtpBuf)
				if readErr != nil {
					log.Println("Track reaf error:", readErr)
					return
				}
				if _, writeErr := localTrack.Write(rtpBuf[:i]); writeErr != nil {
					log.Println("Track write error:", writeErr)
					return
				}
			}
		}()

		// looping through all participants to add new track to their connection
		room.Mutex.RLock()
		for otherConn, otherParticipant := range room.Participants {
			if otherConn == conn {
				continue // this is the sender itself
			}

			log.Printf("Adding track %s to participant %s", localTrack.ID(), otherParticipant.Conn.RemoteAddr())
			if _, err := otherParticipant.PeerConnection.AddTrack(localTrack); err != nil {
				log.Println("Error adding track to other participants:", err)
				continue
			}

			//creating new offer to inform client about new track
			offer, err := otherParticipant.PeerConnection.CreateOffer(nil)
			if err != nil {
				log.Println("Error creating renegotiation offer:", err)
				continue
			}

			if err := otherParticipant.PeerConnection.SetLocalDescription(offer); err != nil {
				log.Println("Error setting local description:", err)
				continue
			}

			if err := otherParticipant.Send(Signal{Type: "offer", Payload: offer}); err != nil {
				log.Println("Error sending renegotiation offer:", err)
				continue
			}
			log.Printf("Renegotiation offer sent to participant %s", otherParticipant.Conn.RemoteAddr())
		}
		room.Mutex.RUnlock()
	})

	// message handling loop
	err = room.ListenForSignals(conn, peerConnection)
	if err != nil {
		c.JSON(500, gin.H{"error": "Error occured"})
	}
}
