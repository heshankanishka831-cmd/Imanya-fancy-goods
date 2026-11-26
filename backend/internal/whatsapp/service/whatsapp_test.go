package service_test

import (
	"strings"
	"testing"

	"distribution-management/internal/customers/model"
	orderModel "distribution-management/internal/orders/model"
	"distribution-management/internal/whatsapp/service"

	"github.com/stretchr/testify/assert"
)

func TestWhatsAppService_GenerateOrderLink(t *testing.T) {
	svc := service.NewWhatsAppService("+94 76 661 1606", "Hello Imanya Fancy Goods Team, I would like to confirm my customer order:")

	order := &orderModel.Order{
		OrderNumber: "ORD-20261123-0001",
		Customer: &model.Customer{
			Name:  "Sunil Perera",
			Phone: "+94771112233",
			Email: "sunil@example.com",
		},
		DeliveryAddress: "No. 45, Main Street, Colombo",
		TotalAmount:     1500.00,
		Items: []orderModel.OrderItem{
			{
				ProductName: "Korean Hair Clip Set",
				ProductSKU:  "ACC-CLIP-01",
				Quantity:    2,
				UnitPrice:   500.00,
				Subtotal:    1000.00,
			},
			{
				ProductName: "Plush Bag Charm Keychain",
				ProductSKU:  "ACC-KEY-02",
				Quantity:    1,
				UnitPrice:   500.00,
				Subtotal:    500.00,
			},
		},
	}

	link := svc.GenerateOrderLink(order)

	assert.True(t, strings.HasPrefix(link, "https://wa.me/94766611606?text="))
	assert.Contains(t, link, "ORDER%20DETAILS")
	assert.Contains(t, link, "Order%20Number%3A%20ORD-20261123-0001")
	assert.Contains(t, link, "Customer%20Name%3A%20Sunil%20Perera")
	assert.Contains(t, link, "Phone%20Number%3A%20%2B94771112233")
	assert.Contains(t, link, "Delivery%20Address%3A%20No.%2045%2C%20Main%20Street%2C%20Colombo")
	assert.Contains(t, link, "ITEMS%20ORDERED")
	assert.Contains(t, link, "1.%20Product%20Name%3A%20Korean%20Hair%20Clip%20Set")
	assert.Contains(t, link, "Item%20Code%3A%20ACC-CLIP-01")
	assert.Contains(t, link, "Quantity%3A%202")
	assert.Contains(t, link, "Unit%20Price%3A%20Rs.%20500.00")
	assert.Contains(t, link, "Line%20Total%3A%20Rs.%201000.00")
	assert.Contains(t, link, "ORDER%20SUMMARY")
	assert.Contains(t, link, "Total%20Items%3A%202")
	assert.Contains(t, link, "Total%20Quantity%3A%203")
	assert.Contains(t, link, "Total%20Order%20Amount%3A%20Rs.%201500.00")
	assert.Contains(t, link, "PAYMENT%20METHOD")
	assert.Contains(t, link, "Online%20Banking%20%2F%20Direct%20Deposit")
	assert.Contains(t, link, "Please%20attach%20the%20bank%20transfer%20receipt%20%2F%20payment%20slip%20here.")
	assert.Contains(t, link, "Thank%20you.")
}

func TestWhatsAppService_MissingSKUGraceful(t *testing.T) {
	svc := service.NewWhatsAppService("94766611606", "Order:")
	order := &orderModel.Order{
		OrderNumber: "ORD-002",
		Customer: &model.Customer{
			Name:  "Nimal",
			Phone: "0771234567",
		},
		DeliveryAddress: "Kandy",
		TotalAmount:     600.00,
		Items: []orderModel.OrderItem{
			{
				ProductName: "Fancy Ribbon",
				ProductSKU:  "", // empty SKU
				Quantity:    3,
				UnitPrice:   200.00,
				Subtotal:    600.00,
			},
		},
	}

	link := svc.GenerateOrderLink(order)
	assert.Contains(t, link, "Item%20Code%3A%20N%2FA")
	assert.Contains(t, link, "Total%20Order%20Amount%3A%20Rs.%20600.00")
}

func TestWhatsAppService_EmptyPhoneNumber(t *testing.T) {
	svc := service.NewWhatsAppService("", "")
	order := &orderModel.Order{OrderNumber: "ORD-001"}
	link := svc.GenerateOrderLink(order)
	assert.Equal(t, "", link)
}
