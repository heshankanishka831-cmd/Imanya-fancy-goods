package database

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"wholesale-management/internal/config"
	"wholesale-management/internal/platform/logger"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

type DB struct {
	*gorm.DB
	SqlDB *sql.DB
}

func Connect(cfg *config.Config) (*DB, error) {
	logMode := gormlogger.Warn
	if cfg.ServerEnv == "development" {
		logMode = gormlogger.Info
	}

	gormConfig := &gorm.Config{
		Logger: gormlogger.Default.LogMode(logMode),
	}

	db, err := gorm.Open(postgres.Open(cfg.GetDSN()), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to postgresql database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB handle: %w", err)
	}

	// Connection Pool Tuning
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Verify connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("database ping check failed: %w", err)
	}

	logger.Log.Info("Successfully established connection to PostgreSQL database")

	return &DB{DB: db, SqlDB: sqlDB}, nil
}

// RunMigrations applies .up.sql files sequentially from migrationsPath
func (d *DB) RunMigrations(migrationsPath string) error {
	logger.Log.Infof("Executing SQL migrations from directory: %s", migrationsPath)

	entries, err := os.ReadDir(migrationsPath)
	if err != nil {
		return fmt.Errorf("unable to read migrations directory: %w", err)
	}

	var upFiles []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".up.sql") {
			upFiles = append(upFiles, entry.Name())
		}
	}
	sort.Strings(upFiles)

	for _, file := range upFiles {
		fullPath := filepath.Join(migrationsPath, file)
		content, err := os.ReadFile(fullPath)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", file, err)
		}

		logger.Log.Infof("Applying migration: %s", file)
		if err := d.Exec(string(content)).Error; err != nil {
			return fmt.Errorf("migration %s failed to execute: %w", file, err)
		}
	}

	logger.Log.Info("All database migrations applied successfully")
	return nil
}
