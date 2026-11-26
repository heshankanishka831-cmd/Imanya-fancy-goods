package model

import (
	"sort"
	"time"
)

const (
	TierBronze   = "BRONZE"
	TierSilver   = "SILVER"
	TierGold     = "GOLD"
	TierPlatinum = "PLATINUM"
)

type LoyaltySetting struct {
	ID          int       `gorm:"primaryKey;autoIncrement" json:"id"`
	TierName    string    `gorm:"type:varchar(32);not null;unique" json:"tier_name"`
	MinSpend    float64   `gorm:"type:numeric(12,2);not null;default:0.00" json:"min_spend"`
	Description string    `gorm:"type:text" json:"description"`
	SortOrder   int       `gorm:"not null;default:0" json:"sort_order"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (LoyaltySetting) TableName() string {
	return "loyalty_settings"
}

// DetermineTier returns the highest tier achieved based on cumulative spend
func DetermineTier(spend float64, settings []LoyaltySetting) string {
	// Sort descending by MinSpend
	sorted := make([]LoyaltySetting, len(settings))
	copy(sorted, settings)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].MinSpend > sorted[j].MinSpend
	})

	for _, s := range sorted {
		if spend >= s.MinSpend {
			return s.TierName
		}
	}
	return TierBronze
}
