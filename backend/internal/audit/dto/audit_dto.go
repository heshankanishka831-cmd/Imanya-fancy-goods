package dto

import "time"

type AuditLogResponse struct {
	ID         string      `json:"id"`
	UserID     *string     `json:"user_id"`
	Action     string      `json:"action"`
	EntityName string      `json:"entity_name"`
	EntityID   string      `json:"entity_id"`
	OldValues  interface{} `json:"old_values"`
	NewValues  interface{} `json:"new_values"`
	IPAddress  string      `json:"ip_address"`
	UserAgent  string      `json:"user_agent"`
	CreatedAt  time.Time   `json:"created_at"`
}
