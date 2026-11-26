package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	customerRepo "distribution-management/internal/customers/repository"
	"distribution-management/internal/loyalty/dto"
	"distribution-management/internal/loyalty/service"
	"distribution-management/internal/platform/middleware"
	"distribution-management/internal/platform/response"

	"github.com/gin-gonic/gin"
)

type LoyaltyHandler struct {
	loyaltyService service.LoyaltyService
	customerRepo   customerRepo.CustomerRepository
}

func NewLoyaltyHandler(loyaltyService service.LoyaltyService, customerRepo customerRepo.CustomerRepository) *LoyaltyHandler {
	return &LoyaltyHandler{
		loyaltyService: loyaltyService,
		customerRepo:   customerRepo,
	}
}

// GetMyMembership retrieves the authenticated customer's loyalty profile
func (h *LoyaltyHandler) GetMyMembership(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	customer, err := h.customerRepo.GetByUserID(c.Request.Context(), userID)
	if err != nil || customer == nil {
		// Provide default starting Bronze membership profile for authenticated user
		user, uErr := h.customerRepo.GetUserByID(c.Request.Context(), userID)
		name := "Valued Customer"
		if uErr == nil && user != nil {
			name = strings.TrimSpace(user.FirstName + " " + user.LastName)
			if name == "" {
				name = user.Username
			}
		}

		settings, _ := h.loyaltyService.GetSettings(c.Request.Context())
		var silverSpend float64 = 100000
		if settings != nil {
			for _, t := range settings.Tiers {
				if t.TierName == "SILVER" {
					silverSpend = t.MinSpend
				}
			}
		}

		nextTier := "SILVER"
		response.Success(c, http.StatusOK, &dto.CustomerMembershipResponse{
			CustomerID:          userID,
			CustomerName:        name,
			CurrentTier:         "BRONZE",
			LifetimeSpent:       0.0,
			EligibleOrdersCount: 0,
			NextTier:            &nextTier,
			NextTierMinSpend:    &silverSpend,
			RemainingForNextTier: silverSpend,
			ProgressPercentage:  0.0,
			IsHighestTier:       false,
			TierMessage:         fmt.Sprintf("Spend Rs. %.0f more on eligible customer orders to reach Silver status!", silverSpend),
		})
		return
	}

	membership, err := h.loyaltyService.GetCustomerMembership(c.Request.Context(), customer.ID)
	if err != nil {
		response.InternalServerError(c, "Failed to load membership details")
		return
	}

	response.Success(c, http.StatusOK, membership)
}

// GetSettings returns all loyalty tier settings
func (h *LoyaltyHandler) GetSettings(c *gin.Context) {
	settings, err := h.loyaltyService.GetSettings(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, "Failed to load loyalty settings")
		return
	}
	response.Success(c, http.StatusOK, settings)
}

// UpdateSettings updates loyalty thresholds and automatically recalculates all customer tiers
func (h *LoyaltyHandler) UpdateSettings(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	var req dto.UpdateThresholdsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid threshold values", err.Error())
		return
	}

	updated, err := h.loyaltyService.UpdateThresholds(c.Request.Context(), userID, &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, http.StatusOK, updated)
}

// GetStats returns counts per membership tier and overall customer count
func (h *LoyaltyHandler) GetStats(c *gin.Context) {
	stats, err := h.loyaltyService.GetMembershipStats(c.Request.Context())
	if err != nil {
		response.InternalServerError(c, "Failed to fetch membership statistics")
		return
	}
	response.Success(c, http.StatusOK, stats)
}

// ListCustomers lists customers with tier filtering, search, and sorting
func (h *LoyaltyHandler) ListCustomers(c *gin.Context) {
	tier := c.Query("tier")
	search := c.Query("search")
	sortBy := c.DefaultQuery("sort_by", "lifetime_spent")
	order := c.DefaultQuery("order", "DESC")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	list, total, err := h.loyaltyService.ListCustomers(c.Request.Context(), tier, search, sortBy, order, page, limit)
	if err != nil {
		response.InternalServerError(c, "Failed to load customers")
		return
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))
	meta := response.PaginationMeta{
		CurrentPage: page,
		PerPage:     limit,
		TotalItems:  total,
		TotalPages:  totalPages,
	}

	response.SuccessWithMeta(c, http.StatusOK, list, meta)
}

// RecalculateCustomer recalculates eligible spend and tier for a given customer
func (h *LoyaltyHandler) RecalculateCustomer(c *gin.Context) {
	customerID := c.Param("id")
	res, err := h.loyaltyService.RecalculateCustomer(c.Request.Context(), customerID)
	if err != nil {
		response.InternalServerError(c, "Failed to recalculate customer membership: "+err.Error())
		return
	}
	response.Success(c, http.StatusOK, res)
}
