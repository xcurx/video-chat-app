package sfu

import (
	"fmt"
	"io"
	"log"
	"sync"

	"github.com/pion/webrtc/v4"
)
 
type Room struct {
	ID string
	Peers map[string]*Peer
    LocalTracks []webrtc.TrackLocal
	mutex sync.Mutex
}

type Peer struct {
	ID string
	PC *webrtc.PeerConnection
}

func NewRoom(id string) *Room {
    return &Room{
		ID: id,
		Peers: make(map[string] *Peer),
		LocalTracks: make([]webrtc.TrackLocal, 0),
	}
}

func (r *Room) AddPeer(peer *Peer) {
    r.mutex.Lock()
	defer r.mutex.Unlock()
	r.Peers[peer.ID] = peer

	//add already existing tracks to peer's connections
	for _, track := range r.LocalTracks {
		if _, err := peer.PC.AddTrack(track); err != nil {
			log.Printf("Error adding existing track %s to peer %s: %v", track.ID(), peer.ID, err)
		}
	}
}

func (r *Room) RemovePeer(peerID string) {
    r.mutex.Lock()
	defer r.mutex.Unlock()
	delete(r.Peers, peerID)
}

// creates a new peer connection
func NewPeer(id string, room *Room) (*Peer, error) {
	m := &webrtc.MediaEngine{}
	if err := m.RegisterCodec(webrtc.RTPCodecParameters{
		RTPCodecCapability: webrtc.RTPCodecCapability{
			MimeType: webrtc.MimeTypeVP8,
			ClockRate: 90000,
			Channels: 0,
			SDPFmtpLine: "",
			RTCPFeedback: nil,
		},
		PayloadType: 96,
	}, webrtc.RTPCodecTypeVideo); err != nil {
		return nil, err
	}
	if err := m.RegisterCodec(webrtc.RTPCodecParameters{
		RTPCodecCapability: webrtc.RTPCodecCapability{
			MimeType: webrtc.MimeTypeOpus,
			ClockRate: 48000,
			Channels: 2,
			SDPFmtpLine: "",
			RTCPFeedback: nil,
		},
		PayloadType: 111,
	}, webrtc.RTPCodecTypeAudio); err != nil {
		return nil, err
	}

	api := webrtc.NewAPI(webrtc.WithMediaEngine(m))

	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{
				URLs: []string{"stun:stun.l.google.com:19302"},
			},
		},
	}

	pc, err := api.NewPeerConnection(config)
	if err != nil {
		return nil, err
	}

	pc.OnTrack(func(remoteTrack *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		fmt.Printf("Track receiverd from peer %s: %s\n", id , remoteTrack.Kind())

		localTrack, newTrackErr := webrtc.NewTrackLocalStaticRTP(
			remoteTrack.Codec().RTPCodecCapability,
			remoteTrack.ID(),
			remoteTrack.StreamID(),
		)
		if newTrackErr != nil {
			log.Printf("Error creating local track for forwarding: %v", newTrackErr)
			return
		}
		room.addTrackToRoom(localTrack)

		go func() {
			rtpBuf := make([]byte, 1500)
			for {
				i, _, reacErr := remoteTrack.Read(rtpBuf)
				if reacErr != nil {
					if reacErr == io.EOF {
						// track ended
						return
					}
					log.Println("Error reading from remote track: ", reacErr)
					return
				}

				if _, writeErr := localTrack.Write(rtpBuf[:i]); writeErr != nil && writeErr != io.ErrClosedPipe {
					log.Println("Error writing to local track: ", writeErr)
					return
				}
			}
		}()
	})

	return &Peer{
		ID: id,
		PC: pc,
	}, nil
}

func (r *Room) addTrackToRoom(t webrtc.TrackLocal) {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	r.LocalTracks = append(r.LocalTracks, t)

	for _, peer := range r.Peers {
		if _, err := peer.PC.AddTrack(t); err != nil {
			log.Printf("Error adding new track %s to peer %s: %v", t.ID(), peer.ID, err)
		}
	}
}