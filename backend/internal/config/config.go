package config

import (
	"fmt"
	"net/mail"
	"os"
	"path/filepath"
	"runtime"
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
	WhatsAppPhoneNumber   string
	WhatsAppPrefix        string
	WhatsAppCloudAPIToken      string
	WhatsAppPhoneNumberID      string
	WhatsAppAPIVersion         string
	WhatsAppWebhookVerifyToken string
	UploadDir           string
	MaxUploadSizeMB     int64
	CORSAllowedOrigins  []string
	SMTPHost            string
	SMTPPort            int
	SMTPEmail           string
	SMTPPassword        string
	SMTPFromName        string
	LoadedEnvFiles      []string
}

func cleanEnvValue(v string) string {
	s := strings.TrimSpace(v)
	if len(s) >= 2 {
		if (s[0] == '"' && s[len(s)-1] == '"') || (s[0] == '\'' && s[len(s)-1] == '\'') {
			s = strings.TrimSpace(s[1 : len(s)-1])
		}
	}
	return s
}

// loadEnvFiles loads configuration with priority: non-empty OS env -> backend/.env -> .env
// across common working directories, executable directory, and source root so running via
// `go run cmd/api/main.go`, root binaries, or IDE tasks always locates `backend/.env` without
// letting empty values in a fallback file shadow populated configuration.
func loadEnvFiles() []string {
	candidates := []string{
		"backend/.env",
		".env",
		"../backend/.env",
		"../.env",
		"../../backend/.env",
		"../../.env",
		"../../../backend/.env",
		"../../../.env",
	}

	if exePath, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exePath)
		candidates = append(candidates,
			filepath.Join(exeDir, ".env"),
			filepath.Join(exeDir, "..", ".env"),
			filepath.Join(exeDir, "..", "backend", ".env"),
		)
	}

	if _, callerFile, _, ok := runtime.Caller(0); ok {
		backendRoot := filepath.Clean(filepath.Join(filepath.Dir(callerFile), "..", ".."))
		repoRoot := filepath.Clean(filepath.Join(backendRoot, ".."))
		candidates = append(candidates,
			filepath.Join(backendRoot, ".env"),
			filepath.Join(repoRoot, ".env"),
		)
	}

	seen := make(map[string]struct{})
	var loaded []string

	for _, path := range candidates {
		absPath, absErr := filepath.Abs(path)
		if absErr != nil {
			absPath = filepath.Clean(path)
		}
		if _, dup := seen[absPath]; dup {
			continue
		}
		seen[absPath] = struct{}{}

		envMap, err := godotenv.Read(absPath)
		if err != nil {
			continue
		}
		loaded = append(loaded, absPath)
		for rawKey, rawVal := range envMap {
			k := strings.TrimPrefix(strings.TrimSpace(rawKey), "\ufeff")
			v := cleanEnvValue(rawVal)
			if k == "" || v == "" {
				continue
			}
			if existing, exists := os.LookupEnv(k); !exists || strings.TrimSpace(existing) == "" {
				_ = os.Setenv(k, v)
			}
		}
	}

	return loaded
}

func LoadConfig() (*Config, error) {
	loadedFiles := loadEnvFiles()

	cfg := &Config{
		ServerPort:          getEnv("SERVER_PORT", "8080"),
		ServerEnv:           getEnv("SERVER_ENV", "development"),
		DBHost:              getEnv("DB_HOST", "localhost"),
		DBPort:              getEnv("DB_PORT", "5432"),
		DBUser:              getEnv("DB_USER", "postgres"),
		DBPassword:          getEnv("DB_PASSWORD", "postgres"),
		DBName:              getEnv("DB_NAME", "distribution_management"),
		DBSSLMode:           getEnv("DB_SSLMODE", "disable"),
		JWTSecret:           getEnv("JWT_SECRET", "super-secret-key-change-in-production-min-32-chars-long!"),
		JWTExpirationHours:  getEnvAsInt("JWT_EXPIRATION_HOURS", 24),
		WhatsAppPhoneNumber:   cleanWhatsAppNumber(getEnv("WHATSAPP_STORE_NUMBER", getEnv("WHATSAPP_PHONE_NUMBER", "94766611606"))),
		WhatsAppPrefix:        getEnv("WHATSAPP_MESSAGE_PREFIX", "Hello Sales Team, I would like to confirm my order:"),
		WhatsAppCloudAPIToken:      cleanEnvValue(getEnv("WHATSAPP_CLOUD_API_TOKEN", "")),
		WhatsAppPhoneNumberID:      cleanEnvValue(getEnv("WHATSAPP_PHONE_NUMBER_ID", "")),
		WhatsAppAPIVersion:         cleanEnvValue(getEnv("WHATSAPP_API_VERSION", "v19.0")),
		WhatsAppWebhookVerifyToken: cleanEnvValue(getEnv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "")),
		UploadDir:           getEnv("UPLOAD_DIR", "./uploads"),
		MaxUploadSizeMB:     int64(getEnvAsInt("MAX_UPLOAD_SIZE_MB", 5)),
		CORSAllowedOrigins:  strings.Split(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"), ","),
		SMTPHost:            cleanEnvValue(getEnv("SMTP_HOST", "smtp.gmail.com")),
		SMTPPort:            getEnvAsInt("SMTP_PORT", 587),
		SMTPEmail:           cleanEnvValue(getEnv("SMTP_EMAIL", "")),
		SMTPPassword:        cleanEnvValue(getEnv("SMTP_PASSWORD", "")),
		SMTPFromName:        cleanEnvValue(getEnv("SMTP_FROM_NAME", "Imanya Fancy Goods")),
		LoadedEnvFiles:      loadedFiles,
	}

	return cfg, nil
}

// ValidateSMTPConfig verifies that required SMTP credentials are configured cleanly
func (c *Config) ValidateSMTPConfig() error {
	if strings.TrimSpace(c.SMTPHost) == "" {
		return fmt.Errorf("SMTP_HOST is not configured")
	}
	if c.SMTPPort <= 0 || c.SMTPPort > 65535 {
		return fmt.Errorf("SMTP_PORT must be a valid port number (1-65535)")
	}
	emailTrim := strings.TrimSpace(c.SMTPEmail)
	emailLower := strings.ToLower(emailTrim)
	if emailLower == "" || strings.Contains(emailLower, "yourbusiness") || strings.Contains(emailLower, "example.com") {
		return fmt.Errorf("SMTP_EMAIL is not configured with a valid sender address")
	}
	parsed, err := mail.ParseAddress(emailTrim)
	if err != nil || !strings.EqualFold(parsed.Address, emailTrim) {
		return fmt.Errorf("SMTP_EMAIL is not configured with a valid sender address")
	}
	atIdx := strings.LastIndex(parsed.Address, "@")
	if atIdx <= 0 {
		return fmt.Errorf("SMTP_EMAIL is not configured with a valid sender address")
	}
	domain := parsed.Address[atIdx+1:]
	if !strings.Contains(domain, ".") || strings.HasPrefix(domain, ".") || strings.HasSuffix(domain, ".") {
		return fmt.Errorf("SMTP_EMAIL is not configured with a valid sender address")
	}
	passTrim := strings.TrimSpace(c.SMTPPassword)
	if passTrim == "" || strings.Contains(strings.ToLower(passTrim), "your_google_app_password") {
		return fmt.Errorf("SMTP_PASSWORD is not configured with a valid Gmail App Password")
	}
	return nil
}

// MaskedSMTPEmail returns a redacted representation of the configured sender address for safe logging
func (c *Config) MaskedSMTPEmail() string {
	emailTrim := strings.TrimSpace(c.SMTPEmail)
	atIdx := strings.Index(emailTrim, "@")
	if atIdx <= 0 {
		return "(not configured)"
	}
	local := emailTrim[:atIdx]
	domain := emailTrim[atIdx:]
	if len(local) <= 2 {
		return local[:1] + "***" + domain
	}
	return local[:2] + "***" + domain
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

func cleanWhatsAppNumber(phone string) string {
	clean := strings.ReplaceAll(phone, "+", "")
	clean = strings.ReplaceAll(clean, " ", "")
	clean = strings.ReplaceAll(clean, "-", "")
	clean = strings.ReplaceAll(clean, "(", "")
	clean = strings.ReplaceAll(clean, ")", "")
	clean = strings.ReplaceAll(clean, "[", "")
	clean = strings.ReplaceAll(clean, "]", "")
	clean = strings.TrimSpace(clean)
	// Guard against duplicated country codes (e.g. 9494...)
	for strings.HasPrefix(clean, "9494") {
		clean = clean[2:]
	}
	// If 10-digit Sri Lankan number starting with 0 (e.g. 0766611606), convert to 94766611606
	if strings.HasPrefix(clean, "0") && len(clean) == 10 {
		clean = "94" + clean[1:]
	}
	return clean
}
