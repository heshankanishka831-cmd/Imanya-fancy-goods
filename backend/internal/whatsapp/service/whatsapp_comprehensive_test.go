package service_test

import (
	"net/url"
	"strings"
	"testing"

	customerModel "distribution-management/internal/customers/model"
	orderModel "distribution-management/internal/orders/model"
	"distribution-management/internal/whatsapp/service"

	"github.com/stretchr/testify/assert"
)

// TestWhatsAppService_FullSuite verifies all calculation, encoding, and formatting rules
func TestWhatsAppService_FullSuite(t *testing.T) {
	svc := service.NewWhatsAppService("0766611606", "Hello Imanya Fancy Goods Team, I would like to confirm my customer order:")

	// 1. Phone number internationalization & sanitization (auto-normalizes 07X to 947X)
	assert.Equal(t, "94766611606", svc.GetStorePhoneNumber())

	// Test with +94 formatted number
	svcIntl := service.NewWhatsAppService("+94 76 661 1606", "Hello Imanya Fancy Goods Team, I would like to confirm my customer order:")
	assert.Equal(t, "94766611606", svcIntl.GetStorePhoneNumber())

	// 2. Multi-Item Order with varying prices and quantities
	order := &orderModel.Order{
		OrderNumber: "ORD-20261123-0001",
		Customer: &customerModel.Customer{
			Name:            "Kavindu Dilshan",
			Phone:           "0712345678",
			Email:           "kavindu@test.com",
			DeliveryAddress: "No. 12, Temple Road, Maharagama",
		},
		DeliveryAddress: "No. 12, Temple Road, Maharagama",
		TotalAmount:     6350.00,
		Items: []orderModel.OrderItem{
			{
				ProductName: "Korean Pearl Hair Claw",
				ProductSKU:  "ACC-CLAW-01",
				UnitPrice:   450.00,
				Quantity:    3,
				Subtotal:    1350.00, // 450 * 3
			},
			{
				ProductName: "Plush Bunny Bag Charm",
				ProductSKU:  "ACC-CHARM-02",
				UnitPrice:   750.00,
				Quantity:    2,
				Subtotal:    1500.00, // 750 * 2
			},
			{
				ProductName: "Velvet Scrunchie Bundle (5pcs)",
				ProductSKU:  "ACC-SCR-03",
				UnitPrice:   350.00,
				Quantity:    10,
				Subtotal:    3500.00, // 350 * 10
			},
		},
		CustomerNotes: "Please deliver before Friday afternoon",
	}

	link := svcIntl.GenerateOrderLink(order)

	// A. Correct Store Owner WhatsApp URL target
	assert.True(t, strings.HasPrefix(link, "https://wa.me/94766611606?text="))

	// B. Verify decoded content to check exact structural integrity
	rawQuery := strings.TrimPrefix(link, "https://wa.me/94766611606?text=")
	decodedText, err := url.QueryUnescape(rawQuery)
	assert.NoError(t, err)

	// Verify Header
	assert.Contains(t, decodedText, "Hello Imanya Fancy Goods Team,")
	assert.Contains(t, decodedText, "I would like to confirm my customer order.")

	// Verify Customer Information
	assert.Contains(t, decodedText, "ORDER DETAILS")
	assert.Contains(t, decodedText, "Order Number: ORD-20261123-0001")
	assert.Contains(t, decodedText, "Customer Name: Kavindu Dilshan")
	assert.Contains(t, decodedText, "Phone Number: 0712345678")
	assert.Contains(t, decodedText, "Delivery Address: No. 12, Temple Road, Maharagama")

	// Verify Item 1 Calculations
	assert.Contains(t, decodedText, "1. Product Name: Korean Pearl Hair Claw")
	assert.Contains(t, decodedText, "   Item Code: ACC-CLAW-01")
	assert.Contains(t, decodedText, "   Quantity: 3")
	assert.Contains(t, decodedText, "   Unit Price: Rs. 450.00")
	assert.Contains(t, decodedText, "   Line Total: Rs. 1350.00")

	// Verify Item 2 Calculations
	assert.Contains(t, decodedText, "2. Product Name: Plush Bunny Bag Charm")
	assert.Contains(t, decodedText, "   Item Code: ACC-CHARM-02")
	assert.Contains(t, decodedText, "   Quantity: 2")
	assert.Contains(t, decodedText, "   Unit Price: Rs. 750.00")
	assert.Contains(t, decodedText, "   Line Total: Rs. 1500.00")

	// Verify Item 3 Calculations
	assert.Contains(t, decodedText, "3. Product Name: Velvet Scrunchie Bundle (5pcs)")
	assert.Contains(t, decodedText, "   Item Code: ACC-SCR-03")
	assert.Contains(t, decodedText, "   Quantity: 10")
	assert.Contains(t, decodedText, "   Unit Price: Rs. 350.00")
	assert.Contains(t, decodedText, "   Line Total: Rs. 3500.00")

	// Verify Order Summary Calculations
	// Total Items = 3 distinct products
	assert.Contains(t, decodedText, "ORDER SUMMARY")
	assert.Contains(t, decodedText, "Total Items: 3")
	// Total Quantity = 3 + 2 + 10 = 15
	assert.Contains(t, decodedText, "Total Quantity: 15")
	// Total Order Amount = 1350 + 1500 + 3500 = 6350.00
	assert.Contains(t, decodedText, "Total Order Amount: Rs. 6350.00")

	// Verify Payment Information
	assert.Contains(t, decodedText, "PAYMENT METHOD\nOnline Banking / Direct Deposit")
	assert.Contains(t, decodedText, "Please attach the bank transfer receipt / payment slip here.")
	assert.Contains(t, decodedText, "Thank you.")

	// Verify Customer Notes
	assert.Contains(t, decodedText, "Customer Notes: Please deliver before Friday afternoon")

	// C. Verify URL Encoding (Ensure NO raw '+' in query; spaces must be %20 for clean mobile/web WhatsApp rendering)
	assert.NotContains(t, rawQuery, "+", "URL query must use %20 instead of '+' for spaces")
	assert.Contains(t, rawQuery, "%20")
	assert.Contains(t, rawQuery, "%0A")
}

// TestWhatsAppService_SingleItemOrder tests an order with exactly one product
func TestWhatsAppService_SingleItemOrder(t *testing.T) {
	svc := service.NewWhatsAppService("94766611606", "Hello:")
	order := &orderModel.Order{
		OrderNumber: "ORD-SINGLE-01",
		Customer: &customerModel.Customer{
			Name:  "Amara Silva",
			Phone: "0779998888",
		},
		DeliveryAddress: "Colombo 07",
		TotalAmount:     1200.00,
		Items: []orderModel.OrderItem{
			{
				ProductName: "Designer Handbag Strap",
				ProductSKU:  "STRAP-09",
				UnitPrice:   1200.00,
				Quantity:    1,
				Subtotal:    1200.00,
			},
		},
	}

	link := svc.GenerateOrderLink(order)
	assert.Contains(t, link, "Total%20Items%3A%201")
	assert.Contains(t, link, "Total%20Quantity%3A%201")
	assert.Contains(t, link, "Total%20Order%20Amount%3A%20Rs.%201200.00")
}

// TestWhatsAppService_MissingSKUFallback verifies graceful handling of missing or blank SKU
func TestWhatsAppService_MissingSKUFallback(t *testing.T) {
	svc := service.NewWhatsAppService("94766611606", "")
	order := &orderModel.Order{
		OrderNumber: "ORD-NOSKU-02",
		Customer: &customerModel.Customer{
			Name:  "Test User",
			Phone: "0770001111",
		},
		DeliveryAddress: "Galle Fort",
		TotalAmount:     500.00,
		Items: []orderModel.OrderItem{
			{
				ProductName: "Custom Hair Ribbon",
				ProductSKU:  "   ", // whitespace only
				UnitPrice:   500.00,
				Quantity:    1,
				Subtotal:    500.00,
			},
		},
	}

	link := svc.GenerateOrderLink(order)
	assert.Contains(t, link, "Item%20Code%3A%20N%2FA")
	assert.NotContains(t, link, "Item%20Code%3A%20null")
	assert.NotContains(t, link, "Item%20Code%3A%20undefined")
}

// TestWhatsAppService_UnicodeAndSinhala verifies proper URL percent-encoding of Sinhala text
func TestWhatsAppService_UnicodeAndSinhala(t *testing.T) {
	svc := service.NewWhatsAppService("94766611606", "ඇණවුම තහවුරු කිරීම:")
	order := &orderModel.Order{
		OrderNumber: "ORD-SINHALA-01",
		Customer: &customerModel.Customer{
			Name:  "කමල් පෙරේරා",
			Phone: "0771234567",
		},
		DeliveryAddress: "නො. 15, ගාලු පාර, කොළඹ",
		TotalAmount:     850.00,
		Items: []orderModel.OrderItem{
			{
				ProductName: "ලස්සන මල් කොණ්ඩ කටුව",
				ProductSKU:  "ACC-FLOW-01",
				UnitPrice:   850.00,
				Quantity:    1,
				Subtotal:    850.00,
			},
		},
		CustomerNotes: "කරුණාකර ඉක්මනින් එවන්න",
	}

	link := svc.GenerateOrderLink(order)
	assert.NotEmpty(t, link)

	// Decode and verify exact Sinhala text preservation
	rawQuery := strings.TrimPrefix(link, "https://wa.me/94766611606?text=")
	decoded, err := url.QueryUnescape(rawQuery)
	assert.NoError(t, err)
	assert.Contains(t, decoded, "කමල් පෙරේරා")
	assert.Contains(t, decoded, "නො. 15, ගාලු පාර, කොළඹ")
	assert.Contains(t, decoded, "ලස්සන මල් කොණ්ඩ කටුව")
	assert.Contains(t, decoded, "කරුණාකර ඉක්මනින් එවන්න")
}

// TestWhatsAppService_UnconfiguredStoreNumber verifies empty string return on missing number
func TestWhatsAppService_UnconfiguredStoreNumber(t *testing.T) {
	svc := service.NewWhatsAppService("", "")
	order := &orderModel.Order{
		OrderNumber: "ORD-FAIL-01",
		TotalAmount: 1000.00,
	}

	link := svc.GenerateOrderLink(order)
	assert.Equal(t, "", link, "Link must be empty if Store Owner WhatsApp number is unconfigured")
}
