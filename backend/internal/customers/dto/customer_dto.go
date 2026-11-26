package dto

import "time"

type CustomerProfileRequest struct {
	Username                  string `json:"username" binding:"omitempty,min=3,max=50"`
	FirstName                 string `json:"first_name" binding:"required,min=1,max=100"`
	LastName                  string `json:"last_name" binding:"required,min=1,max=100"`
	Name                      string `json:"name"`
	Email                     string `json:"email" binding:"required,email"`
	Phone                     string `json:"phone" binding:"required,min=5,max=50"`
	BusinessName              string `json:"business_name"`
	ResidentialAddress        string `json:"residential_address"`
	DeliveryAddress           string `json:"delivery_address"`
	ResHouseNo                string `json:"res_house_no"`
	ResStreet                 string `json:"res_street"`
	ResCity                   string `json:"res_city"`
	ResDistrict               string `json:"res_district"`
	ResPostalCode             string `json:"res_postal_code"`
	DeliverySameAsResidential *bool  `json:"delivery_same_as_residential"`
	DelRecipientName          string `json:"del_recipient_name"`
	DelPhone                  string `json:"del_phone"`
	DelHouseNo                string `json:"del_house_no"`
	DelStreet                 string `json:"del_street"`
	DelCity                   string `json:"del_city"`
	DelDistrict               string `json:"del_district"`
	DelPostalCode             string `json:"del_postal_code"`
}

type AdminUpdateCustomerRequest struct {
	FirstName          string `json:"first_name" binding:"required,min=1,max=100"`
	LastName           string `json:"last_name" binding:"required,min=1,max=100"`
	Email              string `json:"email" binding:"required,email"`
	Phone              string `json:"phone" binding:"required,min=5,max=50"`
	BusinessName       string `json:"business_name"`
	ResidentialAddress string `json:"residential_address"`
	DeliveryAddress    string `json:"delivery_address"`
}

type CustomerStatusRequest struct {
	IsActive bool `json:"is_active"`
}

type AdminResetPasswordRequest struct {
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
	ConfirmPassword string `json:"confirm_password" binding:"required"`
}

type InitiateEmailChangeRequest struct {
	NewEmail string `json:"new_email" binding:"required,email"`
}

type VerifyEmailChangeRequest struct {
	VerificationID string `json:"verification_id" binding:"required"`
	NewEmail       string `json:"new_email" binding:"required,email"`
	OTP            string `json:"otp" binding:"required,len=6"`
}

type ResendEmailChangeRequest struct {
	VerificationID string `json:"verification_id" binding:"required"`
}

type OrderStatsDTO struct {
	TotalOrders      int64   `json:"total_orders"`
	CompletedOrders  int64   `json:"completed_orders"`
	PendingOrders    int64   `json:"pending_orders"`
	ProcessingOrders int64   `json:"processing_orders"`
	CancelledOrders  int64   `json:"cancelled_orders"`
	TotalAmountSpent float64 `json:"total_amount_spent"`
}

type CustomerResponse struct {
	ID                        string        `json:"id"`
	UserID                    *string       `json:"user_id"`
	Username                  string        `json:"username,omitempty"`
	FirstName                 string        `json:"first_name"`
	LastName                  string        `json:"last_name"`
	Name                      string        `json:"name"`
	Email                     string        `json:"email"`
	Phone                     string        `json:"phone"`
	BusinessName              string        `json:"business_name"`
	ResidentialAddress        string        `json:"residential_address"`
	DeliveryAddress           string        `json:"delivery_address"`
	ResHouseNo                string        `json:"res_house_no"`
	ResStreet                 string        `json:"res_street"`
	ResCity                   string        `json:"res_city"`
	ResDistrict               string        `json:"res_district"`
	ResPostalCode             string        `json:"res_postal_code"`
	DeliverySameAsResidential bool          `json:"delivery_same_as_residential"`
	DelRecipientName          string        `json:"del_recipient_name"`
	DelPhone                  string        `json:"del_phone"`
	DelHouseNo                string        `json:"del_house_no"`
	DelStreet                 string        `json:"del_street"`
	DelCity                   string        `json:"del_city"`
	DelDistrict               string        `json:"del_district"`
	DelPostalCode             string        `json:"del_postal_code"`
	MembershipTier            string        `json:"membership_tier"`
	LifetimeSpent             float64       `json:"lifetime_spent"`
	ProfilePhotoURL           string        `json:"profile_photo_url"`
	OrderCount                int64         `json:"order_count"`
	OrderStats                OrderStatsDTO `json:"order_stats"`
	IsActive                  bool          `json:"is_active"`
	PasswordStatus            string        `json:"password_status"` // Always "Protected" - never expose hash
	CreatedAt                 time.Time     `json:"created_at"`
	UpdatedAt                 time.Time     `json:"updated_at"`
}

type CustomerFilter struct {
	Search string
	Status string // "active", "inactive", "all"
	Tier   string // "all", "BRONZE", "SILVER", "GOLD", "PLATINUM"
	SortBy string // "created_at", "name", "lifetime_spent", "order_count"
	Order  string // "ASC", "DESC"
	Page   int
	Limit  int
}
