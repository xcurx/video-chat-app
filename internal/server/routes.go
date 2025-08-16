package server

import (
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func (s *Server) ResgisterRouter() http.Handler {
	r := gin.Default()
	r.Use(gin.Logger())
	r.Use(cors.New(cors.Config{
			AllowOrigins: []string{"*"},
			AllowMethods: []string{"GET", "POST", "PUT", "DELETE","OPTIONS"},
			AllowHeaders: []string{"Accept", "Content-Type", "Accept"},
			AllowCredentials: true,
	}))

	return r
}