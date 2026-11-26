package service

import (
	"context"
	"errors"
	"fmt"
	"mime/multipart"
	"net/mail"
	"strings"

	"distribution-management/internal/audit/service"
	"distribution-management/internal/customers/dto"
	"distribution-management/internal/customers/model"
	"distribution-management/internal/customers/repository"
	otpRepoPkg "distribution-management/internal/otp/repository"
	otpSvc "distribution-management/internal/otp/service"
	emailPkg "distribution-management/internal/platform/email"
	"distribution-management/internal/platform/storage"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type CustomerService interface {
	ConfigureEmailVerification(otpService otpSvc.OTPService, otpRepo otpRepoPkg.OTPRepository, db *gorm.DB)
	ConfigureStorage(storage *storage.DiskStorage)
	GetOrCreateByPhone(ctx context.Context, name, phone, email, address string) (*model.Customer, error)
	GetProfileByUserID(ctx context.Context, userID string) (*dto.CustomerResponse, error)
	UpdateProfile(ctx context.Context, userID string, req *dto.CustomerProfileRequest, ip, ua string) (*dto.CustomerResponse, error)
	UploadProfilePhoto(ctx context.Context, userID string, file *multipart.FileHeader, ip, ua string) (*dto.CustomerResponse, error)
	RemoveProfilePhoto(ctx context.Context, userID string, ip, ua string) (*dto.CustomerResponse, error)
	InitiateEmailChange(ctx context.Context, userID string, req *dto.InitiateEmailChangeRequest, ip string) (*otpSvc.OTPChallenge, error)
	VerifyEmailChange(ctx context.Context, userID string, req *dto.VerifyEmailChangeRequest, ip, ua string) (*dto.CustomerResponse, error)
	ResendEmailChangeOTP(ctx context.Context, userID, verificationID string) (*otpSvc.OTPChallenge, error)
	ChangePassword(ctx context.Context, userID string, req *dto.ChangePasswordRequest, ip, ua string) error
	GetByID(ctx context.Context, id string) (*dto.CustomerResponse, error)
	List(ctx context.Context, filter dto.CustomerFilter) ([]dto.CustomerResponse, int64, error)
	AdminUpdate(ctx context.Context, actorID, id string, req *dto.AdminUpdateCustomerRequest, ip, ua string) (*dto.CustomerResponse, error)
	UpdateStatus(ctx context.Context, actorID, id string, req *dto.CustomerStatusRequest, ip, ua string) (*dto.CustomerResponse, error)
	AdminResetPassword(ctx context.Context, actorID, id string, req *dto.AdminResetPasswordRequest, ip, ua string) error
}

type customerService struct {
	repo         repository.CustomerRepository
	auditService service.AuditService
	otpService   otpSvc.OTPService
	otpRepo      otpRepoPkg.OTPRepository
	storage      *storage.DiskStorage
	db           *gorm.DB
}

func NewCustomerService(repo repository.CustomerRepository, auditService service.AuditService) CustomerService {
	return &customerService{repo: repo, auditService: auditService}
}

func (s *customerService) ConfigureEmailVerification(otpService otpSvc.OTPService, otpRepo otpRepoPkg.OTPRepository, db *gorm.DB) {
	s.otpService = otpService
	s.otpRepo = otpRepo
	s.db = db
}

func (s *customerService) ConfigureStorage(diskStorage *storage.DiskStorage) {
	s.storage = diskStorage
}

func countPhoneDigits(phone string) int {
	digits := 0
	for _, r := range phone {
		if r >= '0' && r <= '9' {
			digits++
		}
	}
	return digits
}

func formatStructuredAddress(houseNo, street, city, district, postalCode string) string {
	parts := []string{
		strings.TrimSpace(houseNo),
		strings.TrimSpace(street),
		strings.TrimSpace(city),
		strings.TrimSpace(district),
		strings.TrimSpace(postalCode),
	}
	var nonEmpty []string
	for _, p := range parts {
		if p != "" {
			nonEmpty = append(nonEmpty, p)
		}
	}
	return strings.Join(nonEmpty, ", ")
}

func (s *customerService) GetOrCreateByPhone(ctx context.Context, name, phone, email, address string) (*model.Customer, error) {
	c, err := s.repo.GetByPhone(ctx, phone)
	if err == nil && c != nil {
		if name != "" {
			c.Name = name
		}
		if email != "" && c.Email == "" {
			c.Email = email
		}
		if address != "" && c.DeliveryAddress == "" {
			c.DeliveryAddress = address
		}
		_ = s.repo.Update(ctx, c)
		return c, nil
	}

	parts := strings.SplitN(name, " ", 2)
	firstName := parts[0]
	lastName := ""
	if len(parts) > 1 {
		lastName = parts[1]
	}

	newCustomer := &model.Customer{
		FirstName:                 firstName,
		LastName:                  lastName,
		Name:                      name,
		Phone:                     phone,
		Email:                     email,
		ResidentialAddress:        address,
		DeliveryAddress:           address,
		DeliverySameAsResidential: true,
		MembershipTier:            "BRONZE",
		LifetimeSpent:             0.00,
		IsActive:                  true,
	}

	if err := s.repo.Create(ctx, newCustomer); err != nil {
		return nil, err
	}
	return newCustomer, nil
}

func (s *customerService) GetProfileByUserID(ctx context.Context, userID string) (*dto.CustomerResponse, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, errors.New("authenticated user identity is required")
	}

	c, err := s.repo.GetByUserID(ctx, userID)
	if err != nil || c == nil {
		return nil, errors.New("customer profile not found for this user account")
	}

	stats, _ := s.repo.GetOrderStats(ctx, c.ID)
	return toCustomerResponse(c, stats), nil
}

func (s *customerService) UpdateProfile(ctx context.Context, userID string, req *dto.CustomerProfileRequest, ip, ua string) (*dto.CustomerResponse, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, errors.New("authenticated user identity is required")
	}

	c, err := s.repo.GetByUserID(ctx, userID)
	if err != nil || c == nil {
		return nil, errors.New("customer profile not found")
	}

	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil || user == nil {
		return nil, errors.New("linked user account not found")
	}

	firstName := strings.TrimSpace(req.FirstName)
	lastName := strings.TrimSpace(req.LastName)
	if firstName == "" || lastName == "" {
		return nil, errors.New("first name and last name are required")
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email != "" {
		if _, err := mail.ParseAddress(email); err != nil || !strings.Contains(email, ".") {
			return nil, errors.New("please provide a valid email address")
		}
		// Never allow unverified email changes via regular profile update
		if !strings.EqualFold(email, user.Email) || (c.Email != "" && !strings.EqualFold(email, c.Email)) {
			return nil, errors.New("changing your email address requires OTP verification of the new email")
		}
	}

	phone := strings.TrimSpace(req.Phone)
	digits := countPhoneDigits(phone)
	if digits < 9 || digits > 15 {
		return nil, errors.New("please provide a valid WhatsApp phone number (9 to 15 digits)")
	}

	oldVal := *c
	oldVal.User = nil

	c.FirstName = firstName
	c.LastName = lastName
	c.Name = fmt.Sprintf("%s %s", firstName, lastName)
	c.Phone = phone
	c.BusinessName = strings.TrimSpace(req.BusinessName)

	// Update permitted linked user name fields only (email/username only update after OTP verification)
	user.FirstName = firstName
	user.LastName = lastName

	// Process structured Residential Address
	hasStructuredRes := strings.TrimSpace(req.ResHouseNo) != "" ||
		strings.TrimSpace(req.ResStreet) != "" ||
		strings.TrimSpace(req.ResCity) != "" ||
		strings.TrimSpace(req.ResDistrict) != "" ||
		strings.TrimSpace(req.ResPostalCode) != ""

	if hasStructuredRes {
		if strings.TrimSpace(req.ResHouseNo) == "" ||
			strings.TrimSpace(req.ResStreet) == "" ||
			strings.TrimSpace(req.ResCity) == "" ||
			strings.TrimSpace(req.ResDistrict) == "" {
			return nil, errors.New("house/building, street, city/town, and district are required for the residential address")
		}
		c.ResHouseNo = strings.TrimSpace(req.ResHouseNo)
		c.ResStreet = strings.TrimSpace(req.ResStreet)
		c.ResCity = strings.TrimSpace(req.ResCity)
		c.ResDistrict = strings.TrimSpace(req.ResDistrict)
		c.ResPostalCode = strings.TrimSpace(req.ResPostalCode)
		c.ResidentialAddress = formatStructuredAddress(c.ResHouseNo, c.ResStreet, c.ResCity, c.ResDistrict, c.ResPostalCode)
	} else if strings.TrimSpace(req.ResidentialAddress) != "" {
		c.ResidentialAddress = strings.TrimSpace(req.ResidentialAddress)
	} else if strings.TrimSpace(c.ResidentialAddress) == "" {
		return nil, errors.New("residential address is required")
	}

	// Process Delivery Address & ON/OFF Toggle Preference
	if req.DeliverySameAsResidential != nil {
		c.DeliverySameAsResidential = *req.DeliverySameAsResidential
	}

	// Preserve separate delivery fields if sent even when toggle is ON
	if req.DelRecipientName != "" {
		c.DelRecipientName = strings.TrimSpace(req.DelRecipientName)
	}
	if req.DelPhone != "" {
		c.DelPhone = strings.TrimSpace(req.DelPhone)
	}
	if req.DelHouseNo != "" {
		c.DelHouseNo = strings.TrimSpace(req.DelHouseNo)
	}
	if req.DelStreet != "" {
		c.DelStreet = strings.TrimSpace(req.DelStreet)
	}
	if req.DelCity != "" {
		c.DelCity = strings.TrimSpace(req.DelCity)
	}
	if req.DelDistrict != "" {
		c.DelDistrict = strings.TrimSpace(req.DelDistrict)
	}
	if req.DelPostalCode != "" {
		c.DelPostalCode = strings.TrimSpace(req.DelPostalCode)
	}

	if c.DeliverySameAsResidential {
		c.DeliveryAddress = c.ResidentialAddress
	} else {
		hasStructuredDel := strings.TrimSpace(req.DelHouseNo) != "" ||
			strings.TrimSpace(req.DelStreet) != "" ||
			strings.TrimSpace(req.DelCity) != "" ||
			strings.TrimSpace(req.DelDistrict) != ""

		if hasStructuredDel {
			if strings.TrimSpace(req.DelHouseNo) == "" ||
				strings.TrimSpace(req.DelStreet) == "" ||
				strings.TrimSpace(req.DelCity) == "" ||
				strings.TrimSpace(req.DelDistrict) == "" {
				return nil, errors.New("house/building, street, city/town, and district are required for the separate delivery address")
			}

			delPhone := strings.TrimSpace(req.DelPhone)
			if delPhone == "" {
				delPhone = phone
			} else if d := countPhoneDigits(delPhone); d < 9 || d > 15 {
				return nil, errors.New("please provide a valid delivery contact number (9 to 15 digits)")
			}

			recipient := strings.TrimSpace(req.DelRecipientName)
			if recipient == "" {
				recipient = c.Name
			}

			c.DelRecipientName = recipient
			c.DelPhone = delPhone
			c.DelHouseNo = strings.TrimSpace(req.DelHouseNo)
			c.DelStreet = strings.TrimSpace(req.DelStreet)
			c.DelCity = strings.TrimSpace(req.DelCity)
			c.DelDistrict = strings.TrimSpace(req.DelDistrict)
			c.DelPostalCode = strings.TrimSpace(req.DelPostalCode)

			formattedDel := formatStructuredAddress(c.DelHouseNo, c.DelStreet, c.DelCity, c.DelDistrict, c.DelPostalCode)
			c.DeliveryAddress = fmt.Sprintf("%s (Recipient: %s, Contact: %s)", formattedDel, recipient, delPhone)
		} else if strings.TrimSpace(req.DeliveryAddress) != "" {
			c.DeliveryAddress = strings.TrimSpace(req.DeliveryAddress)
		} else if strings.TrimSpace(c.DeliveryAddress) == "" {
			return nil, errors.New("separate delivery address details are required when residential toggle is off")
		}
	}

	if err := s.repo.UpdateProfileAtomic(ctx, user, c); err != nil {
		return nil, fmt.Errorf("failed to update profile: %w", err)
	}

	c.User = user
	auditNew := *c
	auditNew.User = nil
	s.auditService.LogAction(ctx, &userID, "UPDATE_CUSTOMER_PROFILE", "customers", c.ID, oldVal, auditNew, ip, ua)

	stats, _ := s.repo.GetOrderStats(ctx, c.ID)
	return toCustomerResponse(c, stats), nil
}

func (s *customerService) InitiateEmailChange(ctx context.Context, userID string, req *dto.InitiateEmailChangeRequest, ip string) (*otpSvc.OTPChallenge, error) {
	if s.otpService == nil {
		return nil, errors.New("email verification service is unavailable")
	}
	if strings.TrimSpace(userID) == "" {
		return nil, errors.New("authenticated user identity is required")
	}

	c, err := s.repo.GetByUserID(ctx, userID)
	if err != nil || c == nil {
		return nil, errors.New("customer profile not found")
	}
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil || user == nil {
		return nil, errors.New("linked user account not found")
	}

	newEmail := strings.ToLower(strings.TrimSpace(req.NewEmail))
	if _, err := mail.ParseAddress(newEmail); err != nil || !strings.Contains(newEmail, ".") {
		return nil, errors.New("please provide a valid new email address")
	}
	if strings.EqualFold(newEmail, user.Email) {
		return nil, errors.New("the new email address must be different from your current email")
	}

	emailOK, err := s.repo.CheckEmailAvailable(ctx, newEmail, userID, c.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify email availability: %w", err)
	}
	if !emailOK {
		return nil, errors.New("this email address is already registered to another account")
	}
	usernameOK, err := s.repo.CheckUsernameAvailable(ctx, newEmail, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify username availability: %w", err)
	}
	if !usernameOK {
		return nil, errors.New("this email address is already used as a login identifier by another account")
	}

	challenge, err := s.otpService.IssueOTP(ctx, otpSvc.IssueOTPParams{
		Purpose:       emailPkg.PurposeChangeEmail,
		Email:         newEmail,
		RecipientName: c.Name,
		UserID:        &userID,
		RequestIP:     ip,
	})
	if err != nil {
		return nil, err
	}

	s.auditService.LogAction(ctx, &userID, "CUSTOMER_EMAIL_CHANGE_OTP_SENT", "customers", c.ID, map[string]string{"old_email": user.Email}, map[string]string{"pending_email": newEmail}, ip, "")
	return challenge, nil
}

func (s *customerService) VerifyEmailChange(ctx context.Context, userID string, req *dto.VerifyEmailChangeRequest, ip, ua string) (*dto.CustomerResponse, error) {
	if s.otpService == nil || s.otpRepo == nil {
		return nil, errors.New("email verification service is unavailable")
	}
	if strings.TrimSpace(userID) == "" {
		return nil, errors.New("authenticated user identity is required")
	}

	// Enforce ownership BEFORE attempting OTP consumption
	existingOTP, err := s.otpRepo.GetByID(ctx, strings.TrimSpace(req.VerificationID))
	if err != nil || existingOTP == nil || existingOTP.UserID == nil || *existingOTP.UserID != userID {
		return nil, errors.New("verification session not found for this account")
	}

	c, err := s.repo.GetByUserID(ctx, userID)
	if err != nil || c == nil {
		return nil, errors.New("customer profile not found")
	}
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil || user == nil {
		return nil, errors.New("linked user account not found")
	}

	newEmail := strings.ToLower(strings.TrimSpace(req.NewEmail))
	oldEmail := user.Email

	applyVerification := func(tx *gorm.DB) error {
		rec, err := s.otpService.VerifyAndConsume(ctx, tx, req.VerificationID, newEmail, emailPkg.PurposeChangeEmail, req.OTP)
		if err != nil {
			return err
		}
		if rec.UserID == nil || *rec.UserID != userID {
			return errors.New("you do not have permission to verify this email session")
		}

		emailOK, err := s.repo.CheckEmailAvailable(ctx, newEmail, userID, c.ID)
		if err != nil {
			return fmt.Errorf("failed to verify email availability: %w", err)
		}
		if !emailOK {
			return errors.New("this email address is already registered to another account")
		}
		usernameOK, err := s.repo.CheckUsernameAvailable(ctx, newEmail, userID)
		if err != nil {
			return fmt.Errorf("failed to verify username availability: %w", err)
		}
		if !usernameOK {
			return errors.New("this email address is already used by another account")
		}

		return s.repo.UpdateVerifiedEmailAndUsername(ctx, tx, userID, c.ID, newEmail)
	}

	if s.db != nil {
		if err := s.db.WithContext(ctx).Transaction(applyVerification); err != nil {
			return nil, err
		}
	} else {
		if err := applyVerification(nil); err != nil {
			return nil, err
		}
	}

	s.auditService.LogAction(ctx, &userID, "CUSTOMER_EMAIL_CHANGED", "customers", c.ID, map[string]string{"email": oldEmail}, map[string]string{"email": newEmail, "username": newEmail}, ip, ua)
	return s.GetProfileByUserID(ctx, userID)
}

func (s *customerService) ResendEmailChangeOTP(ctx context.Context, userID, verificationID string) (*otpSvc.OTPChallenge, error) {
	if s.otpService == nil || s.otpRepo == nil {
		return nil, errors.New("email verification service is unavailable")
	}
	existingOTP, err := s.otpRepo.GetByID(ctx, strings.TrimSpace(verificationID))
	if err != nil || existingOTP == nil || existingOTP.UserID == nil || *existingOTP.UserID != userID {
		return nil, errors.New("verification session not found for this account")
	}
	c, _ := s.repo.GetByUserID(ctx, userID)
	name := "Valued Customer"
	if c != nil && c.Name != "" {
		name = c.Name
	}
	return s.otpService.ResendOTP(ctx, verificationID, emailPkg.PurposeChangeEmail, name)
}

func (s *customerService) ChangePassword(ctx context.Context, userID string, req *dto.ChangePasswordRequest, ip, ua string) error {
	if strings.TrimSpace(userID) == "" {
		return errors.New("authenticated user identity is required")
	}
	if req.NewPassword != req.ConfirmPassword {
		return errors.New("new password and confirmation password do not match")
	}
	if len(req.NewPassword) < 8 {
		return errors.New("new password must be at least 8 characters long")
	}

	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil || user == nil {
		return errors.New("user account not found")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		return errors.New("current password is incorrect")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.NewPassword)); err == nil {
		return errors.New("new password must be different from your current password")
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("failed to secure new password")
	}

	if err := s.repo.UpdateUserPassword(ctx, userID, string(newHash)); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	s.auditService.LogAction(ctx, &userID, "CUSTOMER_CHANGE_PASSWORD", "users", userID, nil, nil, ip, ua)
	return nil
}

func (s *customerService) GetByID(ctx context.Context, id string) (*dto.CustomerResponse, error) {
	c, err := s.repo.GetByID(ctx, id)
	if err != nil || c == nil {
		return nil, errors.New("customer not found")
	}
	stats, _ := s.repo.GetOrderStats(ctx, c.ID)
	return toCustomerResponse(c, stats), nil
}

func (s *customerService) List(ctx context.Context, filter dto.CustomerFilter) ([]dto.CustomerResponse, int64, error) {
	list, total, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	ids := make([]string, 0, len(list))
	for _, c := range list {
		ids = append(ids, c.ID)
	}
	statsMap, _ := s.repo.GetOrderStatsBatch(ctx, ids)

	res := make([]dto.CustomerResponse, 0, len(list))
	for _, c := range list {
		stats := statsMap[c.ID]
		res = append(res, *toCustomerResponse(&c, stats))
	}

	return res, total, nil
}

func (s *customerService) AdminUpdate(ctx context.Context, actorID, id string, req *dto.AdminUpdateCustomerRequest, ip, ua string) (*dto.CustomerResponse, error) {
	c, err := s.repo.GetByID(ctx, id)
	if err != nil || c == nil {
		return nil, errors.New("customer not found")
	}

	oldVal := *c
	oldVal.User = nil
	c.FirstName = req.FirstName
	c.LastName = req.LastName
	c.Name = fmt.Sprintf("%s %s", strings.TrimSpace(req.FirstName), strings.TrimSpace(req.LastName))
	c.Email = req.Email
	c.Phone = req.Phone
	c.BusinessName = req.BusinessName
	c.ResidentialAddress = req.ResidentialAddress
	if req.DeliveryAddress != "" && strings.TrimSpace(req.DeliveryAddress) != strings.TrimSpace(req.ResidentialAddress) {
		c.DeliveryAddress = req.DeliveryAddress
		c.DeliverySameAsResidential = false
	} else {
		c.DeliveryAddress = req.ResidentialAddress
		c.DeliverySameAsResidential = true
	}

	if err := s.repo.Update(ctx, c); err != nil {
		return nil, fmt.Errorf("failed to update customer: %w", err)
	}

	auditNew := *c
	auditNew.User = nil
	s.auditService.LogAction(ctx, &actorID, "ADMIN_UPDATE_CUSTOMER", "customers", c.ID, oldVal, auditNew, ip, ua)

	stats, _ := s.repo.GetOrderStats(ctx, c.ID)
	return toCustomerResponse(c, stats), nil
}

func (s *customerService) UpdateStatus(ctx context.Context, actorID, id string, req *dto.CustomerStatusRequest, ip, ua string) (*dto.CustomerResponse, error) {
	if err := s.repo.UpdateStatus(ctx, id, req.IsActive); err != nil {
		return nil, fmt.Errorf("failed to update customer status: %w", err)
	}

	statusStr := "ACTIVATED"
	if !req.IsActive {
		statusStr = "DEACTIVATED"
	}
	s.auditService.LogAction(ctx, &actorID, "UPDATE_CUSTOMER_STATUS", "customers", id, nil, map[string]string{"status": statusStr}, ip, ua)

	return s.GetByID(ctx, id)
}

func (s *customerService) AdminResetPassword(ctx context.Context, actorID, id string, req *dto.AdminResetPasswordRequest, ip, ua string) error {
	c, err := s.repo.GetByID(ctx, id)
	if err != nil || c == nil {
		return errors.New("customer not found")
	}

	if c.UserID == nil {
		return errors.New("this customer does not have an active user login account")
	}

	if len(req.NewPassword) < 6 {
		return errors.New("new password must be at least 6 characters long")
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("failed to secure password")
	}

	if err := s.repo.UpdateUserPassword(ctx, *c.UserID, string(newHash)); err != nil {
		return fmt.Errorf("failed to reset password: %w", err)
	}

	s.auditService.LogAction(ctx, &actorID, "ADMIN_RESET_CUSTOMER_PASSWORD", "users", *c.UserID, nil, nil, ip, ua)
	return nil
}

func toCustomerResponse(c *model.Customer, stats *dto.OrderStatsDTO) *dto.CustomerResponse {
	username := ""
	if c.User != nil {
		username = c.User.Username
	}

	firstName := c.FirstName
	lastName := c.LastName
	if firstName == "" && lastName == "" && c.Name != "" {
		parts := strings.SplitN(c.Name, " ", 2)
		firstName = parts[0]
		if len(parts) > 1 {
			lastName = parts[1]
		}
	}

	fullName := c.Name
	if fullName == "" {
		fullName = strings.TrimSpace(fmt.Sprintf("%s %s", firstName, lastName))
	}

	resAddress := c.ResidentialAddress
	if resAddress == "" {
		resAddress = c.DeliveryAddress
	}

	var orderStats dto.OrderStatsDTO
	if stats != nil {
		orderStats = *stats
	}

	return &dto.CustomerResponse{
		ID:                        c.ID,
		UserID:                    c.UserID,
		Username:                  username,
		FirstName:                 firstName,
		LastName:                  lastName,
		Name:                      fullName,
		Email:                     c.Email,
		Phone:                     c.Phone,
		BusinessName:              c.BusinessName,
		ResidentialAddress:        resAddress,
		DeliveryAddress:           c.DeliveryAddress,
		ResHouseNo:                c.ResHouseNo,
		ResStreet:                 c.ResStreet,
		ResCity:                   c.ResCity,
		ResDistrict:               c.ResDistrict,
		ResPostalCode:             c.ResPostalCode,
		DeliverySameAsResidential: c.DeliverySameAsResidential,
		DelRecipientName:          c.DelRecipientName,
		DelPhone:                  c.DelPhone,
		DelHouseNo:                c.DelHouseNo,
		DelStreet:                 c.DelStreet,
		DelCity:                   c.DelCity,
		DelDistrict:               c.DelDistrict,
		DelPostalCode:             c.DelPostalCode,
		MembershipTier:            c.MembershipTier,
		LifetimeSpent:             c.LifetimeSpent,
		ProfilePhotoURL:           derefString(c.ProfilePhotoURL),
		OrderCount:                orderStats.TotalOrders,
		OrderStats:                orderStats,
		IsActive:                  c.IsActive,
		PasswordStatus:            "Protected", // Never expose hash
		CreatedAt:                 c.CreatedAt,
		UpdatedAt:                 c.UpdatedAt,
	}
}

func derefString(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func (s *customerService) UploadProfilePhoto(ctx context.Context, userID string, file *multipart.FileHeader, ip, ua string) (*dto.CustomerResponse, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, errors.New("authenticated user identity is required")
	}
	if file == nil {
		return nil, errors.New("no image file provided")
	}
	if s.storage == nil {
		return nil, errors.New("file storage service is not configured")
	}

	c, err := s.repo.GetByUserID(ctx, userID)
	if err != nil || c == nil {
		return nil, errors.New("customer profile not found")
	}

	oldPhotoURL := derefString(c.ProfilePhotoURL)

	// Save and validate new image before modifying DB or deleting old image
	newPhotoURL, err := s.storage.SaveImage(file)
	if err != nil {
		return nil, err
	}

	c.ProfilePhotoURL = &newPhotoURL
	if err := s.repo.Update(ctx, c); err != nil {
		// Rollback newly written file if DB save fails
		_ = s.storage.DeleteImage(newPhotoURL)
		return nil, fmt.Errorf("failed to update profile photo: %w", err)
	}

	if oldPhotoURL != "" && oldPhotoURL != newPhotoURL {
		_ = s.storage.DeleteImage(oldPhotoURL)
	}

	s.auditService.LogAction(ctx, &userID, "UPLOAD_PROFILE_PHOTO", "customers", c.ID,
		map[string]string{"profile_photo_url": oldPhotoURL},
		map[string]string{"profile_photo_url": newPhotoURL},
		ip, ua,
	)

	stats, _ := s.repo.GetOrderStats(ctx, c.ID)
	return toCustomerResponse(c, stats), nil
}

func (s *customerService) RemoveProfilePhoto(ctx context.Context, userID string, ip, ua string) (*dto.CustomerResponse, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, errors.New("authenticated user identity is required")
	}

	c, err := s.repo.GetByUserID(ctx, userID)
	if err != nil || c == nil {
		return nil, errors.New("customer profile not found")
	}

	oldPhotoURL := derefString(c.ProfilePhotoURL)
	c.ProfilePhotoURL = nil
	if err := s.repo.Update(ctx, c); err != nil {
		return nil, fmt.Errorf("failed to remove profile photo: %w", err)
	}

	if oldPhotoURL != "" && s.storage != nil {
		_ = s.storage.DeleteImage(oldPhotoURL)
	}

	s.auditService.LogAction(ctx, &userID, "REMOVE_PROFILE_PHOTO", "customers", c.ID,
		map[string]string{"profile_photo_url": oldPhotoURL},
		map[string]string{"profile_photo_url": ""},
		ip, ua,
	)

	stats, _ := s.repo.GetOrderStats(ctx, c.ID)
	return toCustomerResponse(c, stats), nil
}
