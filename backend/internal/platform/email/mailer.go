package email

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/tls"
	"encoding/hex"
	"errors"
	"fmt"
	"net"
	"net/mail"
	"net/smtp"
	"strings"
	"time"

	"distribution-management/internal/config"
)

// EmailSender defines email delivery behavior cleanly for production SMTP and testing
type EmailSender interface {
	Send(ctx context.Context, to, subject, htmlBody, textBody string) error
	ValidateConfig() error
}

type smtpMailer struct {
	cfg *config.Config
}

func NewSMTPMailer(cfg *config.Config) EmailSender {
	return &smtpMailer{cfg: cfg}
}

func (m *smtpMailer) ValidateConfig() error {
	if m.cfg == nil {
		return errors.New("email configuration is missing")
	}
	return m.cfg.ValidateSMTPConfig()
}

func sanitizeHeader(val string) string {
	val = strings.ReplaceAll(val, "\r", "")
	val = strings.ReplaceAll(val, "\n", "")
	return strings.TrimSpace(val)
}

func generateBoundary() string {
	b := make([]byte, 12)
	_, _ = rand.Read(b)
	return "imanya_" + hex.EncodeToString(b)
}

// BuildMIMEMessage constructs a standards-compliant multipart/alternative email payload
func BuildMIMEMessage(fromName, fromEmail, to, subject, htmlBody, textBody string) []byte {
	boundary := generateBoundary()
	cleanFromName := sanitizeHeader(fromName)
	cleanFromEmail := sanitizeHeader(fromEmail)
	cleanTo := sanitizeHeader(to)
	cleanSubject := sanitizeHeader(subject)

	var buf bytes.Buffer
	buf.WriteString(fmt.Sprintf("From: %s <%s>\r\n", cleanFromName, cleanFromEmail))
	buf.WriteString(fmt.Sprintf("To: %s\r\n", cleanTo))
	buf.WriteString(fmt.Sprintf("Subject: %s\r\n", cleanSubject))
	buf.WriteString(fmt.Sprintf("Date: %s\r\n", time.Now().UTC().Format(time.RFC1123Z)))
	buf.WriteString("MIME-Version: 1.0\r\n")
	buf.WriteString(fmt.Sprintf("Content-Type: multipart/alternative; boundary=\"%s\"\r\n", boundary))
	buf.WriteString("\r\n")

	// Plain-text fallback
	buf.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	buf.WriteString("Content-Type: text/plain; charset=\"UTF-8\"\r\n")
	buf.WriteString("Content-Transfer-Encoding: 8bit\r\n\r\n")
	buf.WriteString(textBody)
	buf.WriteString("\r\n\r\n")

	// Branded HTML content
	buf.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	buf.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	buf.WriteString("Content-Transfer-Encoding: 8bit\r\n\r\n")
	buf.WriteString(htmlBody)
	buf.WriteString("\r\n\r\n")

	buf.WriteString(fmt.Sprintf("--%s--\r\n", boundary))
	return buf.Bytes()
}

func (m *smtpMailer) Send(ctx context.Context, to, subject, htmlBody, textBody string) error {
	if err := m.ValidateConfig(); err != nil {
		return fmt.Errorf("email service is not configured: %w", err)
	}

	toAddr := sanitizeHeader(to)
	parsedTo, parseErr := mail.ParseAddress(toAddr)
	if parseErr != nil || !strings.EqualFold(parsedTo.Address, toAddr) || !strings.Contains(toAddr, "@") {
		return errors.New("invalid recipient email address")
	}
	toDomain := toAddr[strings.LastIndex(toAddr, "@")+1:]
	if !strings.Contains(toDomain, ".") || strings.HasPrefix(toDomain, ".") || strings.HasSuffix(toDomain, ".") {
		return errors.New("invalid recipient email address")
	}

	host := strings.TrimSpace(m.cfg.SMTPHost)
	port := m.cfg.SMTPPort
	addr := fmt.Sprintf("%s:%d", host, port)

	fromName := m.cfg.SMTPFromName
	if strings.TrimSpace(fromName) == "" {
		fromName = "Imanya Fancy Goods"
	}

	fromAddr := sanitizeHeader(m.cfg.SMTPEmail)
	smtpPassword := strings.TrimSpace(m.cfg.SMTPPassword)
	// Normalize Google App Password spaces ("abcd efgh ijkl mnop" -> 16-char token) for Gmail SMTP
	if strings.Contains(strings.ToLower(host), "gmail.com") && len(strings.ReplaceAll(smtpPassword, " ", "")) == 16 {
		smtpPassword = strings.ReplaceAll(smtpPassword, " ", "")
	}

	msg := BuildMIMEMessage(fromName, fromAddr, toAddr, subject, htmlBody, textBody)

	dialer := &net.Dialer{Timeout: 12 * time.Second}
	var conn net.Conn
	var err error

	tlsCfg := &tls.Config{
		ServerName: host,
		MinVersion: tls.VersionTLS12,
	}

	if port == 465 {
		conn, err = tls.DialWithDialer(dialer, "tcp", addr, tlsCfg)
	} else {
		conn, err = dialer.DialContext(ctx, "tcp", addr)
	}
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server (%s): %w", addr, err)
	}
	defer conn.Close()

	_ = conn.SetDeadline(time.Now().Add(20 * time.Second))

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("failed to initialize SMTP client: %w", err)
	}
	defer client.Close()

	if port != 465 {
		if ok, _ := client.Extension("STARTTLS"); ok {
			if err := client.StartTLS(tlsCfg); err != nil {
				return fmt.Errorf("SMTP STARTTLS handshake failed: %w", err)
			}
		} else {
			return errors.New("SMTP server does not support STARTTLS encryption")
		}
	}

	auth := smtp.PlainAuth("", fromAddr, smtpPassword, host)
	if err := client.Auth(auth); err != nil {
		return errors.New("SMTP authentication failed: please verify SMTP_EMAIL and your Google App Password in backend/.env")
	}

	if err := client.Mail(fromAddr); err != nil {
		return fmt.Errorf("SMTP MAIL FROM failed: %w", err)
	}
	if err := client.Rcpt(toAddr); err != nil {
		return fmt.Errorf("SMTP RCPT TO rejected: %w", err)
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("SMTP DATA command failed: %w", err)
	}
	if _, err := w.Write(msg); err != nil {
		_ = w.Close()
		return fmt.Errorf("failed writing email payload: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("failed committing email payload: %w", err)
	}

	_ = client.Quit()
	return nil
}
