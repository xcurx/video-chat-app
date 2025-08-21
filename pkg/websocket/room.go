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

func NewRoomManager() *RoomManager {
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

	participant, exists := r.Participants[conn]
	if !exists {
		return
	}

	// Notify other participants to remove this participant's track
	if participant.VideoTrack != nil {
		r.notifyTrackRemoval(conn, participant.VideoTrack)
	}

	delete(r.Participants, conn)
	log.Printf("Removed participant from room %s. Total participants: %d\n", r.ID, len(r.Participants))
}

// Helper method to notify other participants about track removal
func (r *Room) notifyTrackRemoval(leavingConn *websocket.Conn, trackToRemove *webrtc.TrackLocalStaticRTP) {
	for otherConn, otherParticipant := range r.Participants {
		if otherConn == leavingConn {
			continue
		}

		// send track removal notification first
		trackRemovedSignal := Signal{
			Type:    "track-removed",
			Payload: map[string]string{"trackId": trackToRemove.StreamID()},
		}
		if err := otherParticipant.Send(trackRemovedSignal); err != nil {
			log.Printf("Error sending track removal notification: %v", err)
		}

		// remove the track from other participants' peer connections
		senders := otherParticipant.PeerConnection.GetSenders()
		for _, sender := range senders {
			if sender.Track() != nil && sender.Track().ID() == trackToRemove.ID() {
				if err := otherParticipant.PeerConnection.RemoveTrack(sender); err != nil {
					log.Printf("Error removing track from participant %s: %v", otherConn.RemoteAddr(), err)
					continue
				}
				log.Printf("Removed track %s from participant %s", trackToRemove.ID(), otherConn.RemoteAddr())

				// create new offer to renegotiate after track removal
				offer, err := otherParticipant.PeerConnection.CreateOffer(nil)
				if err != nil {
					log.Printf("Error creating offer after track removal: %v", err)
					continue
				}

				if err := otherParticipant.PeerConnection.SetLocalDescription(offer); err != nil {
					log.Printf("Error setting local description after track removal: %v", err)
					continue
				}

				if err := otherParticipant.Send(Signal{Type: "offer", Payload: offer}); err != nil {
					log.Printf("Error sending renegotiation offer after track removal: %v", err)
				}
				break
			}
		}
	}
}

// method to handle new participant joining - ensures all existing participants send their tracks to the new one
func (r *Room) HandleNewParticipant(newConn *websocket.Conn) {
	r.Mutex.RLock()
	defer r.Mutex.RUnlock()

	newParticipant := r.Participants[newConn]
	if newParticipant == nil {
		return
	}

	log.Printf("Setting up new participant %s with %d existing participants", newConn.RemoteAddr(), len(r.Participants)-1)

	// for each existing participant (excluding the new one), ensure their tracks will be available
	existingCount := 0
	for existingConn, existingParticipant := range r.Participants {
		if existingConn == newConn {
			continue
		}

		if existingConn != newParticipant.Conn && existingParticipant.VideoTrack != nil {
			log.Printf("Adding track %s to new participant %s", existingParticipant.VideoTrack.ID(), newParticipant.Conn.RemoteAddr())
			if _, err := newParticipant.PeerConnection.AddTrack(existingParticipant.VideoTrack); err != nil {
				log.Println("Error adding existing track:", err)
			}
		}

		if existingParticipant.VideoTrack != nil {
			log.Printf("Existing participant %s has video track %s", existingConn.RemoteAddr(), existingParticipant.VideoTrack.ID())
			existingCount++
		}
	}

	log.Printf("New participant %s will receive tracks from %d existing participants", newConn.RemoteAddr(), existingCount)
}
