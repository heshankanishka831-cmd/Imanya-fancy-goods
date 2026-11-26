package main

import (
	"log"

	"distribution-management/internal/app"
)

func main() {
	application, err := app.Bootstrap()
	if err != nil {
		log.Fatalf("Failed to initialize application: %v", err)
	}

	if err := application.Run(); err != nil {
		log.Fatalf("Application execution failed: %v", err)
	}
}
