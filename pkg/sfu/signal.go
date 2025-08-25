package sfu

import (
	"encoding/json"
	"log"

	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v4"
)

type Signal struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

func (p *Peer) HandleSignal(conn *websocket.Conn, r *Room) {
	defer conn.Close()

	for {
	    _, msg, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Error reading message from peer %s: %v", p.ID, err)
			return
		}

		var signal Signal
		if err := json.Unmarshal(msg, &signal); err != nil {
			log.Printf("Error unmarshalling signal from peer %s: %v", p.ID, err)
			log.Printf("Raw message from peer %s: %s", p.ID, string(msg))
			continue
		}

		log.Printf(">>> Received signal '%s' from peer %s", signal.Type, p.ID) 

		switch signal.Type {
		case "offer":
			p.handleOffer(conn, signal.Payload, r)
		case "answer":
			p.handleAnswer(conn, signal.Payload)
		case "candidate":
			p.handleCandidate(conn, signal.Payload)
		default:
			log.Printf("Unkown signal type from peer %s: %s", p.ID, signal.Type)
		}
	}
}

func (p *Peer) handleOffer(conn *websocket.Conn, payload interface{}, r *Room) {
	var offer webrtc.SessionDescription
	jsonStr, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Error marshalling offer payload from peer %s: %v", p.ID, err)
	}

	if err :=json.Unmarshal(jsonStr, &offer); err != nil {
		log.Printf("Error unmarshalling offer from peer %s: %v", p.ID, err)
	}

	if err := p.PC.SetRemoteDescription(offer); err != nil {
		log.Printf("Error setting remote description for peer %s: %v", p.ID, err)
		return
	}

	r.mutex.RLock()
	for _, track := range r.LocalTracks {
		if _, err := p.PC.AddTrack(track); err != nil {
			log.Printf("Error adding existing track %s to new peer %s: %v", track.ID(), p.ID, err)
		}
	}
	r.mutex.RUnlock()

	answer, err := p.PC.CreateAnswer(nil)
	if err != nil {
		log.Printf("Error creating answer for peer %s: %v", p.ID, err)
		return
	}

	if err := p.PC.SetLocalDescription(answer); err != nil {
		log.Printf("Error setting local description for peer %s: %v", p.ID, err)
		return
	}

	p.SendSignal(Signal{
		Type: "answer",
		Payload: answer,
	})
}

func (p *Peer) handleCandidate(conn *websocket.Conn, payload interface{}) {
	var candidate webrtc.ICECandidateInit
	jsonStr, err := json.Marshal(payload)
	if err != nil {
	    log.Printf("Error marshalling candidate payload from peer %s: %v", p.ID, err)
		return
    }

   	if err := json.Unmarshal(jsonStr, &candidate); err != nil {
        log.Printf("Error unmarshaling candidate from peer %s: %v", p.ID, err)
   		return
    }

	if err := p.PC.AddICECandidate(candidate); err != nil {
		log.Printf("Error adding ICE candidate for peer %s: %v", p.ID, err)
	}
}

func (p *Peer) handleAnswer(conn *websocket.Conn, payload interface{}) {
	var answer webrtc.SessionDescription
	jsonStr, err := json.Marshal(payload)
	if err != nil {
        log.Printf("Error marshalling answer payload from peer %s: %v", p.ID, err)
   		return
    }
	
	if err := json.Unmarshal(jsonStr, &answer); err != nil {
		log.Printf("Error unmarshaling answer from peer %s: %v", p.ID, err)
		return
	}
	
	if err := p.PC.SetRemoteDescription(answer); err != nil {
		log.Printf("Error setting remote description for peer %s: %v", p.ID, err)
	}
}

