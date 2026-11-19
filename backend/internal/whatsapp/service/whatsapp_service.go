package service

import (
	"fmt"
	"net/url"
	"strings"

	"wholesale-management/internal/orders/model"
)

type WhatsAppService interface {
	GenerateOrderLink(order *model.Order) string
}

type whatsAppService struct {
	phoneNumber string
	prefix      string
}

func NewWhatsAppService(phoneNumber, prefix string) WhatsAppService {
	cleanPhone := strings.ReplaceAll(phoneNumber, "+", "")
	cleanPhone = strings.ReplaceAll(cleanPhone, " ", "")
	cleanPhone = strings.ReplaceAll(cleanPhone, "-", "")

	return &whatsAppService{
		phoneNumber: cleanPhone,
		prefix:      prefix,
	}
}

func (s *whatsAppService) GenerateOrderLink(order *model.Order) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("%s\n\n", s.prefix))
	sb.WriteString(fmt.Sprintf("*Order Number:* %s\n", order.OrderNumber))
	sb.WriteString(fmt.Sprintf("*Customer:* %s\n", order.Customer.Name))
	if order.Customer.BusinessName != "" {
		sb.WriteString(fmt.Sprintf("*Shop / Business:* %s\n", order.Customer.BusinessName))
	}
	sb.WriteString(fmt.Sprintf("*Phone:* %s\n", order.Customer.Phone))
	if order.DeliveryAddress != "" {
		sb.WriteString(fmt.Sprintf("*Delivery Address:* %s\n", order.DeliveryAddress))
	}
	sb.WriteString("\n*Wholesale Items Ordered:*\n")

	for _, item := range order.Items {
		sb.WriteString(fmt.Sprintf("- %dx %s @ Rs. %.2f = Rs. %.2f\n",
			item.Quantity, item.ProductName, item.UnitPrice, item.Subtotal))
	}

	sb.WriteString(fmt.Sprintf("\n*Total Order Amount:* Rs. %.2f\n", order.TotalAmount))
	sb.WriteString("\n*Payment Method:* Online Banking / Direct Deposit\n")
	sb.WriteString("_(Please attach bank transfer receipt / payment slip here)_\n")

	if order.CustomerNotes != "" {
		sb.WriteString(fmt.Sprintf("\n*Customer Notes:* %s\n", order.CustomerNotes))
	}

	encodedMsg := url.QueryEscape(sb.String())

	return fmt.Sprintf("https://wa.me/%s?text=%s", s.phoneNumber, encodedMsg)
}
