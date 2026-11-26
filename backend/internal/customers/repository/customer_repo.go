package repository

import (
	"context"
	"fmt"
	"strings"

	"distribution-management/internal/customers/dto"
	"distribution-management/internal/customers/model"
	userModel "distribution-management/internal/users/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type CustomerRepository interface {
	GetByID(ctx context.Context, id string) (*model.Customer, error)
	GetByUserID(ctx context.Context, userID string) (*model.Customer, error)
	GetByPhone(ctx context.Context, phone string) (*model.Customer, error)
	Create(ctx context.Context, customer *model.Customer) error
	Update(ctx context.Context, customer *model.Customer) error
	UpdateProfileAtomic(ctx context.Context, user *userModel.User, customer *model.Customer) error
	List(ctx context.Context, filter dto.CustomerFilter) ([]model.Customer, int64, error)
	GetOrderCount(ctx context.Context, customerID string) (int64, error)
	GetOrderStats(ctx context.Context, customerID string) (*dto.OrderStatsDTO, error)
	GetOrderStatsBatch(ctx context.Context, customerIDs []string) (map[string]*dto.OrderStatsDTO, error)
	UpdateStatus(ctx context.Context, customerID string, isActive bool) error
	UpdateUserPassword(ctx context.Context, userID, newHash string) error
	GetUserByID(ctx context.Context, userID string) (*userModel.User, error)
	CheckUsernameAvailable(ctx context.Context, username, excludeUserID string) (bool, error)
	CheckEmailAvailable(ctx context.Context, email, excludeUserID, excludeCustomerID string) (bool, error)
	UpdateVerifiedEmailAndUsername(ctx context.Context, tx *gorm.DB, userID, customerID, newEmail string) error
}

type customerRepository struct {
	db *gorm.DB
}

func NewCustomerRepository(db *gorm.DB) CustomerRepository {
	return &customerRepository{db: db}
}

func (r *customerRepository) GetByID(ctx context.Context, id string) (*model.Customer, error) {
	var c model.Customer
	err := r.db.WithContext(ctx).Preload("User").Where("id = ?", id).First(&c).Error
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *customerRepository) GetByUserID(ctx context.Context, userID string) (*model.Customer, error) {
	var c model.Customer
	err := r.db.WithContext(ctx).Preload("User").Where("user_id = ?", userID).First(&c).Error
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *customerRepository) GetByPhone(ctx context.Context, phone string) (*model.Customer, error) {
	clean := strings.ReplaceAll(phone, "+", "")
	clean = strings.ReplaceAll(clean, " ", "")
	clean = strings.ReplaceAll(clean, "-", "")

	var variants []string
	variants = append(variants, phone, clean)
	if strings.HasPrefix(clean, "0") && len(clean) == 10 {
		variants = append(variants, "94"+clean[1:], "+94"+clean[1:])
	} else if strings.HasPrefix(clean, "94") && len(clean) == 11 {
		variants = append(variants, "0"+clean[2:], "+"+clean)
	}

	var c model.Customer
	err := r.db.WithContext(ctx).Preload("User").Where("phone IN ?", variants).First(&c).Error
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *customerRepository) Create(ctx context.Context, customer *model.Customer) error {
	return r.db.WithContext(ctx).Create(customer).Error
}

func (r *customerRepository) Update(ctx context.Context, customer *model.Customer) error {
	return r.db.WithContext(ctx).Omit(clause.Associations).Save(customer).Error
}

func (r *customerRepository) List(ctx context.Context, filter dto.CustomerFilter) ([]model.Customer, int64, error) {
	var list []model.Customer
	var total int64

	query := r.db.WithContext(ctx).Model(&model.Customer{}).Preload("User")

	// Search filter across name, first_name, last_name, phone, email, business_name, and linked username
	if filter.Search != "" {
		s := "%" + strings.TrimSpace(filter.Search) + "%"
		query = query.Joins("LEFT JOIN users ON users.id = customers.user_id").
			Where("customers.name ILIKE ? OR customers.first_name ILIKE ? OR customers.last_name ILIKE ? OR customers.phone ILIKE ? OR customers.business_name ILIKE ? OR customers.email ILIKE ? OR users.username ILIKE ?",
				s, s, s, s, s, s, s)
	}

	// Status filter
	if filter.Status != "" && strings.ToLower(filter.Status) != "all" {
		if strings.ToLower(filter.Status) == "active" {
			query = query.Where("customers.is_active = TRUE")
		} else if strings.ToLower(filter.Status) == "inactive" {
			query = query.Where("customers.is_active = FALSE")
		}
	}

	// Tier filter
	if filter.Tier != "" && strings.ToUpper(filter.Tier) != "ALL" {
		query = query.Where("customers.membership_tier = ?", strings.ToUpper(filter.Tier))
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Sorting
	orderDir := "DESC"
	if strings.ToUpper(filter.Order) == "ASC" {
		orderDir = "ASC"
	}

	sortCol := "customers.created_at"
	switch strings.ToLower(filter.SortBy) {
	case "name":
		sortCol = "customers.name"
	case "lifetime_spent":
		sortCol = "customers.lifetime_spent"
	case "membership_tier":
		sortCol = "customers.membership_tier"
	case "created_at":
		sortCol = "customers.created_at"
	default:
		sortCol = "customers.created_at"
	}

	query = query.Order(fmt.Sprintf("%s %s", sortCol, orderDir))

	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := 0
	if filter.Page > 1 {
		offset = (filter.Page - 1) * limit
	}

	err := query.Limit(limit).Offset(offset).Find(&list).Error
	return list, total, err
}

func (r *customerRepository) GetOrderCount(ctx context.Context, customerID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Table("orders").Where("customer_id = ?", customerID).Count(&count).Error
	return count, err
}

func (r *customerRepository) UpdateStatus(ctx context.Context, customerID string, isActive bool) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var c model.Customer
		if err := tx.Where("id = ?", customerID).First(&c).Error; err != nil {
			return err
		}

		if err := tx.Model(&model.Customer{}).Where("id = ?", customerID).Update("is_active", isActive).Error; err != nil {
			return err
		}

		// Also update linked user account if present
		if c.UserID != nil {
			if err := tx.Model(&userModel.User{}).Where("id = ?", *c.UserID).Update("is_active", isActive).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *customerRepository) UpdateUserPassword(ctx context.Context, userID, newHash string) error {
	return r.db.WithContext(ctx).Model(&userModel.User{}).Where("id = ?", userID).Update("password_hash", newHash).Error
}

func (r *customerRepository) GetUserByID(ctx context.Context, userID string) (*userModel.User, error) {
	var u userModel.User
	err := r.db.WithContext(ctx).Where("id = ?", userID).First(&u).Error
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *customerRepository) UpdateProfileAtomic(ctx context.Context, user *userModel.User, customer *model.Customer) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if user != nil {
			if err := tx.Model(&userModel.User{}).
				Where("id = ?", user.ID).
				Updates(map[string]interface{}{
					"username":   user.Username,
					"email":      user.Email,
					"first_name": user.FirstName,
					"last_name":  user.LastName,
					"updated_at": gorm.Expr("NOW()"),
				}).Error; err != nil {
				return err
			}
		}

		if err := tx.Save(customer).Error; err != nil {
			return err
		}
		return nil
	})
}

func (r *customerRepository) GetOrderStats(ctx context.Context, customerID string) (*dto.OrderStatsDTO, error) {
	var stats dto.OrderStatsDTO
	row := r.db.WithContext(ctx).Table("orders").
		Select(`
			COUNT(*) AS total_orders,
			COUNT(*) FILTER (WHERE status IN ('COMPLETED', 'DELIVERED')) AS completed_orders,
			COUNT(*) FILTER (WHERE status = 'PENDING') AS pending_orders,
			COUNT(*) FILTER (WHERE status IN ('CONFIRMED', 'PROCESSING')) AS processing_orders,
			COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_orders,
			COALESCE(SUM(total_amount) FILTER (WHERE status IN ('CONFIRMED', 'PROCESSING', 'COMPLETED', 'DELIVERED')), 0) AS total_amount_spent
		`).
		Where("customer_id = ?", customerID).
		Row()

	if err := row.Scan(
		&stats.TotalOrders,
		&stats.CompletedOrders,
		&stats.PendingOrders,
		&stats.ProcessingOrders,
		&stats.CancelledOrders,
		&stats.TotalAmountSpent,
	); err != nil {
		return &stats, err
	}
	return &stats, nil
}

func (r *customerRepository) GetOrderStatsBatch(ctx context.Context, customerIDs []string) (map[string]*dto.OrderStatsDTO, error) {
	result := make(map[string]*dto.OrderStatsDTO, len(customerIDs))
	if len(customerIDs) == 0 {
		return result, nil
	}

	type batchRow struct {
		CustomerID       string
		TotalOrders      int64
		CompletedOrders  int64
		PendingOrders    int64
		ProcessingOrders int64
		CancelledOrders  int64
		TotalAmountSpent float64
	}

	var rows []batchRow
	err := r.db.WithContext(ctx).Table("orders").
		Select(`
			customer_id,
			COUNT(*) AS total_orders,
			COUNT(*) FILTER (WHERE status IN ('COMPLETED', 'DELIVERED')) AS completed_orders,
			COUNT(*) FILTER (WHERE status = 'PENDING') AS pending_orders,
			COUNT(*) FILTER (WHERE status IN ('CONFIRMED', 'PROCESSING')) AS processing_orders,
			COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_orders,
			COALESCE(SUM(total_amount) FILTER (WHERE status IN ('CONFIRMED', 'PROCESSING', 'COMPLETED', 'DELIVERED')), 0) AS total_amount_spent
		`).
		Where("customer_id IN ?", customerIDs).
		Group("customer_id").
		Scan(&rows).Error
	if err != nil {
		return result, err
	}

	for _, row := range rows {
		result[row.CustomerID] = &dto.OrderStatsDTO{
			TotalOrders:      row.TotalOrders,
			CompletedOrders:  row.CompletedOrders,
			PendingOrders:    row.PendingOrders,
			ProcessingOrders: row.ProcessingOrders,
			CancelledOrders:  row.CancelledOrders,
			TotalAmountSpent: row.TotalAmountSpent,
		}
	}
	return result, nil
}

func (r *customerRepository) CheckUsernameAvailable(ctx context.Context, username, excludeUserID string) (bool, error) {
	var count int64
	q := r.db.WithContext(ctx).Table("users").
		Where("LOWER(username) = LOWER(?)", strings.TrimSpace(username))
	if strings.TrimSpace(excludeUserID) != "" {
		q = q.Where("id <> ?", strings.TrimSpace(excludeUserID))
	}
	if err := q.Count(&count).Error; err != nil {
		return false, err
	}
	return count == 0, nil
}

func (r *customerRepository) CheckEmailAvailable(ctx context.Context, email, excludeUserID, excludeCustomerID string) (bool, error) {
	var userCount int64
	uq := r.db.WithContext(ctx).Table("users").
		Where("LOWER(email) = LOWER(?)", strings.TrimSpace(email))
	if strings.TrimSpace(excludeUserID) != "" {
		uq = uq.Where("id <> ?", strings.TrimSpace(excludeUserID))
	}
	if err := uq.Count(&userCount).Error; err != nil {
		return false, err
	}
	if userCount > 0 {
		return false, nil
	}

	var custCount int64
	cq := r.db.WithContext(ctx).Table("customers").
		Where("LOWER(email) = LOWER(?)", strings.TrimSpace(email))
	if strings.TrimSpace(excludeCustomerID) != "" {
		cq = cq.Where("id <> ?", strings.TrimSpace(excludeCustomerID))
	}
	if err := cq.Count(&custCount).Error; err != nil {
		return false, err
	}
	return custCount == 0, nil
}

func (r *customerRepository) UpdateVerifiedEmailAndUsername(ctx context.Context, tx *gorm.DB, userID, customerID, newEmail string) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	normalized := strings.ToLower(strings.TrimSpace(newEmail))
	if err := db.WithContext(ctx).Model(&userModel.User{}).
		Where("id = ?", userID).
		Updates(map[string]interface{}{
			"email":          normalized,
			"username":       normalized,
			"email_verified": true,
			"updated_at":     gorm.Expr("NOW()"),
		}).Error; err != nil {
		return err
	}

	return db.WithContext(ctx).Model(&model.Customer{}).
		Where("id = ?", customerID).
		Updates(map[string]interface{}{
			"email":      normalized,
			"updated_at": gorm.Expr("NOW()"),
		}).Error
}
