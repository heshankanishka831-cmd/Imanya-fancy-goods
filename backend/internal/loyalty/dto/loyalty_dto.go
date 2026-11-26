package dto

import "time"

type CustomerMembershipResponse struct {
	CustomerID           string   `json:"customer_id"`
	CustomerName         string   `json:"customer_name"`
	CurrentTier          string   `json:"current_tier"`
	LifetimeSpent        float64  `json:"lifetime_spent"`
	NextTier             *string  `json:"next_tier"`
	NextTierMinSpend     *float64 `json:"next_tier_min_spend"`
	RemainingForNextTier float64  `json:"remaining_for_next_tier"`
	ProgressPercentage   float64  `json:"progress_percentage"`
	IsHighestTier        bool     `json:"is_highest_tier"`
	TierMessage          string   `json:"tier_message"`
	EligibleOrdersCount  int64    `json:"eligible_orders_count"`
}

type MembershipStatsResponse struct {
	TotalCustomers int64 `json:"total_customers"`
	BronzeCount    int64 `json:"bronze_count"`
	SilverCount    int64 `json:"silver_count"`
	GoldCount      int64 `json:"gold_count"`
	PlatinumCount  int64 `json:"platinum_count"`
}

type LoyaltyTierSettingDTO struct {
	TierName    string  `json:"tier_name"`
	MinSpend    float64 `json:"min_spend"`
	Description string  `json:"description"`
	SortOrder   int     `json:"sort_order"`
}

type LoyaltySettingsResponse struct {
	Tiers []LoyaltyTierSettingDTO `json:"tiers"`
}

type UpdateThresholdsRequest struct {
	SilverMinSpend   float64 `json:"silver_min_spend" binding:"required,gt=0"`
	GoldMinSpend     float64 `json:"gold_min_spend" binding:"required,gt=0"`
	PlatinumMinSpend float64 `json:"platinum_min_spend" binding:"required,gt=0"`
}

type MembershipCustomerItemDTO struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Email          string    `json:"email"`
	Phone          string    `json:"phone"`
	BusinessName   string    `json:"business_name"`
	MembershipTier string    `json:"membership_tier"`
	LifetimeSpent  float64   `json:"lifetime_spent"`
	OrderCount     int64     `json:"order_count"`
	CreatedAt      time.Time `json:"created_at"`
}
