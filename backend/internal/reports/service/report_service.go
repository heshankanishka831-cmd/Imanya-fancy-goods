package service

import (
	"context"
	"wholesale-management/internal/reports/dto"

	"gorm.io/gorm"
)

type ReportService interface {
	GetDashboardMetrics(ctx context.Context) (*dto.DashboardMetricsResponse, error)
}

type reportService struct {
	db *gorm.DB
}

func NewReportService(db *gorm.DB) ReportService {
	return &reportService{db: db}
}

func (s *reportService) GetDashboardMetrics(ctx context.Context) (*dto.DashboardMetricsResponse, error) {
	var totalProducts int64
	_ = s.db.WithContext(ctx).Table("products").Where("is_active = true").Count(&totalProducts).Error

	var lowStockCount int64
	_ = s.db.WithContext(ctx).Table("product_stock").
		Where("(current_stock - allocated_stock) <= low_stock_threshold").
		Count(&lowStockCount).Error

	var totalOrders int64
	_ = s.db.WithContext(ctx).Table("orders").Count(&totalOrders).Error

	var totalVolume float64
	_ = s.db.WithContext(ctx).Table("orders").
		Where("status IN ('CONFIRMED', 'PROCESSING', 'COMPLETED')").
		Select("COALESCE(SUM(total_amount), 0)").
		Row().Scan(&totalVolume)

	var activeSuppliers int64
	_ = s.db.WithContext(ctx).Table("suppliers").Where("is_active = true").Count(&activeSuppliers).Error

	var pendingPOs int64
	_ = s.db.WithContext(ctx).Table("purchase_orders").
		Where("status IN ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED')").
		Count(&pendingPOs).Error

	// Status breakdown
	statusCounts := make(map[string]int64)
	type statusGroup struct {
		Status string
		Count  int64
	}
	var groups []statusGroup
	_ = s.db.WithContext(ctx).Table("orders").Select("status, count(*) as count").Group("status").Scan(&groups).Error
	for _, g := range groups {
		statusCounts[g.Status] = g.Count
	}

	// Recent orders
	type recentOrderRaw struct {
		ID          string
		OrderNumber string
		CustName    string
		TotalAmount float64
		Status      string
		CreatedAt   string
	}
	var recentRaw []recentOrderRaw
	_ = s.db.WithContext(ctx).Table("orders").
		Select("orders.id, orders.order_number, customers.name as cust_name, orders.total_amount, orders.status, TO_CHAR(orders.created_at, 'YYYY-MM-DD HH24:MI') as created_at").
		Joins("LEFT JOIN customers ON customers.id = orders.customer_id").
		Order("orders.created_at DESC").
		Limit(5).
		Scan(&recentRaw).Error

	var recentOrders []dto.RecentOrderDTO
	for _, r := range recentRaw {
		recentOrders = append(recentOrders, dto.RecentOrderDTO{
			ID:          r.ID,
			OrderNumber: r.OrderNumber,
			Customer:    r.CustName,
			TotalAmount: r.TotalAmount,
			Status:      r.Status,
			CreatedAt:   r.CreatedAt,
		})
	}

	// Low stock items
	type lowStockRaw struct {
		ProductID         string
		Name              string
		SKU               string
		AvailableStock    int
		LowStockThreshold int
	}
	var rawLow []lowStockRaw
	_ = s.db.WithContext(ctx).Table("product_stock").
		Select("product_stock.product_id, products.name, products.sku, (product_stock.current_stock - product_stock.allocated_stock) as available_stock, product_stock.low_stock_threshold").
		Joins("JOIN products ON products.id = product_stock.product_id").
		Where("(product_stock.current_stock - product_stock.allocated_stock) <= product_stock.low_stock_threshold").
		Order("available_stock ASC").
		Limit(5).
		Scan(&rawLow).Error

	var lowStockAlerts []dto.LowStockDTO
	for _, l := range rawLow {
		lowStockAlerts = append(lowStockAlerts, dto.LowStockDTO{
			ProductID:         l.ProductID,
			ProductName:       l.Name,
			SKU:               l.SKU,
			AvailableStock:    l.AvailableStock,
			LowStockThreshold: l.LowStockThreshold,
		})
	}

	return &dto.DashboardMetricsResponse{
		TotalProducts:    totalProducts,
		LowStockCount:    lowStockCount,
		TotalOrders:      totalOrders,
		PendingOrders:    statusCounts["PENDING"],
		CompletedOrders:  statusCounts["COMPLETED"],
		TotalOrderVolume: totalVolume,
		ActiveSuppliers:  activeSuppliers,
		PendingPOs:       pendingPOs,
		OrdersByStatus:   statusCounts,
		RecentOrders:     recentOrders,
		LowStockAlerts:   lowStockAlerts,
	}, nil
}
