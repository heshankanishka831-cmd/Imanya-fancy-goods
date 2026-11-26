package repository

import (
	"context"
	"fmt"
	"strings"

	"distribution-management/internal/loyalty/dto"
	"distribution-management/internal/loyalty/model"

	"gorm.io/gorm"
)

type LoyaltyRepository interface {
	GetSettings(ctx context.Context) ([]model.LoyaltySetting, error)
	UpdateThresholds(ctx context.Context, silver, gold, platinum float64) error
	CalculateCustomerEligibleSpend(ctx context.Context, customerID string) (float64, int64, error)
	UpdateCustomerTierAndSpend(ctx context.Context, customerID, tier string, spend float64) error
	RecalculateAll(ctx context.Context, settings []model.LoyaltySetting) error
	GetCustomer(ctx context.Context, customerID string) (name string, tier string, spend float64, err error)
	GetMembershipStats(ctx context.Context) (*dto.MembershipStatsResponse, error)
	ListCustomers(ctx context.Context, tier string, search string, sortBy string, order string, limit, offset int) ([]dto.MembershipCustomerItemDTO, int64, error)
}

type loyaltyRepository struct {
	db *gorm.DB
}

func NewLoyaltyRepository(db *gorm.DB) LoyaltyRepository {
	return &loyaltyRepository{db: db}
}

func (r *loyaltyRepository) GetSettings(ctx context.Context) ([]model.LoyaltySetting, error) {
	var settings []model.LoyaltySetting
	err := r.db.WithContext(ctx).Order("sort_order ASC").Find(&settings).Error
	return settings, err
}

func (r *loyaltyRepository) UpdateThresholds(ctx context.Context, silver, gold, platinum float64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&model.LoyaltySetting{}).Where("tier_name = ?", model.TierSilver).Update("min_spend", silver).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.LoyaltySetting{}).Where("tier_name = ?", model.TierGold).Update("min_spend", gold).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.LoyaltySetting{}).Where("tier_name = ?", model.TierPlatinum).Update("min_spend", platinum).Error; err != nil {
			return err
		}
		return nil
	})
}

func (r *loyaltyRepository) CalculateCustomerEligibleSpend(ctx context.Context, customerID string) (float64, int64, error) {
	var totalSpend float64
	var orderCount int64

	row := r.db.WithContext(ctx).Table("orders").
		Select("COALESCE(SUM(total_amount), 0), COUNT(*)").
		Where("customer_id = ? AND status IN ('CONFIRMED', 'PROCESSING', 'COMPLETED', 'DELIVERED')", customerID).
		Row()

	if err := row.Scan(&totalSpend, &orderCount); err != nil {
		return 0, 0, err
	}

	return totalSpend, orderCount, nil
}

func (r *loyaltyRepository) UpdateCustomerTierAndSpend(ctx context.Context, customerID, tier string, spend float64) error {
	return r.db.WithContext(ctx).Table("customers").
		Where("id = ?", customerID).
		Updates(map[string]interface{}{
			"membership_tier": tier,
			"lifetime_spent":  spend,
			"updated_at":      gorm.Expr("NOW()"),
		}).Error
}

func (r *loyaltyRepository) RecalculateAll(ctx context.Context, settings []model.LoyaltySetting) error {
	var silverThreshold float64 = 100000
	var goldThreshold float64 = 500000
	var platinumThreshold float64 = 1000000

	for _, s := range settings {
		switch s.TierName {
		case model.TierSilver:
			silverThreshold = s.MinSpend
		case model.TierGold:
			goldThreshold = s.MinSpend
		case model.TierPlatinum:
			platinumThreshold = s.MinSpend
		}
	}

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Update lifetime_spent for all customers from eligible orders
		updateSpendSQL := `
			UPDATE customers c
			SET lifetime_spent = COALESCE((
				SELECT SUM(o.total_amount)
				FROM orders o
				WHERE o.customer_id = c.id
				  AND o.status IN ('CONFIRMED', 'PROCESSING', 'COMPLETED', 'DELIVERED')
			), 0.00);
		`
		if err := tx.Exec(updateSpendSQL).Error; err != nil {
			return err
		}

		// Update membership_tier based on dynamic thresholds
		updateTierSQL := fmt.Sprintf(`
			UPDATE customers
			SET membership_tier = CASE
				WHEN lifetime_spent >= %f THEN 'PLATINUM'
				WHEN lifetime_spent >= %f THEN 'GOLD'
				WHEN lifetime_spent >= %f THEN 'SILVER'
				ELSE 'BRONZE'
			END;
		`, platinumThreshold, goldThreshold, silverThreshold)

		return tx.Exec(updateTierSQL).Error
	})
}

func (r *loyaltyRepository) GetCustomer(ctx context.Context, customerID string) (name string, tier string, spend float64, err error) {
	type custRow struct {
		Name           string
		MembershipTier string
		LifetimeSpent  float64
	}
	var c custRow
	err = r.db.WithContext(ctx).Table("customers").
		Select("name, membership_tier, lifetime_spent").
		Where("id = ?", customerID).
		First(&c).Error
	if err != nil {
		return "", "", 0, err
	}
	return c.Name, c.MembershipTier, c.LifetimeSpent, nil
}

func (r *loyaltyRepository) GetMembershipStats(ctx context.Context) (*dto.MembershipStatsResponse, error) {
	var total int64
	_ = r.db.WithContext(ctx).Table("customers").Count(&total).Error

	type tierCount struct {
		MembershipTier string
		Count          int64
	}
	var results []tierCount
	err := r.db.WithContext(ctx).Table("customers").
		Select("membership_tier, COUNT(*) as count").
		Group("membership_tier").
		Scan(&results).Error
	if err != nil {
		return nil, err
	}

	resp := &dto.MembershipStatsResponse{
		TotalCustomers: total,
	}

	for _, tc := range results {
		switch strings.ToUpper(tc.MembershipTier) {
		case model.TierBronze:
			resp.BronzeCount = tc.Count
		case model.TierSilver:
			resp.SilverCount = tc.Count
		case model.TierGold:
			resp.GoldCount = tc.Count
		case model.TierPlatinum:
			resp.PlatinumCount = tc.Count
		}
	}

	return resp, nil
}

func (r *loyaltyRepository) ListCustomers(ctx context.Context, tier string, search string, sortBy string, order string, limit, offset int) ([]dto.MembershipCustomerItemDTO, int64, error) {
	query := r.db.WithContext(ctx).Table("customers")

	if tier != "" && strings.ToUpper(tier) != "ALL" {
		query = query.Where("membership_tier = ?", strings.ToUpper(tier))
	}

	if search != "" {
		s := "%" + search + "%"
		query = query.Where("name ILIKE ? OR phone ILIKE ? OR business_name ILIKE ? OR email ILIKE ?", s, s, s, s)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Sorting
	sortCol := "customers.lifetime_spent"
	switch strings.ToLower(sortBy) {
	case "membership_tier", "tier":
		sortCol = "CASE customers.membership_tier WHEN 'PLATINUM' THEN 4 WHEN 'GOLD' THEN 3 WHEN 'SILVER' THEN 2 ELSE 1 END"
	case "name":
		sortCol = "customers.name"
	case "created_at":
		sortCol = "customers.created_at"
	case "lifetime_spent", "spend":
		sortCol = "customers.lifetime_spent"
	}

	sortDir := "DESC"
	if strings.ToUpper(order) == "ASC" {
		sortDir = "ASC"
	}

	orderClause := fmt.Sprintf("%s %s", sortCol, sortDir)

	type rowResult struct {
		ID             string
		Name           string
		Email          string
		Phone          string
		BusinessName   string
		MembershipTier string
		LifetimeSpent  float64
		CreatedAt      interface{}
	}

	var rows []dto.MembershipCustomerItemDTO
	err := query.
		Select("customers.id, customers.name, customers.email, customers.phone, customers.business_name, customers.membership_tier, customers.lifetime_spent, customers.created_at, (SELECT COUNT(*) FROM orders WHERE orders.customer_id = customers.id) as order_count").
		Order(orderClause).
		Limit(limit).
		Offset(offset).
		Scan(&rows).Error

	return rows, total, err
}
