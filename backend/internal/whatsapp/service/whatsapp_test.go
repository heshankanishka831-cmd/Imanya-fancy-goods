package service_test

import (
	"strings"
	"testing"

	"wholesale-management/internal/customers/model"
	orderModel "wholesale-management/internal/orders/model"
	"wholesale-management/internal/whatsapp/service"

	"github.com/stretchr/testify/assert"
)

func TestWhatsAppService_GenerateOrderLink(t *testing.T) {
	svc := service.NewWhatsAppService("+94 77 123 4567", "Hello Wholesale Team, please confirm my order:")

	order := &orderModel.Order{
		OrderNumber: "ORD-20261119-0001",
		Customer: model.Customer{
			Name:  "Sunil Perera",
			Phone: "+94771112233",
		},
		DeliveryAddress: "No. 45, Galle Road, Colombo",
		TotalAmount:     150.50,
		Items: []orderModel.OrderItem{
			{
				ProductName: "Basmati Rice 10kg",
				Quantity:    2,
				UnitPrice:   50.00,
				Subtotal:    100.00,
			},
			{
				ProductName: "Hand Soap 250ml",
				Quantity:    1,
				UnitPrice:   50.50,
				Subtotal:    50.50,
			},
		},
	}

	link := svc.GenerateOrderLink(order)

	assert.True(t, strings.HasPrefix(link, "https://wa.me/94771234567?text="))
	assert.Contains(t, link, "ORD-20261119-0001")
	assert.Contains(t, link, "Sunil+Perera")
	assert.Contains(t, link, "150.50")
}
