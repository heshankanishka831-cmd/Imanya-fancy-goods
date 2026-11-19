package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"wholesale-management/internal/config"
	"wholesale-management/internal/platform/database"
	"wholesale-management/internal/platform/logger"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	_, _ = logger.InitLogger(cfg.ServerEnv)

	fmt.Printf("Attempting connection to PostgreSQL:\n")
	fmt.Printf("  Host:     %s:%s\n", cfg.DBHost, cfg.DBPort)
	fmt.Printf("  User:     %s\n", cfg.DBUser)
	fmt.Printf("  Database: %s\n", cfg.DBName)
	fmt.Printf("  SSLMode:  %s\n\n", cfg.DBSSLMode)

	db, err := database.Connect(cfg)
	if err != nil {
		fmt.Printf("FAILED: Could not connect to database: %v\n\n", err)
		fmt.Println("Please verify your PostgreSQL password in backend/.env")
		return
	}
	defer db.SqlDB.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var version string
	if err := db.SqlDB.QueryRowContext(ctx, "SELECT version()").Scan(&version); err != nil {
		fmt.Printf("Failed to query version: %v\n", err)
		return
	}

	fmt.Printf("SUCCESS! Connected to PostgreSQL database.\nServer: %s\n\n", version)

	fmt.Println("Applying database migrations from ./migrations ...")
	if err := db.RunMigrations("./migrations"); err != nil {
		fmt.Printf("Migration error: %v\n", err)
		return
	}

	fmt.Println("\nAll tables and seed data have been successfully created and verified!")
}
