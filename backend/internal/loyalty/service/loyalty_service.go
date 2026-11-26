package service

import (
	"context"
	"errors"
	"fmt"
	"math"

	auditService "distribution-management/internal/audit/service"
	"distribution-management/internal/loyalty/dto"
	"distribution-management/internal/loyalty/model"
	"distribution-management/internal/loyalty/repository"
)

type LoyaltyService interface {
	GetSettings(ctx context.Context) (*dto.LoyaltySettingsResponse, error)
	UpdateThresholds(ctx context.Context, actorID string, req *dto.UpdateThresholdsRequest, ip, ua string) (*dto.LoyaltySettingsResponse, error)
	RecalculateCustomer(ctx context.Context, customerID string) (*dto.CustomerMembershipResponse, error)
	GetCustomerMembership(ctx context.Context, customerID string) (*dto.CustomerMembershipResponse, error)
	GetMembershipStats(ctx context.Context) (*dto.MembershipStatsResponse, error)
	ListCustomers(ctx context.Context, tier string, search string, sortBy string, order string, page, limit int) ([]dto.MembershipCustomerItemDTO, int64, error)
}

type loyaltyService struct {
	repo         repository.LoyaltyRepository
	auditService auditService.AuditService
}

func NewLoyaltyService(repo repository.LoyaltyRepository, auditService auditService.AuditService) LoyaltyService {
	return &loyaltyService{
		repo:         repo,
		auditService: auditService,
	}
}

func (s *loyaltyService) GetSettings(ctx context.Context) (*dto.LoyaltySettingsResponse, error) {
	settings, err := s.repo.GetSettings(ctx)
	if err != nil {
		return nil, err
	}

	var tierDTOs []dto.LoyaltyTierSettingDTO
	for _, setting := range settings {
		tierDTOs = append(tierDTOs, dto.LoyaltyTierSettingDTO{
			TierName:    setting.TierName,
			MinSpend:    setting.MinSpend,
			Description: setting.Description,
			SortOrder:   setting.SortOrder,
		})
	}

	return &dto.LoyaltySettingsResponse{Tiers: tierDTOs}, nil
}

func (s *loyaltyService) UpdateThresholds(ctx context.Context, actorID string, req *dto.UpdateThresholdsRequest, ip, ua string) (*dto.LoyaltySettingsResponse, error) {
	// Strict validation: 0 < Silver < Gold < Platinum
	if req.SilverMinSpend <= 0 {
		return nil, errors.New("Silver tier threshold must be greater than 0")
	}
	if req.GoldMinSpend <= req.SilverMinSpend {
		return nil, fmt.Errorf("Gold tier threshold (Rs. %.0f) must be strictly greater than Silver (Rs. %.0f)", req.GoldMinSpend, req.SilverMinSpend)
	}
	if req.PlatinumMinSpend <= req.GoldMinSpend {
		return nil, fmt.Errorf("Platinum tier threshold (Rs. %.0f) must be strictly greater than Gold (Rs. %.0f)", req.PlatinumMinSpend, req.GoldMinSpend)
	}

	oldSettings, _ := s.repo.GetSettings(ctx)

	if err := s.repo.UpdateThresholds(ctx, req.SilverMinSpend, req.GoldMinSpend, req.PlatinumMinSpend); err != nil {
		return nil, fmt.Errorf("failed to save tier thresholds: %w", err)
	}

	// Fetch updated settings
	updatedSettings, err := s.repo.GetSettings(ctx)
	if err != nil {
		return nil, err
	}

	// Recalculate all customer ranks automatically
	if err := s.repo.RecalculateAll(ctx, updatedSettings); err != nil {
		return nil, fmt.Errorf("thresholds saved but failed to recalculate customers: %w", err)
	}

	s.auditService.LogAction(ctx, &actorID, "UPDATE_LOYALTY_THRESHOLDS", "loyalty_settings", "GLOBAL", oldSettings, updatedSettings, ip, ua)

	return s.GetSettings(ctx)
}

func (s *loyaltyService) RecalculateCustomer(ctx context.Context, customerID string) (*dto.CustomerMembershipResponse, error) {
	settings, err := s.repo.GetSettings(ctx)
	if err != nil {
		return nil, err
	}

	spend, orderCount, err := s.repo.CalculateCustomerEligibleSpend(ctx, customerID)
	if err != nil {
		return nil, err
	}

	tier := model.DetermineTier(spend, settings)

	if err := s.repo.UpdateCustomerTierAndSpend(ctx, customerID, tier, spend); err != nil {
		return nil, err
	}

	name, _, _, _ := s.repo.GetCustomer(ctx, customerID)

	return s.buildMembershipResponse(customerID, name, tier, spend, orderCount, settings), nil
}

func (s *loyaltyService) GetCustomerMembership(ctx context.Context, customerID string) (*dto.CustomerMembershipResponse, error) {
	// Always sync with live order spend
	return s.RecalculateCustomer(ctx, customerID)
}

func (s *loyaltyService) GetMembershipStats(ctx context.Context) (*dto.MembershipStatsResponse, error) {
	return s.repo.GetMembershipStats(ctx)
}

func (s *loyaltyService) ListCustomers(ctx context.Context, tier string, search string, sortBy string, order string, page, limit int) ([]dto.MembershipCustomerItemDTO, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	return s.repo.ListCustomers(ctx, tier, search, sortBy, order, limit, offset)
}

func (s *loyaltyService) buildMembershipResponse(
	customerID string,
	customerName string,
	currentTier string,
	lifetimeSpent float64,
	orderCount int64,
	settings []model.LoyaltySetting,
) *dto.CustomerMembershipResponse {
	// Find thresholds
	var silverSpend, goldSpend, platinumSpend float64 = 100000, 500000, 1000000
	for _, set := range settings {
		switch set.TierName {
		case model.TierSilver:
			silverSpend = set.MinSpend
		case model.TierGold:
			goldSpend = set.MinSpend
		case model.TierPlatinum:
			platinumSpend = set.MinSpend
		}
	}

	resp := &dto.CustomerMembershipResponse{
		CustomerID:          customerID,
		CustomerName:        customerName,
		CurrentTier:         currentTier,
		LifetimeSpent:       lifetimeSpent,
		EligibleOrdersCount: orderCount,
	}

	switch currentTier {
	case model.TierBronze:
		nextTier := model.TierSilver
		nextSpend := silverSpend
		remaining := math.Max(0, silverSpend-lifetimeSpent)
		progress := math.Min(100.0, math.Max(0.0, (lifetimeSpent/silverSpend)*100.0))

		resp.NextTier = &nextTier
		resp.NextTierMinSpend = &nextSpend
		resp.RemainingForNextTier = remaining
		resp.ProgressPercentage = math.Round(progress*10) / 10
		resp.IsHighestTier = false
		resp.TierMessage = fmt.Sprintf("Spend Rs. %.0f more on eligible customer orders to reach Silver status!", remaining)

	case model.TierSilver:
		nextTier := model.TierGold
		nextSpend := goldSpend
		remaining := math.Max(0, goldSpend-lifetimeSpent)
		span := goldSpend - silverSpend
		var progress float64 = 0
		if span > 0 {
			progress = math.Min(100.0, math.Max(0.0, ((lifetimeSpent-silverSpend)/span)*100.0))
		}

		resp.NextTier = &nextTier
		resp.NextTierMinSpend = &nextSpend
		resp.RemainingForNextTier = remaining
		resp.ProgressPercentage = math.Round(progress*10) / 10
		resp.IsHighestTier = false
		resp.TierMessage = fmt.Sprintf("Spend Rs. %.0f more on eligible customer orders to unlock Gold Partner benefits!", remaining)

	case model.TierGold:
		nextTier := model.TierPlatinum
		nextSpend := platinumSpend
		remaining := math.Max(0, platinumSpend-lifetimeSpent)
		span := platinumSpend - goldSpend
		var progress float64 = 0
		if span > 0 {
			progress = math.Min(100.0, math.Max(0.0, ((lifetimeSpent-goldSpend)/span)*100.0))
		}

		resp.NextTier = &nextTier
		resp.NextTierMinSpend = &nextSpend
		resp.RemainingForNextTier = remaining
		resp.ProgressPercentage = math.Round(progress*10) / 10
		resp.IsHighestTier = false
		resp.TierMessage = fmt.Sprintf("Spend Rs. %.0f more to unlock our highest tier: Platinum VIP Partner!", remaining)

	case model.TierPlatinum:
		resp.NextTier = nil
		resp.NextTierMinSpend = nil
		resp.RemainingForNextTier = 0
		resp.ProgressPercentage = 100.0
		resp.IsHighestTier = true
		resp.TierMessage = "Congratulations! You have reached our highest Platinum VIP Partner tier. Enjoy top-priority fulfillment and executive priority support."

	default:
		resp.CurrentTier = model.TierBronze
		resp.ProgressPercentage = 0
		resp.IsHighestTier = false
		resp.TierMessage = "Welcome to Imanya Fancy Goods Customer Loyalty Program."
	}

	return resp
}
