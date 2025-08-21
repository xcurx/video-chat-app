package websocket

import (
	"encoding/json"
	"log"

	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v4"
)

// types: "offer", "answer", "candidate", "chat", "track-removed"
type Signal struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

func (r *Room) ListenForSignals(conn *websocket.Conn, peerConnection *webrtc.PeerConnection) error {
	defer func() {
		r.RemoveParticipant(conn)
		peerConnection.Close()
	}()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				return err
			}
			break
		}

		var signal Signal
		if err := json.Unmarshal(msg, &signal); err != nil {
			log.Println("Error unmarshaling signal:", err)
			continue
		}

		switch signal.Type {
		case "offer":
			r.HandleNewParticipant(conn)
			offer := webrtc.SessionDescription{}
			payloadStr, _ := json.Marshal(signal.Payload)
			if err := json.Unmarshal(payloadStr, &offer); err != nil {
				log.Println("Error unmarshaling offer:", err)
				continue
			}

			if err := peerConnection.SetRemoteDescription(offer); err != nil {
				log.Println("Error setting remote description", err)
				continue
			}

			answer, err := peerConnection.CreateAnswer(nil)
			if err != nil {
				log.Println("Error creating answer:", err)
				continue
			}

			if err := peerConnection.SetLocalDescription(answer); err != nil {
				log.Println("Error setting local description", err)
				continue
			}

			answerSignal := Signal{Type: "answer", Payload: answer}
			answerMsg, _ := json.Marshal(answerSignal)

			if err := conn.WriteMessage(websocket.TextMessage, answerMsg); err != nil {
				log.Println("Error sending answer:", err)
				continue
			}
			log.Printf("Answer sent to participant %s", conn.RemoteAddr())

		case "answer":
			answer := webrtc.SessionDescription{}
			payloadStr, _ := json.Marshal(signal.Payload)
			if err := json.Unmarshal(payloadStr, &answer); err != nil {
				log.Println("Error unmarshaling answer:", err)
				continue
			}

			if err := peerConnection.SetRemoteDescription(answer); err != nil {
				log.Println("Error setting remote description for answer:", err)
				continue
			}
			log.Printf("Answer processed for participant %s", conn.RemoteAddr())

		case "candidate":
			candidate := webrtc.ICECandidateInit{}
			payloadStr, _ := json.Marshal(signal.Payload)
			if err := json.Unmarshal(payloadStr, &candidate); err != nil {
				log.Println("Error unmarshaling ICE candidate:", err)
				continue
			}

			if err := peerConnection.AddICECandidate(candidate); err != nil {
				log.Println("Error adding ICE candidate:", err)
				continue
			}
			log.Printf("ICE candidate added for participant %s", conn.RemoteAddr())
		
		case "track-removed":
			// This signal is sent TO participants, not FROM them
			log.Printf("Track removal notification sent to participant %s", conn.RemoteAddr())

		default:
			log.Println("Unknown signal type:", signal.Type)
		}

		// log.Println(string(msg))
	}

	return nil
}
