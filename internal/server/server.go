package server

import (
	"net/http"

	"github.com/xcurx/video/internal/handlers"
	"github.com/xcurx/video/pkg/websocket"
)
type Server struct {
	port int
}

func InitializeServer() *http.Server {
	NewServer := &Server {
		port : 8080,
	}

	socketService := websocket.InitializeSocket()
	wsHandler := handlers.NewWebSocketHandler(socketService)

	server := &http.Server {
		Addr:   ":8080",
		Handler: NewServer.ResgisterRouter(wsHandler),
	}

	return server
}