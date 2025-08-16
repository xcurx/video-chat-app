package server

import (
	"flag"
	"net/http"
	"os"
)

var (
	addr = flag.String("addr", os.Getenv("PORT"), "server address")
	// cert = flag.String("cert", "", "")
	// key = flag.String("key", "", "")
	
)

type Server struct {
	port int
}

func InitializeServer() *http.Server {
	flag.Parse()
    
	if *addr == "" {
		*addr = ":8080"
	}

	NewServer := &Server {
		port : 8080,
	}

	server := &http.Server {
		Addr:   *addr,
		Handler: NewServer.ResgisterRouter(),
	}

	return server
}