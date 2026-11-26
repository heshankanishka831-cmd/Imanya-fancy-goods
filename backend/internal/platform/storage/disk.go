package storage

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

type DiskStorage struct {
	UploadDir     string
	MaxSizeBytes  int64
	AllowedTypes  map[string]string // Content-Type -> Extension
}

func NewDiskStorage(uploadDir string, maxSizeMB int64) (*DiskStorage, error) {
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory %s: %w", uploadDir, err)
	}

	return &DiskStorage{
		UploadDir:    uploadDir,
		MaxSizeBytes: maxSizeMB * 1024 * 1024,
		AllowedTypes: map[string]string{
			"image/jpeg": ".jpg",
			"image/png":  ".png",
			"image/webp": ".webp",
		},
	}, nil
}

func (s *DiskStorage) SaveImage(fileHeader *multipart.FileHeader) (string, error) {
	if fileHeader.Size > s.MaxSizeBytes {
		return "", fmt.Errorf("file size exceeds maximum allowed size of %d MB", s.MaxSizeBytes/(1024*1024))
	}

	src, err := fileHeader.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Sniff first 512 bytes for genuine MIME type
	buffer := make([]byte, 512)
	n, err := src.Read(buffer)
	if err != nil && err != io.EOF {
		return "", fmt.Errorf("failed to inspect file header: %w", err)
	}

	contentType := http.DetectContentType(buffer[:n])
	ext, allowed := s.AllowedTypes[contentType]
	if !allowed {
		return "", errors.New("unsupported file format. Allowed formats: JPEG, PNG, WEBP")
	}

	// Reset seek pointer to beginning and verify actual image content (not just magic bytes/extension)
	if _, err := src.Seek(0, io.SeekStart); err != nil {
		return "", fmt.Errorf("failed to reset file pointer: %w", err)
	}

	if err := validateDecodedImage(src, contentType); err != nil {
		return "", err
	}

	// Reset seek pointer to beginning for copying
	if _, err := src.Seek(0, io.SeekStart); err != nil {
		return "", fmt.Errorf("failed to reset file pointer: %w", err)
	}

	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	targetPath := filepath.Join(s.UploadDir, filename)

	dst, err := os.Create(targetPath)
	if err != nil {
		return "", fmt.Errorf("failed to create destination file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return "", fmt.Errorf("failed to save file contents: %w", err)
	}

	return fmt.Sprintf("/uploads/%s", strings.ReplaceAll(filename, "\\", "/")), nil
}

// DeleteImage safely deletes a previously uploaded image given its public /uploads/... URL.
// Prevents path traversal by ensuring the resolved target stays strictly inside UploadDir.
func (s *DiskStorage) DeleteImage(publicURL string) error {
	trimmed := strings.TrimSpace(publicURL)
	if trimmed == "" || !strings.HasPrefix(trimmed, "/uploads/") {
		return nil
	}
	rel := strings.TrimPrefix(trimmed, "/uploads/")
	if rel == "" || strings.Contains(rel, "..") || strings.ContainsAny(rel, "/\\") {
		return errors.New("invalid upload path")
	}

	absDir, err := filepath.Abs(s.UploadDir)
	if err != nil {
		return err
	}
	target := filepath.Join(absDir, rel)
	if !strings.HasPrefix(target, absDir+string(os.PathSeparator)) {
		return errors.New("path traversal blocked")
	}

	if err := os.Remove(target); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func validateDecodedImage(r io.Reader, contentType string) error {
	switch contentType {
	case "image/jpeg", "image/png":
		cfg, format, err := image.DecodeConfig(r)
		if err != nil || cfg.Width <= 0 || cfg.Height <= 0 {
			return errors.New("invalid or corrupted image file")
		}
		if (contentType == "image/jpeg" && format != "jpeg") || (contentType == "image/png" && format != "png") {
			return errors.New("image content does not match declared format")
		}
		return nil
	case "image/webp":
		header := make([]byte, 16)
		n, err := io.ReadFull(r, header)
		if err != nil || n < 16 {
			return errors.New("invalid or corrupted WebP image")
		}
		// RIFF <4-byte size> WEBP VP8?/VP8L/VP8X
		if !bytes.Equal(header[0:4], []byte("RIFF")) || !bytes.Equal(header[8:12], []byte("WEBP")) {
			return errors.New("invalid or corrupted WebP image")
		}
		chunk := string(header[12:16])
		if chunk != "VP8 " && chunk != "VP8L" && chunk != "VP8X" {
			return errors.New("unsupported or corrupted WebP bitstream")
		}
		return nil
	default:
		return errors.New("unsupported image format")
	}
}
