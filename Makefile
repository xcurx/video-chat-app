.PHONY: start
start:
	go run ./cmd/main.go

.PHONY: dev
dev:
	go run ./cmd/main.go

.PHONY: server
server:
	go run ./cmd/main.go