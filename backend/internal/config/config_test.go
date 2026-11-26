package config_test

import (
	"os"
	"path/filepath"
	"testing"

	"distribution-management/internal/config"
)

func TestValidateSMTPConfig(t *testing.T) {
	tests := []struct {
		name    string
		cfg     config.Config
		wantErr bool
	}{
		{
			name: "valid gmail smtp config",
			cfg: config.Config{
				SMTPHost:     "smtp.gmail.com",
				SMTPPort:     587,
				SMTPEmail:    "store.sender@gmail.com",
				SMTPPassword: "abcdabcdabcdabcd",
			},
			wantErr: false,
		},
		{
			name: "empty smtp email",
			cfg: config.Config{
				SMTPHost:     "smtp.gmail.com",
				SMTPPort:     587,
				SMTPEmail:    "",
				SMTPPassword: "abcdabcdabcdabcd",
			},
			wantErr: true,
		},
		{
			name: "invalid email syntax",
			cfg: config.Config{
				SMTPHost:     "smtp.gmail.com",
				SMTPPort:     587,
				SMTPEmail:    "not-an-email-address",
				SMTPPassword: "abcdabcdabcdabcd",
			},
			wantErr: true,
		},
		{
			name: "email missing domain dot",
			cfg: config.Config{
				SMTPHost:     "smtp.gmail.com",
				SMTPPort:     587,
				SMTPEmail:    "sender@localhost",
				SMTPPassword: "abcdabcdabcdabcd",
			},
			wantErr: true,
		},
		{
			name: "placeholder email rejected",
			cfg: config.Config{
				SMTPHost:     "smtp.gmail.com",
				SMTPPort:     587,
				SMTPEmail:    "yourbusiness@gmail.com",
				SMTPPassword: "abcdabcdabcdabcd",
			},
			wantErr: true,
		},
		{
			name: "empty password rejected",
			cfg: config.Config{
				SMTPHost:     "smtp.gmail.com",
				SMTPPort:     587,
				SMTPEmail:    "store.sender@gmail.com",
				SMTPPassword: "",
			},
			wantErr: true,
		},
		{
			name: "invalid port rejected",
			cfg: config.Config{
				SMTPHost:     "smtp.gmail.com",
				SMTPPort:     99999,
				SMTPEmail:    "store.sender@gmail.com",
				SMTPPassword: "abcdabcdabcdabcd",
			},
			wantErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.cfg.ValidateSMTPConfig()
			if tc.wantErr && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestLoadConfig_BackendEnvPrecedesEmptyRootEnv(t *testing.T) {
	origWD, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		_ = os.Chdir(origWD)
	}()

	for _, key := range []string{"SMTP_HOST", "SMTP_PORT", "SMTP_EMAIL", "SMTP_PASSWORD", "SMTP_FROM_NAME"} {
		prev, existed := os.LookupEnv(key)
		_ = os.Unsetenv(key)
		k := key
		t.Cleanup(func() {
			if existed {
				_ = os.Setenv(k, prev)
			} else {
				_ = os.Unsetenv(k)
			}
		})
	}

	tmpDir := t.TempDir()
	backendDir := filepath.Join(tmpDir, "backend")
	if err := os.MkdirAll(backendDir, 0o755); err != nil {
		t.Fatal(err)
	}

	// Root .env has empty SMTP_EMAIL/SMTP_PASSWORD; backend/.env has valid values
	if err := os.WriteFile(filepath.Join(tmpDir, ".env"), []byte("SMTP_HOST=smtp.gmail.com\nSMTP_PORT=587\nSMTP_EMAIL=\nSMTP_PASSWORD=\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(backendDir, ".env"), []byte("SMTP_HOST=smtp.gmail.com\nSMTP_PORT=587\nSMTP_EMAIL=store@imanya.lk\nSMTP_PASSWORD=secret-app-pw\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := os.Chdir(tmpDir); err != nil {
		t.Fatal(err)
	}

	cfg, err := config.LoadConfig()
	if err != nil {
		t.Fatalf("LoadConfig failed: %v", err)
	}
	if cfg.SMTPEmail != "store@imanya.lk" {
		t.Fatalf("expected backend/.env SMTP_EMAIL to load cleanly, got %q", cfg.SMTPEmail)
	}
	if cfg.SMTPPassword != "secret-app-pw" {
		t.Fatalf("expected backend/.env SMTP_PASSWORD to load cleanly")
	}
	if masked := cfg.MaskedSMTPEmail(); masked != "st***@imanya.lk" {
		t.Fatalf("unexpected masked email: %q", masked)
	}
}
