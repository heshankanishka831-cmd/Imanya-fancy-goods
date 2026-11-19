package main

import (
	"fmt"
	"log"
	"os"

	"wholesale-management/internal/config"
	"wholesale-management/internal/platform/database"
	"wholesale-management/internal/platform/logger"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Config load failed: %v", err)
	}

	_, _ = logger.InitLogger(cfg.ServerEnv)

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	defer db.SqlDB.Close()

	// Read updated 000002_seed_initial_data.up.sql
	sqlBytes, err := os.ReadFile("migrations/000002_seed_initial_data.up.sql")
	if err != nil {
		log.Fatalf("Failed to read migration file: %v", err)
	}

	fmt.Println("Applying Fancy Goods seed data to PostgreSQL database...")
	if err := db.DB.Exec(string(sqlBytes)).Error; err != nil {
		log.Fatalf("Failed to execute SQL: %v", err)
	}

	fmt.Println("SUCCESS: Fancy Goods categories, suppliers, products, and stock balances successfully loaded!")
}
