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
        log.Println(r.LocalTracks)

		var signal Signal
		if err := json.Unmarshal(msg, &signal); err != nil {
			log.Printf("Error unmarshalling signal from peer %s: %v", p.ID, err)
			log.Printf("Raw message from peer %s: %s", p.ID, string(msg))
			continue
		}

		log.Printf(">>> Received signal '%s' from peer %s", signal.Type, p.ID) 

		switch signal.Type {
		case "offer":
			p.handleOffer(signal.Payload, r)
		case "renegotiation":
			p.handleRenegotiation(signal.Payload, r)
		case "answer":
			p.handleAnswer(signal.Payload)
		case "connection-made":
			p.handleConnectionMade(signal.Payload, r)
		case "candidate":
			p.handleCandidate(signal.Payload)
		case "toggle-video":
			p.handleToggleVideo(signal.Payload, r)
		case "toggle-audio":
			p.handleToggleAudio(signal.Payload, r)
		default:
			log.Printf("Unkown signal type from peer %s: %s", p.ID, signal.Type)
		}
	}
}

func (p *Peer) handleOffer(payload interface{}, r *Room) {
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
	for _, stream := range r.LocalTracks {
		for _, track := range stream {
			if _, err := p.PC.AddTrack(track); err != nil {
				log.Printf("Error adding existing track %s to new peer %s: %v", track.ID(), p.ID, err)
			}
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

	if p.PC.ConnectionState() == webrtc.PeerConnectionStateNew || 
	   p.PC.ConnectionState() == webrtc.PeerConnectionStateConnecting {
	   type AnswerSignal struct {
	    Answer webrtc.SessionDescription `json:"answer"`
	    Peers interface{} `json:"peers"`
	   }
	   log.Println("New answer")
   
	   peersInfo := r.GetPeerInfoExcept(p)
	   var answerSignal = AnswerSignal{
	    Answer: answer,
	    Peers: peersInfo,
	   }

	   p.SendSignal(Signal{
		Type: "answer",
		Payload: answerSignal,
	   })
	}

	log.Println("sending answer")

	p.SendSignal(Signal{
		Type: "answer",
		Payload: answer,
	})
}

func (p *Peer) handleRenegotiation(payload interface{}, r *Room) {
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

func (p *Peer) handleCandidate(payload interface{}) {
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

func (p *Peer) handleAnswer(payload interface{}) {
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

func (p *Peer) handleConnectionMade(payload interface{}, r *Room) {
	var peerData map[string]interface{}
	jsonStr, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Error marshalling connection-made payload from peer %s: %v", p.ID, err)
	}
	if err := json.Unmarshal(jsonStr, &peerData); err != nil {
		log.Printf("Error unmarshalling connection-made payload from peer %s: %v", p.ID, err)
	}
	log.Println("StreamID received: ", peerData["streamId"].(string))

	p.Name = peerData["name"].(string)
	p.StreamID = peerData["streamId"].(string)
	p.IsAudioEnabled = peerData["isAudioEnabled"].(bool)
	p.IsVideoEnabled = peerData["isVideoEnabled"].(bool)

	type peerPayload struct {
		ID string `json:"id"`
		Name string `json:"name"`
		IsVideoEnabled bool `json:"isVideoEnabled"`
		IsAudioEnabled bool `json:"isAudioEnabled"`
		StreamId string `json:"streamId"`
	}
	var peerSignal = peerPayload{
		ID: p.ID,
		Name: p.Name,
		IsVideoEnabled: p.IsVideoEnabled,
		IsAudioEnabled: p.IsAudioEnabled,
		StreamId: p.StreamID,
	}

	for _, peer := range r.Peers {
		if peer.ID == p.ID {
			continue
		}
		log.Printf("Notifying peer %s about new peer %s", peer.ID, p.ID)
		peer.SendSignal(Signal{Type: "update-peer", Payload: peerSignal})
	}
}

func (p *Peer) handleToggleVideo(payload interface{}, r *Room) {
	p.IsVideoEnabled = payload.(bool)

	type peerPayload struct {
		ID string `json:"id"`
		Name string `json:"name"`
		IsVideoEnabled bool `json:"isVideoEnabled"`
		IsAudioEnabled bool `json:"isAudioEnabled"`
		StreamId string `json:"streamId"`
	}
	var peerSignal = peerPayload{
		ID: p.ID,
		Name: p.Name,
		IsVideoEnabled: p.IsVideoEnabled,
		IsAudioEnabled: p.IsAudioEnabled,
		StreamId: p.StreamID,
	}

	for _, peer := range r.Peers {
		if peer.ID == p.ID {
			continue
		}
		log.Printf("Notifying peer %s about updated video status of peer %s", peer.ID, p.ID)
		peer.SendSignal(Signal{Type: "update-peer", Payload: peerSignal})
	}
}

func (p *Peer) handleToggleAudio(payload interface{}, r *Room) {
	p.IsAudioEnabled = payload.(bool)

	type peerPayload struct {
		ID string `json:"id"`
		Name string `json:"name"`
		IsVideoEnabled bool `json:"isVideoEnabled"`
		IsAudioEnabled bool `json:"isAudioEnabled"`
		StreamId string `json:"streamId"`
	}
	var peerSignal = peerPayload{
		ID: p.ID,
		Name: p.Name,
		IsVideoEnabled: p.IsVideoEnabled,
		IsAudioEnabled: p.IsAudioEnabled,
		StreamId: p.StreamID,
	}

	for _, peer := range r.Peers {
		if peer.ID == p.ID {
			continue
		}
		log.Printf("Notifying peer %s about updated audio status of peer %s", peer.ID, p.ID)
		peer.SendSignal(Signal{Type: "update-peer", Payload: peerSignal})
	}
}

