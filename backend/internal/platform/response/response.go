package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Envelope struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Meta    interface{} `json:"meta,omitempty"`
	Error   *ErrorData  `json:"error,omitempty"`
}

type ErrorData struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

type PaginationMeta struct {
	CurrentPage int   `json:"current_page"`
	PerPage     int   `json:"per_page"`
	TotalItems  int64 `json:"total_items"`
	TotalPages  int   `json:"total_pages"`
}

func Success(c *gin.Context, statusCode int, data interface{}) {
	c.JSON(statusCode, Envelope{
		Success: true,
		Data:    data,
	})
}

func SuccessWithMeta(c *gin.Context, statusCode int, data interface{}, meta interface{}) {
	c.JSON(statusCode, Envelope{
		Success: true,
		Data:    data,
		Meta:    meta,
	})
}

func Error(c *gin.Context, statusCode int, code string, message string, details ...interface{}) {
	var detailData interface{}
	if len(details) > 0 {
		detailData = details[0]
	}

	c.JSON(statusCode, Envelope{
		Success: false,
		Error: &ErrorData{
			Code:    code,
			Message: message,
			Details: detailData,
		},
	})
}

func BadRequest(c *gin.Context, message string, details ...interface{}) {
	Error(c, http.StatusBadRequest, "BAD_REQUEST", message, details...)
}

func Unauthorized(c *gin.Context, message string) {
	Error(c, http.StatusUnauthorized, "UNAUTHORIZED", message)
}

func Forbidden(c *gin.Context, message string) {
	Error(c, http.StatusForbidden, "FORBIDDEN", message)
}

func NotFound(c *gin.Context, message string) {
	Error(c, http.StatusNotFound, "NOT_FOUND", message)
}

func Conflict(c *gin.Context, message string) {
	Error(c, http.StatusConflict, "CONFLICT", message)
}

func InternalServerError(c *gin.Context, message string) {
	Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", message)
}
