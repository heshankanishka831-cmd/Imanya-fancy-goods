package service

import (
	"context"
	"encoding/json"

	"wholesale-management/internal/audit/model"
	"wholesale-management/internal/audit/repository"
	"wholesale-management/internal/platform/logger"

	"gorm.io/datatypes"
)

type AuditService interface {
	LogAction(ctx context.Context, userID *string, action, entityName, entityID string, oldVal, newVal interface{}, ip, userAgent string)
	ListLogs(ctx context.Context, entityName string, page, limit int) ([]model.AuditLog, int64, error)
}

type auditService struct {
	repo repository.AuditRepository
}

func NewAuditService(repo repository.AuditRepository) AuditService {
	return &auditService{repo: repo}
}

func (s *auditService) LogAction(ctx context.Context, userID *string, action, entityName, entityID string, oldVal, newVal interface{}, ip, userAgent string) {
	// Execute safely; never panic or fail the parent request
	go func() {
		defer func() {
			if r := recover(); r != nil {
				logger.Log.Errorf("Panic in async audit logger: %v", r)
			}
		}()

		var oldJSON, newJSON datatypes.JSON
		if oldVal != nil {
			if b, err := json.Marshal(oldVal); err == nil {
				oldJSON = b
			}
		}
		if newVal != nil {
			if b, err := json.Marshal(newVal); err == nil {
				newJSON = b
			}
		}

		entry := &model.AuditLog{
			UserID:     userID,
			Action:     action,
			EntityName: entityName,
			EntityID:   entityID,
			OldValues:  oldJSON,
			NewValues:  newJSON,
			IPAddress:  ip,
			UserAgent:  userAgent,
		}

		if err := s.repo.Create(context.Background(), entry); err != nil {
			logger.Log.Errorf("Failed to persist audit log: %v", err)
		}
	}()
}

func (s *auditService) ListLogs(ctx context.Context, entityName string, page, limit int) ([]model.AuditLog, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit
	return s.repo.List(ctx, entityName, limit, offset)
}
