package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/xcurx/video/pkg/websocket"
)

type WebSocketHandler struct {
	socketService *websocket.Socket
}

func NewWebSocketHandler(socketService *websocket.Socket) *WebSocketHandler {
	return &WebSocketHandler{
		socketService: socketService,
	}
}

func (h *WebSocketHandler) HandleConnect(c *gin.Context) {
	h.socketService.HandleConnect(c)
}