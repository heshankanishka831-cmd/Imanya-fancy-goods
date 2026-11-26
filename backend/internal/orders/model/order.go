package model

import (
	"time"

	customerModel "distribution-management/internal/customers/model"
	userModel "distribution-management/internal/users/model"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Order struct {
	ID                         string                 `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	OrderNumber                string                 `gorm:"type:varchar(50);not null;unique" json:"order_number"`
	CustomerID                 *string                `gorm:"type:uuid" json:"customer_id"`
	Customer                   *customerModel.Customer `gorm:"foreignKey:CustomerID" json:"customer"`
	IsGuest                    bool                   `gorm:"not null;default:false" json:"is_guest"`
	GuestFirstName             string                 `gorm:"type:varchar(100);not null;default:''" json:"guest_first_name"`
	GuestLastName              string                 `gorm:"type:varchar(100);not null;default:''" json:"guest_last_name"`
	GuestName                  string                 `gorm:"type:varchar(255);not null;default:''" json:"guest_name"`
	GuestPhone                 string                 `gorm:"type:varchar(50);not null;default:''" json:"guest_phone"`
	GuestEmail                 string                 `gorm:"type:varchar(255);not null;default:''" json:"guest_email"`
	GuestCity                  string                 `gorm:"type:varchar(120);not null;default:''" json:"guest_city"`
	GuestProvince              string                 `gorm:"type:varchar(100);not null;default:''" json:"guest_province"`
	GuestPostalCode            string                 `gorm:"type:varchar(32);not null;default:''" json:"guest_postal_code"`
	GuestAccessToken           string                 `gorm:"type:varchar(128);not null;default:''" json:"-"`
	IdempotencyKey             string                 `gorm:"type:varchar(128);not null;default:''" json:"-"`
	WhatsAppNotificationStatus string                 `gorm:"column:whatsapp_notification_status;type:varchar(32);not null;default:'PENDING'" json:"whatsapp_notification_status"`
	WhatsAppNotificationError  string                 `gorm:"column:whatsapp_notification_error;type:text;not null;default:''" json:"whatsapp_notification_error"`
	PaymentStatus              string                 `gorm:"type:varchar(32);not null;default:'PAYMENT_PENDING'" json:"payment_status"` // PAYMENT_PENDING, RECEIPT_RECEIVED, PAYMENT_VERIFIED, PAYMENT_REJECTED
	PaymentMethod              string                 `gorm:"type:varchar(64);not null;default:'BANK_TRANSFER_WHATSAPP'" json:"payment_method"`
	PaymentNotes               string                 `gorm:"type:text;not null;default:''" json:"payment_notes"`
	PaymentVerifiedBy          *string                `gorm:"type:uuid" json:"payment_verified_by"`
	PaymentVerifiedAt          *time.Time             `json:"payment_verified_at"`
	Status                     string                 `gorm:"type:varchar(32);not null;default:'PENDING'" json:"status"` // PENDING, CONFIRMED, PROCESSING, COMPLETED, CANCELLED
	TotalAmount                float64                `gorm:"type:numeric(12,2);not null" json:"total_amount"`
	DeliveryAddress            string                 `gorm:"type:text" json:"delivery_address"`
	CustomerNotes              string                 `gorm:"type:text" json:"customer_notes"`
	InternalNotes              string                 `gorm:"type:text" json:"internal_notes"`
	Items                      []OrderItem            `gorm:"foreignKey:OrderID;constraint:OnDelete:CASCADE" json:"items"`
	StatusHistory              []OrderStatusHistory   `gorm:"foreignKey:OrderID;constraint:OnDelete:CASCADE" json:"status_history"`
	PaymentHistory             []OrderPaymentHistory  `gorm:"foreignKey:OrderID;constraint:OnDelete:CASCADE" json:"payment_history"`
	CreatedAt                  time.Time              `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt                  time.Time              `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Order) TableName() string {
	return "orders"
}

func (o *Order) BeforeCreate(tx *gorm.DB) error {
	if o.ID == "" {
		o.ID = uuid.New().String()
	}
	return nil
}

type OrderItem struct {
	ID              string   `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	OrderID         string   `gorm:"type:uuid;not null" json:"order_id"`
	ProductID       string   `gorm:"type:uuid;not null" json:"product_id"`
	ProductSKU      string   `gorm:"type:varchar(64);not null" json:"product_sku"`
	ProductName     string   `gorm:"type:varchar(255);not null" json:"product_name"`
	UnitOfMeasure   string   `gorm:"-" json:"unit_of_measure,omitempty"`
	UnitPrice       float64  `gorm:"type:numeric(12,2);not null" json:"unit_price"`
	Quantity        int      `gorm:"not null" json:"quantity"`
	Subtotal        float64  `gorm:"type:numeric(12,2);not null" json:"subtotal"`
	OriginalPrice   *float64 `gorm:"type:numeric(12,2)" json:"original_price,omitempty"`
	DiscountPercent float64  `gorm:"type:numeric(5,2);not null;default:0.00" json:"discount_percent"`
	DiscountAmount  float64  `gorm:"type:numeric(12,2);not null;default:0.00" json:"discount_amount"`
}

func (OrderItem) TableName() string {
	return "order_items"
}

func (oi *OrderItem) BeforeCreate(tx *gorm.DB) error {
	if oi.ID == "" {
		oi.ID = uuid.New().String()
	}
	return nil
}

type OrderStatusHistory struct {
	ID             string          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	OrderID        string          `gorm:"type:uuid;not null" json:"order_id"`
	PreviousStatus string          `gorm:"type:varchar(32)" json:"previous_status"`
	NewStatus      string          `gorm:"type:varchar(32);not null" json:"new_status"`
	ChangedBy      *string         `gorm:"type:uuid" json:"changed_by"`
	Changer        *userModel.User `gorm:"foreignKey:ChangedBy" json:"changer"`
	Notes          string          `gorm:"type:text" json:"notes"`
	CreatedAt      time.Time       `gorm:"autoCreateTime" json:"created_at"`
}

func (OrderStatusHistory) TableName() string {
	return "order_status_history"
}

func (osh *OrderStatusHistory) BeforeCreate(tx *gorm.DB) error {
	if osh.ID == "" {
		osh.ID = uuid.New().String()
	}
	return nil
}

type OrderPaymentHistory struct {
	ID             string          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	OrderID        string          `gorm:"type:uuid;not null" json:"order_id"`
	PreviousStatus string          `gorm:"type:varchar(32);not null;default:''" json:"previous_status"`
	NewStatus      string          `gorm:"type:varchar(32);not null" json:"new_status"`
	ChangedBy      *string         `gorm:"type:uuid" json:"changed_by"`
	Changer        *userModel.User `gorm:"foreignKey:ChangedBy" json:"changer"`
	Source         string          `gorm:"type:varchar(32);not null;default:'ADMIN'" json:"source"`
	Notes          string          `gorm:"type:text;not null;default:''" json:"notes"`
	CreatedAt      time.Time       `gorm:"autoCreateTime" json:"created_at"`
}

func (OrderPaymentHistory) TableName() string {
	return "order_payment_history"
}

func (oph *OrderPaymentHistory) BeforeCreate(tx *gorm.DB) error {
	if oph.ID == "" {
		oph.ID = uuid.New().String()
	}
	return nil
}
