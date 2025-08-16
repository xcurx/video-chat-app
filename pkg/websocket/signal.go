package websocket

import (
	"encoding/json"
	"log"

	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v4"
)

// types: "offer", "answer", "candidate", "chat"
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
			offer := webrtc.SessionDescription{}
			payloadStr, _ := json.Marshal(signal.Payload)
			json.Unmarshal(payloadStr, &offer)

			if err := peerConnection.SetRemoteDescription(offer); err != nil {
				log.Println("Error setting remote description", err)
				continue
			}

			answer, err := peerConnection.CreateAnswer(nil)
			if err != nil {
				log.Panicln("Error creating answer:", err)
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
			}
		
		default: 
		    log.Println("Unknown signal type:", signal.Type)
		}

		log.Println(string(msg))
	}

	return nil
}
