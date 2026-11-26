package storage

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/textproto"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func buildMultipartFileHeader(t *testing.T, filename, contentType string, content []byte) *multipart.FileHeader {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", `form-data; name="photo"; filename="`+filename+`"`)
	h.Set("Content-Type", contentType)

	part, err := writer.CreatePart(h)
	if err != nil {
		t.Fatalf("CreatePart failed: %v", err)
	}
	if _, err := part.Write(content); err != nil {
		t.Fatalf("part.Write failed: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("writer.Close failed: %v", err)
	}

	reader := multipart.NewReader(&body, writer.Boundary())
	form, err := reader.ReadForm(int64(len(content)) + 4096)
	if err != nil {
		t.Fatalf("ReadForm failed: %v", err)
	}
	files := form.File["photo"]
	if len(files) == 0 {
		t.Fatal("expected 1 file in form")
	}
	return files[0]
}

func makeValidPNG(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 4, 4))
	img.Set(0, 0, color.RGBA{R: 44, G: 98, B: 145, A: 255})
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("png.Encode failed: %v", err)
	}
	return buf.Bytes()
}

func TestDiskStorageSaveAndDeleteImage(t *testing.T) {
	tmpDir := t.TempDir()
	store, err := NewDiskStorage(tmpDir, 5)
	if err != nil {
		t.Fatalf("NewDiskStorage failed: %v", err)
	}

	// 1. Valid PNG upload
	pngBytes := makeValidPNG(t)
	fh := buildMultipartFileHeader(t, "avatar.png", "image/png", pngBytes)
	urlPath, err := store.SaveImage(fh)
	if err != nil {
		t.Fatalf("expected valid PNG upload to succeed, got: %v", err)
	}
	if !strings.HasPrefix(urlPath, "/uploads/") || !strings.HasSuffix(urlPath, ".png") {
		t.Fatalf("unexpected upload URL path: %s", urlPath)
	}

	savedFilename := strings.TrimPrefix(urlPath, "/uploads/")
	if _, err := os.Stat(filepath.Join(tmpDir, savedFilename)); err != nil {
		t.Fatalf("expected file to exist on disk: %v", err)
	}

	// 2. Spoofed executable / text disguised as .jpg must be rejected
	spoofed := buildMultipartFileHeader(t, "evil.jpg", "image/jpeg", []byte("#!/bin/sh\necho pwned\n"))
	if _, err := store.SaveImage(spoofed); err == nil {
		t.Fatal("expected spoofed executable file to be rejected")
	}

	// 3. Oversized file (> 5MB) must be rejected
	oversized := make([]byte, 6*1024*1024)
	copy(oversized, pngBytes)
	oversizedHeader := buildMultipartFileHeader(t, "huge.png", "image/png", oversized)
	if _, err := store.SaveImage(oversizedHeader); err == nil {
		t.Fatal("expected oversized image to be rejected")
	}

	// 4. Path traversal in DeleteImage must be blocked
	if err := store.DeleteImage("/uploads/../../etc/passwd"); err == nil {
		t.Fatal("expected path traversal in DeleteImage to be rejected")
	}

	// 5. Valid DeleteImage removes file cleanly
	if err := store.DeleteImage(urlPath); err != nil {
		t.Fatalf("expected DeleteImage to succeed, got: %v", err)
	}
	if _, err := os.Stat(filepath.Join(tmpDir, savedFilename)); !os.IsNotExist(err) {
		t.Fatal("expected deleted file to no longer exist on disk")
	}
}
