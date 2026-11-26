package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"distribution-management/internal/orders/model"
)

type WhatsAppService interface {
	ConfigureCloudAPI(apiToken, phoneNumberID, apiVersion string)
	GenerateOrderLink(order *model.Order) string
	BuildOrderMessage(order *model.Order) string
	SendOrderNotification(ctx context.Context, order *model.Order) (string, string)
	GetStorePhoneNumber() string
}

type whatsAppService struct {
	phoneNumber   string
	prefix        string
	apiToken      string
	phoneNumberID string
	apiVersion    string
	httpClient    *http.Client
}

func NewWhatsAppService(phoneNumber, prefix string) WhatsAppService {
	cleanPhone := cleanPhoneNumber(phoneNumber)

	return &whatsAppService{
		phoneNumber: cleanPhone,
		prefix:      prefix,
		apiVersion:  "v19.0",
		httpClient:  &http.Client{Timeout: 8 * time.Second},
	}
}

func (s *whatsAppService) ConfigureCloudAPI(apiToken, phoneNumberID, apiVersion string) {
	s.apiToken = strings.TrimSpace(apiToken)
	s.phoneNumberID = strings.TrimSpace(phoneNumberID)
	if strings.TrimSpace(apiVersion) != "" {
		s.apiVersion = strings.TrimSpace(apiVersion)
	}
}

func cleanPhoneNumber(phone string) string {
	clean := strings.ReplaceAll(phone, "+", "")
	clean = strings.ReplaceAll(clean, " ", "")
	clean = strings.ReplaceAll(clean, "-", "")
	clean = strings.ReplaceAll(clean, "(", "")
	clean = strings.ReplaceAll(clean, ")", "")
	clean = strings.ReplaceAll(clean, "[", "")
	clean = strings.ReplaceAll(clean, "]", "")
	clean = strings.TrimSpace(clean)
	// Guard against duplicated country codes (e.g. 9494...)
	for strings.HasPrefix(clean, "9494") {
		clean = clean[2:]
	}
	// If 10-digit Sri Lankan number starting with 0 (e.g. 0766611606), convert to 94766611606
	if strings.HasPrefix(clean, "0") && len(clean) == 10 {
		clean = "94" + clean[1:]
	}
	return clean
}

func (s *whatsAppService) GetStorePhoneNumber() string {
	return s.phoneNumber
}

func (s *whatsAppService) BuildOrderMessage(order *model.Order) string {
	var sb strings.Builder

	// Header / Greeting Prefix
	sb.WriteString("Hello Imanya Fancy Goods Team,\n\n")
	if order.IsGuest {
		sb.WriteString("New Guest Order Received:\n\n")
	} else {
		sb.WriteString("I would like to confirm my customer order.\n\n")
	}

	// Customer Information (Guest or Registered)
	var custName, phone, address string
	if order.IsGuest || order.Customer == nil {
		custName = strings.TrimSpace(order.GuestName)
		if custName == "" {
			custName = strings.TrimSpace(fmt.Sprintf("%s %s", order.GuestFirstName, order.GuestLastName))
		}
		phone = strings.TrimSpace(order.GuestPhone)
		address = strings.TrimSpace(order.DeliveryAddress)
	} else {
		custName = strings.TrimSpace(order.Customer.Name)
		if custName == "" {
			custName = strings.TrimSpace(fmt.Sprintf("%s %s", order.Customer.FirstName, order.Customer.LastName))
		}
		phone = strings.TrimSpace(order.Customer.Phone)
		address = strings.TrimSpace(order.DeliveryAddress)
		if address == "" {
			address = strings.TrimSpace(order.Customer.DeliveryAddress)
		}
	}

	if custName == "" {
		custName = "Customer"
	}
	if phone == "" {
		phone = "N/A"
	}
	if address == "" {
		address = "Standard Delivery Address"
	}

	sb.WriteString("ORDER DETAILS\n")
	sb.WriteString(fmt.Sprintf("Order Number: %s\n", order.OrderNumber))
	if order.IsGuest {
		sb.WriteString("Order Type: Guest Checkout\n")
	}
	sb.WriteString(fmt.Sprintf("Customer Name: %s\n", custName))
	sb.WriteString(fmt.Sprintf("Phone Number: %s\n", phone))
	sb.WriteString(fmt.Sprintf("Delivery Address: %s\n\n", address))

	// Items Ordered
	sb.WriteString("ITEMS ORDERED\n\n")

	totalQuantity := 0
	for i, item := range order.Items {
		totalQuantity += item.Quantity

		sku := strings.TrimSpace(item.ProductSKU)
		if sku == "" {
			sku = "N/A"
		}

		lineTotal := item.Subtotal
		if lineTotal <= 0 && item.UnitPrice > 0 && item.Quantity > 0 {
			lineTotal = item.UnitPrice * float64(item.Quantity)
		}

		sb.WriteString(fmt.Sprintf("%d. Product Name: %s\n", i+1, item.ProductName))
		sb.WriteString(fmt.Sprintf("   Item Code: %s\n", sku))
		sb.WriteString(fmt.Sprintf("   Quantity: %d\n", item.Quantity))
		if item.DiscountPercent > 0 && item.OriginalPrice != nil && *item.OriginalPrice > item.UnitPrice {
			sb.WriteString(fmt.Sprintf("   Unit Price: Rs. %.2f (%.0f%% OFF, Regular: Rs. %.2f)\n", item.UnitPrice, item.DiscountPercent, *item.OriginalPrice))
		} else {
			sb.WriteString(fmt.Sprintf("   Unit Price: Rs. %.2f\n", item.UnitPrice))
		}
		sb.WriteString(fmt.Sprintf("   Line Total: Rs. %.2f\n\n", lineTotal))
	}

	// Calculate total discount savings
	var totalDiscountSavings float64
	for _, it := range order.Items {
		if it.OriginalPrice != nil && *it.OriginalPrice > it.UnitPrice {
			totalDiscountSavings += (*it.OriginalPrice - it.UnitPrice) * float64(it.Quantity)
		}
	}

	// Order Summary
	sb.WriteString("ORDER SUMMARY\n")
	sb.WriteString(fmt.Sprintf("Total Items: %d\n", len(order.Items)))
	sb.WriteString(fmt.Sprintf("Total Quantity: %d\n", totalQuantity))
	if totalDiscountSavings > 0 {
		sb.WriteString(fmt.Sprintf("Regular Amount: Rs. %.2f\n", order.TotalAmount+totalDiscountSavings))
		sb.WriteString(fmt.Sprintf("Total Discount Savings: -Rs. %.2f\n", totalDiscountSavings))
	}
	sb.WriteString(fmt.Sprintf("Subtotal: Rs. %.2f\n", order.TotalAmount))
	sb.WriteString(fmt.Sprintf("Total Order Amount: Rs. %.2f\n\n", order.TotalAmount))

	// Payment Information
	sb.WriteString("PAYMENT METHOD\n")
	sb.WriteString("Online Banking / Direct Deposit\n\n")
	sb.WriteString("Please attach the bank transfer receipt / payment slip here.\n\n")
	sb.WriteString("Thank you.")

	// Customer Notes if present
	if strings.TrimSpace(order.CustomerNotes) != "" {
		sb.WriteString(fmt.Sprintf("\n\nCustomer Notes: %s", strings.TrimSpace(order.CustomerNotes)))
	}

	return sb.String()
}

func (s *whatsAppService) GenerateOrderLink(order *model.Order) string {
	if s.phoneNumber == "" {
		return ""
	}
	encodedMsg := strings.ReplaceAll(url.QueryEscape(s.BuildOrderMessage(order)), "+", "%20")
	return fmt.Sprintf("https://wa.me/%s?text=%s", s.phoneNumber, encodedMsg)
}

func (s *whatsAppService) SendOrderNotification(ctx context.Context, order *model.Order) (string, string) {
	if s.apiToken == "" || s.phoneNumberID == "" || s.phoneNumber == "" {
		return "LINK_READY", ""
	}

	endpoint := fmt.Sprintf("https://graph.facebook.com/%s/%s/messages", s.apiVersion, s.phoneNumberID)
	payload := map[string]interface{}{
		"messaging_product": "whatsapp",
		"to":                s.phoneNumber,
		"type":              "text",
		"text": map[string]string{
			"body": s.BuildOrderMessage(order),
		},
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return "FAILED", err.Error()
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return "FAILED", err.Error()
	}
	req.Header.Set("Authorization", "Bearer "+s.apiToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "FAILED", err.Error()
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return "FAILED", fmt.Sprintf("WhatsApp Cloud API returned status %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	return "SENT", ""
}
