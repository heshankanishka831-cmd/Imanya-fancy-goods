package service_test

import (
	"context"
	"testing"

	orderModel "distribution-management/internal/orders/model"
	"distribution-management/internal/orders/repository"
	orderService "distribution-management/internal/orders/service"
	whatsappService "distribution-management/internal/whatsapp/service"

	"github.com/stretchr/testify/assert"
)

// MockOrderRepo provides order retrieval for link tests
type MockOrderRepo struct {
	repository.OrderRepository
	order *orderModel.Order
}

func (m *MockOrderRepo) GetOrderByID(ctx context.Context, id string) (*orderModel.Order, error) {
	return m.order, nil
}

// TestOrderService_WhatsAppLinkSecurity verifies error behavior when owner number is missing
func TestOrderService_WhatsAppLinkSecurity(t *testing.T) {
	// Case 1: Unconfigured WhatsApp number should return clear error
	emptyWASvc := whatsappService.NewWhatsAppService("", "")
	mockRepo := &MockOrderRepo{
		order: &orderModel.Order{
			ID:          "order-1",
			OrderNumber: "ORD-001",
			TotalAmount: 1500.00,
		},
	}

	svc := orderService.NewOrderService(mockRepo, nil, nil, nil, nil, nil, emptyWASvc, nil, nil)
	link, err := svc.GetWhatsAppLink(context.Background(), "order-1")

	assert.Error(t, err)
	assert.Equal(t, "", link)
	assert.Contains(t, err.Error(), "store owner WhatsApp number is not configured")

	// Case 2: Configured Store Owner number produces valid link
	validWASvc := whatsappService.NewWhatsAppService("94766611606", "Hello:")
	svcValid := orderService.NewOrderService(mockRepo, nil, nil, nil, nil, nil, validWASvc, nil, nil)
	validLink, errValid := svcValid.GetWhatsAppLink(context.Background(), "order-1")

	assert.NoError(t, errValid)
	assert.Contains(t, validLink, "https://wa.me/94766611606?text=")
	assert.Contains(t, validLink, "ORD-001")
}

// TestOrderCalculation_BackendAuthoritative verifies calculation formulas
func TestOrderCalculation_BackendAuthoritative(t *testing.T) {
	items := []orderModel.OrderItem{
		{ProductName: "Item A", ProductSKU: "SKU-A", UnitPrice: 250.00, Quantity: 4, Subtotal: 1000.00},
		{ProductName: "Item B", ProductSKU: "SKU-B", UnitPrice: 150.50, Quantity: 2, Subtotal: 301.00},
	}

	var totalQuantity int
	var subtotal float64
	for _, it := range items {
		// Verify Line Total = Unit Price * Quantity
		expectedLineTotal := it.UnitPrice * float64(it.Quantity)
		assert.Equal(t, expectedLineTotal, it.Subtotal)
		totalQuantity += it.Quantity
		subtotal += it.Subtotal
	}

	assert.Equal(t, 2, len(items), "Distinct products count")
	assert.Equal(t, 6, totalQuantity, "Sum of quantities")
	assert.Equal(t, 1301.00, subtotal, "Backend authoritative subtotal")

	order := &orderModel.Order{
		OrderNumber: "ORD-AUTH-01",
		TotalAmount: subtotal,
		Items:       items,
	}

	waSvc := whatsappService.NewWhatsAppService("94766611606", "Order Confirmation:")
	link := waSvc.GenerateOrderLink(order)

	assert.Contains(t, link, "Total%20Items%3A%202")
	assert.Contains(t, link, "Total%20Quantity%3A%206")
	assert.Contains(t, link, "Total%20Order%20Amount%3A%20Rs.%201301.00")
}
