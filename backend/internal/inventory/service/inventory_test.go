package service_test

import (
	"testing"
	"distribution-management/internal/inventory/model"

	"github.com/stretchr/testify/assert"
)

func TestProductStock_AvailableStock(t *testing.T) {
	stock := &model.ProductStock{
		ProductID:         "test-id",
		CurrentStock:      100,
		AllocatedStock:    30,
		LowStockThreshold: 10,
	}

	assert.Equal(t, 70, stock.AvailableStock())

	// If allocated equals current
	stock.AllocatedStock = 100
	assert.Equal(t, 0, stock.AvailableStock())

	// Edge case safety
	stock.AllocatedStock = 120
	assert.Equal(t, 0, stock.AvailableStock())
}
