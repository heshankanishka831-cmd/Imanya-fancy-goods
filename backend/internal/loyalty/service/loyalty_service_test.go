package service_test

import (
	"context"
	"testing"

	auditModel "distribution-management/internal/audit/model"
	"distribution-management/internal/loyalty/dto"
	"distribution-management/internal/loyalty/model"
	"distribution-management/internal/loyalty/service"
)

type StubLoyaltyRepository struct {
	settings      []model.LoyaltySetting
	settingsErr   error
	updateErr     error
	recalcErr     error
	customerName  string
	customerTier  string
	customerSpend float64
	customerErr   error
}

func (s *StubLoyaltyRepository) GetSettings(ctx context.Context) ([]model.LoyaltySetting, error) {
	return s.settings, s.settingsErr
}

func (s *StubLoyaltyRepository) UpdateThresholds(ctx context.Context, silver, gold, platinum float64) error {
	return s.updateErr
}

func (s *StubLoyaltyRepository) CalculateCustomerEligibleSpend(ctx context.Context, customerID string) (float64, int64, error) {
	return s.customerSpend, 1, s.customerErr
}

func (s *StubLoyaltyRepository) UpdateCustomerTierAndSpend(ctx context.Context, customerID, tier string, spend float64) error {
	s.customerTier = tier
	s.customerSpend = spend
	return nil
}

func (s *StubLoyaltyRepository) RecalculateAll(ctx context.Context, settings []model.LoyaltySetting) error {
	return s.recalcErr
}

func (s *StubLoyaltyRepository) GetCustomer(ctx context.Context, customerID string) (string, string, float64, error) {
	return s.customerName, s.customerTier, s.customerSpend, s.customerErr
}

func (s *StubLoyaltyRepository) GetMembershipStats(ctx context.Context) (*dto.MembershipStatsResponse, error) {
	return &dto.MembershipStatsResponse{
		TotalCustomers: 10,
		BronzeCount:    5,
		SilverCount:    3,
		GoldCount:      1,
		PlatinumCount:  1,
	}, nil
}

func (s *StubLoyaltyRepository) ListCustomers(ctx context.Context, tier, search, sortBy, order string, limit, offset int) ([]dto.MembershipCustomerItemDTO, int64, error) {
	return nil, 0, nil
}

type StubAuditService struct{}

func (s *StubAuditService) LogAction(ctx context.Context, userID *string, action, resource, resourceID string, oldVal, newVal interface{}, ip, ua string) {
}

func (s *StubAuditService) ListLogs(ctx context.Context, action string, page, limit int) ([]auditModel.AuditLog, int64, error) {
	return nil, 0, nil
}

func defaultSettings() []model.LoyaltySetting {
	return []model.LoyaltySetting{
		{TierName: model.TierBronze, MinSpend: 0, SortOrder: 1},
		{TierName: model.TierSilver, MinSpend: 100000, SortOrder: 2},
		{TierName: model.TierGold, MinSpend: 500000, SortOrder: 3},
		{TierName: model.TierPlatinum, MinSpend: 1000000, SortOrder: 4},
	}
}

func TestDetermineTier(t *testing.T) {
	settings := defaultSettings()

	tests := []struct {
		name     string
		spend    float64
		expected string
	}{
		{"Zero spend is Bronze", 0, model.TierBronze},
		{"Just below Silver threshold is Bronze", 99999.99, model.TierBronze},
		{"Exact Silver threshold is Silver", 100000, model.TierSilver},
		{"Between Silver and Gold is Silver", 250000, model.TierSilver},
		{"Exact Gold threshold is Gold", 500000, model.TierGold},
		{"Between Gold and Platinum is Gold", 750000, model.TierGold},
		{"Exact Platinum threshold is Platinum", 1000000, model.TierPlatinum},
		{"Above Platinum is Platinum", 2500000, model.TierPlatinum},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := model.DetermineTier(tt.spend, settings)
			if actual != tt.expected {
				t.Errorf("expected %s, got %s for spend %.2f", tt.expected, actual, tt.spend)
			}
		})
	}
}

func TestUpdateThresholds_Validation(t *testing.T) {
	stubRepo := &StubLoyaltyRepository{settings: defaultSettings()}
	stubAudit := &StubAuditService{}
	svc := service.NewLoyaltyService(stubRepo, stubAudit)

	ctx := context.Background()

	t.Run("Silver must be greater than 0", func(t *testing.T) {
		req := &dto.UpdateThresholdsRequest{
			SilverMinSpend:   0,
			GoldMinSpend:     500000,
			PlatinumMinSpend: 1000000,
		}
		_, err := svc.UpdateThresholds(ctx, "admin-1", req, "127.0.0.1", "test-agent")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})

	t.Run("Gold must be greater than Silver", func(t *testing.T) {
		req := &dto.UpdateThresholdsRequest{
			SilverMinSpend:   150000,
			GoldMinSpend:     150000,
			PlatinumMinSpend: 1000000,
		}
		_, err := svc.UpdateThresholds(ctx, "admin-1", req, "127.0.0.1", "test-agent")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})

	t.Run("Platinum must be greater than Gold", func(t *testing.T) {
		req := &dto.UpdateThresholdsRequest{
			SilverMinSpend:   100000,
			GoldMinSpend:     500000,
			PlatinumMinSpend: 400000,
		}
		_, err := svc.UpdateThresholds(ctx, "admin-1", req, "127.0.0.1", "test-agent")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})

	t.Run("Valid thresholds succeed", func(t *testing.T) {
		req := &dto.UpdateThresholdsRequest{
			SilverMinSpend:   120000,
			GoldMinSpend:     600000,
			PlatinumMinSpend: 1500000,
		}
		resp, err := svc.UpdateThresholds(ctx, "admin-1", req, "127.0.0.1", "test-agent")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Fatal("expected response, got nil")
		}
	})
}

func TestGetCustomerMembership_Progression(t *testing.T) {
	settings := defaultSettings()
	stubAudit := &StubAuditService{}

	t.Run("Bronze customer progress to Silver", func(t *testing.T) {
		stubRepo := &StubLoyaltyRepository{
			settings:      settings,
			customerName:  "Perera Traders",
			customerTier:  model.TierBronze,
			customerSpend: 50000.0,
		}
		svc := service.NewLoyaltyService(stubRepo, stubAudit)

		resp, err := svc.GetCustomerMembership(context.Background(), "cust-1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp.CurrentTier != model.TierBronze {
			t.Errorf("expected tier %s, got %s", model.TierBronze, resp.CurrentTier)
		}
		if resp.LifetimeSpent != 50000.0 {
			t.Errorf("expected spend 50000, got %.2f", resp.LifetimeSpent)
		}
		if resp.NextTier == nil || *resp.NextTier != model.TierSilver {
			t.Errorf("expected next tier Silver, got %v", resp.NextTier)
		}
		if resp.RemainingForNextTier != 50000.0 {
			t.Errorf("expected remaining 50000, got %.2f", resp.RemainingForNextTier)
		}
		if resp.ProgressPercentage != 50.0 {
			t.Errorf("expected progress 50%%, got %.2f%%", resp.ProgressPercentage)
		}
		if resp.IsHighestTier {
			t.Error("expected IsHighestTier to be false")
		}
	})

	t.Run("Platinum customer is at highest tier", func(t *testing.T) {
		stubRepo := &StubLoyaltyRepository{
			settings:      settings,
			customerName:  "Apex Mart",
			customerTier:  model.TierPlatinum,
			customerSpend: 1200000.0,
		}
		svc := service.NewLoyaltyService(stubRepo, stubAudit)

		resp, err := svc.GetCustomerMembership(context.Background(), "cust-2")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp.CurrentTier != model.TierPlatinum {
			t.Errorf("expected tier %s, got %s", model.TierPlatinum, resp.CurrentTier)
		}
		if resp.NextTier != nil {
			t.Errorf("expected next tier nil, got %v", resp.NextTier)
		}
		if resp.RemainingForNextTier != 0.0 {
			t.Errorf("expected remaining 0, got %.2f", resp.RemainingForNextTier)
		}
		if resp.ProgressPercentage != 100.0 {
			t.Errorf("expected progress 100%%, got %.2f%%", resp.ProgressPercentage)
		}
		if !resp.IsHighestTier {
			t.Error("expected IsHighestTier to be true")
		}
	})
}
