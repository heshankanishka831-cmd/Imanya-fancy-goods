package storage

import (
	"errors"
	"fmt"
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

	// Reset seek pointer to beginning
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
