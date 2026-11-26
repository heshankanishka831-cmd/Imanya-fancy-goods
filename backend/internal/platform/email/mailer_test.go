package email_test

import (
	"context"
	"strings"
	"testing"

	"distribution-management/internal/config"
	"distribution-management/internal/platform/email"
)

func TestBuildOTPEmailContent(t *testing.T) {
	subj, htmlBody, textBody := email.BuildOTPEmailContent("Imanya Fancy Goods", "Sunil Perera", "482910", email.PurposeRegister, 5)

	if !strings.Contains(subj, "Verification") {
		t.Errorf("expected verification subject, got %s", subj)
	}
	if !strings.Contains(htmlBody, "482910") || !strings.Contains(htmlBody, "5 minutes") || !strings.Contains(htmlBody, "Never share") {
		t.Error("HTML email missing required OTP, expiration, or security warning")
	}
	if !strings.Contains(textBody, "482910") || !strings.Contains(textBody, "5 minutes") || !strings.Contains(textBody, "Never share") {
		t.Error("Text email fallback missing required OTP, expiration, or security warning")
	}
}

func TestBuildMIMEMessage_StripsHeaderInjection(t *testing.T) {
	raw := string(email.BuildMIMEMessage("Imanya", "sender@gmail.com", "user@gmail.com\r\nBcc: evil@attacker.com", "Verify\nCc: bad@attacker.com", "<p>Hi</p>", "Hi"))

	if strings.Contains(raw, "\r\nBcc:") || strings.Contains(raw, "Verify\nCc:") {
		t.Fatalf("header injection was not sanitized cleanly: %s", raw)
	}
	if !strings.Contains(raw, "multipart/alternative") {
		t.Error("expected multipart/alternative MIME content type")
	}
}

func TestSMTPMailer_RejectsMissingCredentials(t *testing.T) {
	cfg := &config.Config{
		SMTPHost:     "smtp.gmail.com",
		SMTPPort:     587,
		SMTPEmail:    "yourbusiness@gmail.com",
		SMTPPassword: "your_google_app_password",
	}
	mailer := email.NewSMTPMailer(cfg)
	err := mailer.Send(context.Background(), "customer@gmail.com", "Test", "<p>Hi</p>", "Hi")
	if err == nil {
		t.Fatal("expected placeholder SMTP credentials to fail validation before connecting")
	}
}

func TestSMTPMailer_ValidatesRecipientBeforeDialing(t *testing.T) {
	cfg := &config.Config{
		SMTPHost:     "smtp.gmail.com",
		SMTPPort:     587,
		SMTPEmail:    "business@gmail.com",
		SMTPPassword: "abcdabcdabcdabcd",
	}
	mailer := email.NewSMTPMailer(cfg)
	err := mailer.Send(context.Background(), "invalid-recipient", "Test", "<p>Hi</p>", "Hi")
	if err == nil || !strings.Contains(err.Error(), "invalid recipient email address") {
		t.Fatalf("expected invalid recipient email address error, got %v", err)
	}
}

func TestBuildMIMEMessage_SeparatesSenderAndDynamicCustomerRecipients(t *testing.T) {
	systemSender := "business@gmail.com"
	for _, recipient := range []string{"abc@gmail.com", "xyz@yahoo.com", "customer@outlook.com"} {
		raw := string(email.BuildMIMEMessage("Imanya Fancy Goods", systemSender, recipient, "Verify Your Email Address", "<p>123456</p>", "123456"))
		if !strings.Contains(raw, "From: Imanya Fancy Goods <business@gmail.com>") {
			t.Fatalf("missing system sender From header for %s: %s", recipient, raw)
		}
		if !strings.Contains(raw, "To: "+recipient) {
			t.Fatalf("missing dynamic To header for %s: %s", recipient, raw)
		}
	}
}
