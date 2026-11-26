package model

import (
	"time"
	userModel "distribution-management/internal/users/model"
)

type Customer struct {
	ID                         string          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID                     *string         `gorm:"type:uuid;unique" json:"user_id"`
	User                       *userModel.User `gorm:"foreignKey:UserID" json:"user"`
	FirstName                  string          `gorm:"type:varchar(100)" json:"first_name"`
	LastName                   string          `gorm:"type:varchar(100)" json:"last_name"`
	Name                       string          `gorm:"type:varchar(255);not null" json:"name"`
	Email                      string          `gorm:"type:varchar(255)" json:"email"`
	Phone                      string          `gorm:"type:varchar(50);not null" json:"phone"`
	BusinessName               string          `gorm:"type:varchar(255)" json:"business_name"`
	ResidentialAddress         string          `gorm:"type:text" json:"residential_address"`
	DeliveryAddress            string          `gorm:"type:text" json:"delivery_address"`
	ResHouseNo                 string          `gorm:"type:varchar(100)" json:"res_house_no"`
	ResStreet                  string          `gorm:"type:varchar(255)" json:"res_street"`
	ResCity                    string          `gorm:"type:varchar(120)" json:"res_city"`
	ResDistrict                string          `gorm:"type:varchar(100)" json:"res_district"`
	ResPostalCode              string          `gorm:"type:varchar(32)" json:"res_postal_code"`
	DeliverySameAsResidential  bool            `gorm:"not null;default:true" json:"delivery_same_as_residential"`
	DelRecipientName           string          `gorm:"type:varchar(150)" json:"del_recipient_name"`
	DelPhone                   string          `gorm:"type:varchar(50)" json:"del_phone"`
	DelHouseNo                 string          `gorm:"type:varchar(100)" json:"del_house_no"`
	DelStreet                  string          `gorm:"type:varchar(255)" json:"del_street"`
	DelCity                    string          `gorm:"type:varchar(120)" json:"del_city"`
	DelDistrict                string          `gorm:"type:varchar(100)" json:"del_district"`
	DelPostalCode              string          `gorm:"type:varchar(32)" json:"del_postal_code"`
	MembershipTier             string          `gorm:"type:varchar(32);not null;default:'BRONZE'" json:"membership_tier"`
	LifetimeSpent              float64         `gorm:"type:numeric(12,2);not null;default:0.00" json:"lifetime_spent"`
	ProfilePhotoURL            *string         `gorm:"type:text" json:"profile_photo_url"`
	IsActive                   bool            `gorm:"not null;default:true" json:"is_active"`
	CreatedAt                  time.Time       `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt                  time.Time       `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Customer) TableName() string {
	return "customers"
}
