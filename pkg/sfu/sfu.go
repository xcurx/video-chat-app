package sfu

import (
	"fmt"
	"log"
	"sync"

	"github.com/pion/webrtc/v4"
)
 
type Room struct {
	ID string
	Peers map[string]*Peer
    LocalTracks map[string]webrtc.TrackLocal
	mutex sync.RWMutex
}

type Peer struct {
	ID string
	PC *webrtc.PeerConnection
	Tracks map[string]*webrtc.TrackRemote
	SendSignal func(s Signal) error
}

func NewRoom(id string) *Room {
    return &Room{
		ID: id,
		Peers: make(map[string] *Peer),
		LocalTracks: make(map[string]webrtc.TrackLocal),
	}
}

func (r *Room) AddPeer(peer *Peer) {
	log.Printf("SendSignal set: %v\n", peer.SendSignal != nil)
    r.mutex.Lock()
	defer r.mutex.Unlock()

	r.Peers[peer.ID] = peer
}

// removePeer removes a peer from the room.
func (r *Room) RemovePeer(peerID string) {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	peer, ok := r.Peers[peerID]
	if !ok {
		r.mutex.Unlock()
		return
	}
	peer.PC.Close()
	delete(r.Peers, peerID)

	removedTracks := []string{}
	for trackID := range peer.Tracks {
		removedTracks = append(removedTracks, trackID)
		delete(r.LocalTracks, trackID)
	}
    
	for _, otherPeer := range r.Peers {
		otherPeer.SendSignal(Signal{Type: "remove", Payload: removedTracks})
	}
}

// addTrackToRoom adds a new track to the room and broadcasts it to all peers.
func (r *Room) addTrackToRoom(t webrtc.TrackLocal, id string) {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	r.LocalTracks[t.StreamID()] = t
	log.Println(t.StreamID())

	// add the new track to all existing peers in the room
	// this will trigger OnNegotiationNeeded for each peer, sending them a new offer.
	for _, peer := range r.Peers {
		if peer.ID == id {
			continue
		}
		if _, err := peer.PC.AddTrack(t); err != nil {
			log.Printf("Error adding new track %s to peer %s: %v", t.ID(), peer.ID, err)
			continue
		}
	}
}

// newPeer creates a new Peer connection.
func NewPeer(id string, room *Room) (*Peer, error) {
	m := &webrtc.MediaEngine{}
	if err := m.RegisterDefaultCodecs(); err != nil {
		return nil, err
	}

	api := webrtc.NewAPI(webrtc.WithMediaEngine(m))
	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{{URLs: []string{"stun:stun.l.google.com:19302"}}},
	}

	pc, err := api.NewPeerConnection(config)
	if err != nil {
		return nil, err
	}

	peer := &Peer{
		ID: id,
		PC: pc,
		Tracks: make(map[string]*webrtc.TrackRemote),
	}

	pc.OnTrack(func(remoteTrack *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		fmt.Printf("Track received from peer %s: %s, StreamID: %s\n", id, remoteTrack.Kind(), remoteTrack.StreamID())

		// create a new local track to forward the media
		localTrack, newTrackErr := webrtc.NewTrackLocalStaticRTP(remoteTrack.Codec().RTPCodecCapability, remoteTrack.ID(), remoteTrack.StreamID())
		if newTrackErr != nil {
			log.Printf("Error creating local track for forwarding: %v", newTrackErr)
			return
		}

		peer.Tracks[remoteTrack.StreamID()] = remoteTrack

		// add this new local track to the room
		room.addTrackToRoom(localTrack, id)

        go pli(pc, remoteTrack)
		
		// continuously read RTP packets from the remote track and write them to the local track
		go readTrack(localTrack, remoteTrack)
	})

	pc.OnNegotiationNeeded(func() {
		log.Printf("Negotiation needed for peer %s", peer.ID)
		offer, err := peer.PC.CreateOffer(nil)
		if err != nil {
			log.Printf("Error creating offer for peer %s: %v", peer.ID, err)
			return
		}

		if err := peer.PC.SetLocalDescription(offer); err != nil {
			log.Printf("Error setting local description for peer %s: %v", peer.ID, err)
			return
		}

		if offer.SDP == "" {
			log.Printf("Error: Offer SDP is empty for peer %s", peer.ID)
			return
		}

		if peer.SendSignal != nil {
			if err := peer.SendSignal(Signal{Type: "offer", Payload: offer}); err != nil {
				log.Printf("Error sending offer to peer %s: %v", peer.ID, err)
			} 
		} else {
			log.Printf("SendSignal not configured for peer %s, cannot send offer", peer.ID)
		}
	})

	return peer, nil
}