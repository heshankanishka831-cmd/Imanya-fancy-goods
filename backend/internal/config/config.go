package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	ServerPort          string
	ServerEnv           string
	DBHost              string
	DBPort              string
	DBUser              string
	DBPassword          string
	DBName              string
	DBSSLMode           string
	JWTSecret           string
	JWTExpirationHours  int
	WhatsAppPhoneNumber string
	WhatsAppPrefix      string
	UploadDir           string
	MaxUploadSizeMB     int64
	CORSAllowedOrigins  []string
}

func LoadConfig() (*Config, error) {
	// Try loading .env if it exists
	_ = godotenv.Load(".env")

	cfg := &Config{
		ServerPort:          getEnv("SERVER_PORT", "8080"),
		ServerEnv:           getEnv("SERVER_ENV", "development"),
		DBHost:              getEnv("DB_HOST", "localhost"),
		DBPort:              getEnv("DB_PORT", "5432"),
		DBUser:              getEnv("DB_USER", "postgres"),
		DBPassword:          getEnv("DB_PASSWORD", "postgres"),
		DBName:              getEnv("DB_NAME", "wholesale_management"),
		DBSSLMode:           getEnv("DB_SSLMODE", "disable"),
		JWTSecret:           getEnv("JWT_SECRET", "super-secret-key-change-in-production-min-32-chars-long!"),
		JWTExpirationHours:  getEnvAsInt("JWT_EXPIRATION_HOURS", 24),
		WhatsAppPhoneNumber: getEnv("WHATSAPP_PHONE_NUMBER", "94770000000"),
		WhatsAppPrefix:      getEnv("WHATSAPP_MESSAGE_PREFIX", "Hello Wholesale Team, I would like to confirm my order:"),
		UploadDir:           getEnv("UPLOAD_DIR", "./uploads"),
		MaxUploadSizeMB:     int64(getEnvAsInt("MAX_UPLOAD_SIZE_MB", 5)),
		CORSAllowedOrigins:  strings.Split(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"), ","),
	}

	return cfg, nil
}

func (c *Config) GetDSN() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode)
}

func getEnv(key, defaultVal string) string {
	if val, exists := os.LookupEnv(key); exists && strings.TrimSpace(val) != "" {
		return val
	}
	return defaultVal
}

func getEnvAsInt(key string, defaultVal int) int {
	valStr := getEnv(key, "")
	if val, err := strconv.Atoi(valStr); err == nil {
		return val
	}
	return defaultVal
}
