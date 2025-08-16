package websocket

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v4"
)

type Participant struct {
	Conn           *websocket.Conn
	PeerConnection *webrtc.PeerConnection
	VideoTrack     *webrtc.TrackLocalStaticRTP
}

type Room struct {
	ID           string
	Participants map[*websocket.Conn]*Participant
	Mutex        sync.RWMutex
}

type RoomManager struct {
	Rooms map[string]*Room
	Mutex sync.Mutex
}

func NewRoomMaanger() *RoomManager {
	return &RoomManager{
		Rooms: make(map[string]*Room),
	}
}

func (p *Participant) Send(message Signal) error {
    msg, err := json.Marshal(message)
	if err != nil {
		return err
	}
	return p.Conn.WriteMessage(websocket.TextMessage, msg)
}

func (rm *RoomManager) GetOrCreateRoom(id string) *Room {
	rm.Mutex.Lock()
	defer rm.Mutex.Unlock()

	if room, ok := rm.Rooms[id]; ok {
		return room
	}

	room := &Room{
		ID:           id,
		Participants: make(map[*websocket.Conn]*Participant),
	}
	rm.Rooms[id] = room
	log.Println("Created new room", id)
	return room
}

func (r *Room) AddParticipant(conn *websocket.Conn, peerConnection *webrtc.PeerConnection) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	r.Participants[conn] = &Participant{
		Conn:           conn,
		PeerConnection: peerConnection,
	}
	log.Printf("Added participant to room %s. Total participants: %d\n", r.ID, len(r.Participants))
}

func (r *Room) RemoveParticipant(conn *websocket.Conn) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	delete(r.Participants, conn)
	log.Printf("Removed participant from room %s. Total participants: %d\n", r.ID, len(r.Participants))
}

//TODO: add broadcast method here later
