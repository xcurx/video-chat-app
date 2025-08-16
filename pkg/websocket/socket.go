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
		roomManager: NewRoomMaanger(),
	}
}

func (s *Socket) HandleConnect(c *gin.Context) {
    roomID := c.Param("roomID")
	if roomID == "" {
        c.JSON(400, gin.H{"error": "roomID is required"})
	}

	conn, err := s.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
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

	peerConnection.OnTrack(func(remoteTrack *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		log.Printf(
			"Track received from client: Type=%s, Codec=%s, SSRC=%d\n",
			remoteTrack.Kind(),
			remoteTrack.Codec().MimeType,
			remoteTrack.SSRC(),
		)
        //IMPORTANT: we have to handle track forwarding
	})

	err = room.ListenForSignals(conn, peerConnection)
	if err != nil {
		c.JSON(500, gin.H{"error": "Error occured"})
	}
}
