package dto

import "distribution-management/internal/users/dto"

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegisterCustomerRequest struct {
	FirstName                 string `json:"first_name" binding:"required,min=1,max=100"`
	LastName                  string `json:"last_name" binding:"required,min=1,max=100"`
	Username                  string `json:"username"` // Optional legacy field; customer email acts as username
	Email                     string `json:"email" binding:"required,email"`
	Password                  string `json:"password" binding:"required,min=6,max=100"`
	ConfirmPassword           string `json:"confirm_password"`
	Phone                     string `json:"phone" binding:"required,min=5,max=50"`
	ResidentialAddress        string `json:"residential_address"`
	Address                   string `json:"address"` // backwards compatibility fallback
	BusinessName              string `json:"business_name"`
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
	TermsAccepted             bool   `json:"terms_accepted"`
}

type VerifyRegistrationOTPRequest struct {
	VerificationID string `json:"verification_id" binding:"required"`
	Email          string `json:"email" binding:"required,email"`
	OTP            string `json:"otp" binding:"required,len=6"`
}

type ResendRegistrationOTPRequest struct {
	VerificationID string `json:"verification_id" binding:"required"`
	RecipientName  string `json:"recipient_name"`
}

type AuthResponse struct {
	Token              string           `json:"token"`
	TokenType          string           `json:"token_type"`
	ExpiresIn          int64            `json:"expires_in"` // seconds
	User               dto.UserResponse `json:"user"`
	BusinessName       string           `json:"business_name,omitempty"`
	Phone              string           `json:"phone,omitempty"`
	ResidentialAddress string           `json:"residential_address,omitempty"`
	DeliveryAddress    string           `json:"delivery_address,omitempty"`
	Address            string           `json:"address,omitempty"`
	MembershipTier     string           `json:"membership_tier,omitempty"`
}

type RegistrationVerifiedResponse struct {
	Message string           `json:"message"`
	Email   string           `json:"email"`
	User    dto.UserResponse `json:"user"`
}
