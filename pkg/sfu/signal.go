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

func (p *Peer) HandleSignal(conn *websocket.Conn) {
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
			continue
		}

		switch signal.Type {
		case "offer":
			p.handleOffer(conn, signal.Payload)

		case "candidate":
			p.handleCandidate(conn, signal.Payload)

		default:
			log.Printf("Unkown signal type from peer %s: %s", p.ID, signal.Type)
		}
	}
}

func (p *Peer) handleOffer(conn *websocket.Conn, payload interface{}) {
	offerMap, ok := payload.(map[string]interface{})
	if !ok {
		log.Printf("Invalid offer payload from peer %s", p.ID)
		return
	}

	var offer webrtc.SessionDescription
	jsonStr, _ := json.Marshal(offerMap)
	json.Unmarshal(jsonStr, &offer)

	if err := p.PC.SetRemoteDescription(offer); err != nil {
		log.Printf("Error setting remote description for peer %s: %v", p.ID, err)
		return
	}

	answer, err := p.PC.CreateAnswer(nil)
	if err != nil {
		log.Printf("Error creating answer for peer %s: %v", p.ID, err)
		return
	}

	if err := p.PC.SetLocalDescription(answer); err != nil {
		log.Printf("Error setting local description for peer %s: %v", p.ID, err)
		return
	}

	conn.WriteJSON(Signal{
		Type: "answer",
		Payload: answer,
	})
}

func (p *Peer) handleCandidate(conn *websocket.Conn, payload interface{}) {
    candidateMap, ok := payload.(map[string]interface{})
	if !ok {
		log.Printf("Invalid candidate payload from peer %s", p.ID)
		return
	}

    var candidate webrtc.ICECandidateInit
	jsonStr, _ := json.Marshal(candidateMap)
	json.Unmarshal(jsonStr, &candidate)

	if err := p.PC.AddICECandidate(candidate); err != nil {
		log.Panicf("Error adding ICE candidate for peer %s: %v", p.ID, err)
	}
}
