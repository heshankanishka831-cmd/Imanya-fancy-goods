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
	svc := service.NewWhatsAppService("+94 77 123 4567", "Hello Imanya Fancy Goods, please confirm my wholesale order:")

	order := &orderModel.Order{
		OrderNumber: "ORD-20261119-0001",
		Customer: model.Customer{
			Name:  "Sunil Perera",
			Phone: "+94771112233",
		},
		DeliveryAddress: "No. 45, Main Street, Colombo",
		TotalAmount:     1500.00,
		Items: []orderModel.OrderItem{
			{
				ProductName: "Korean Hair Clip Set",
				Quantity:    2,
				UnitPrice:   500.00,
				Subtotal:    1000.00,
			},
			{
				ProductName: "Plush Bag Charm Keychain",
				Quantity:    1,
				UnitPrice:   500.00,
				Subtotal:    500.00,
			},
		},
	}

	link := svc.GenerateOrderLink(order)

	assert.True(t, strings.HasPrefix(link, "https://wa.me/94771234567?text="))
	assert.Contains(t, link, "ORD-20261119-0001")
	assert.Contains(t, link, "Sunil+Perera")
	assert.Contains(t, link, "1500.00")
}
