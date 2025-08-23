package websocket

import (
	"log"
	"sync"

	"github.com/xcurx/video/pkg/sfu"
)

type RoomManager struct {
	Rooms map[string]*sfu.Room
	mutex    sync.RWMutex
}

func NewRoomManager() *RoomManager {
	return &RoomManager{
		Rooms: make(map[string] *sfu.Room),
	}
}

func (rm *RoomManager) GetOrCreateRoom(id string) *sfu.Room {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	if room, ok := rm.Rooms[id]; ok {
		return room
	}

	room := sfu.NewRoom(id)
	rm.Rooms[id] = room
	log.Println("Created new SFU room:", id)
	return room
}


