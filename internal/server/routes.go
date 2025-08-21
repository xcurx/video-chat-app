package server

import (
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/xcurx/video/internal/handlers"
)

func (s *Server) ResgisterRouter(wsHandler *handlers.WebSocketHandler) http.Handler {
	r := gin.Default()
	r.Use(gin.Logger())
	r.Use(cors.New(cors.Config{
			AllowOrigins: []string{"*"},
			AllowMethods: []string{"GET", "POST", "PUT", "DELETE","OPTIONS"},
			AllowHeaders: []string{"Accept", "Content-Type", "Accept"},
			AllowCredentials: true,
			MaxAge: 300,
	}))

	r.GET("/ws/:roomID", wsHandler.HandleConnect)

	return r
}