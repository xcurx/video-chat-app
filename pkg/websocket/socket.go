package websocket

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/xcurx/video/pkg/sfu"
)

type Socket struct {
	upgrader websocket.Upgrader
	roomManager *RoomManager
}

func InitializeSocket() *Socket {
	return &Socket{
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true;
			},
		},
		roomManager: NewRoomManager(),
	}
}

func (s *Socket) HandleConnect(c *gin.Context) {
	roomID := c.Param("roomID")
	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "roomID is required"})
		return
	}

	conn, err := s.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v\n", err)
		return
	}
	log.Println("New WebSocket connection established")

	room := s.roomManager.GetOrCreateRoom(roomID)

	peerID := uuid.NewString()
	peer, err := sfu.NewPeer(peerID, room)
	if err != nil {
		log.Printf("Failed to create SFU Peer: %v\n", err)
		conn.Close()
		return
	}

	room.AddPeer(peer)
	log.Printf("Peer %s joined room %s", peer.ID, room.ID)

	peer.HandleSignal(conn)

	room.RemovePeer(peer.ID)
	log.Printf("Peer %s left room %s", peer.ID, room.ID)
}