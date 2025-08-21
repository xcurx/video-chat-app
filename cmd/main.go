package main

import (
	"log"

	"github.com/xcurx/video/internal/server"
)

func main() {
	server := server.InitializeServer()
	err := server.ListenAndServe()
	if err != nil {
		log.Fatalln(err)
	}
}