package service

import (
	"context"
	"time"
	"wholesale-management/internal/reports/dto"

	"gorm.io/gorm"
)

type ReportService interface {
	GetDashboardMetrics(ctx context.Context) (*dto.DashboardMetricsResponse, error)
	GetSalesReport(ctx context.Context, period string) (*dto.SalesReportResponse, error)
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

	var outOfStockCount int64
	_ = s.db.WithContext(ctx).Table("product_stock").
		Where("current_stock = 0").
		Count(&outOfStockCount).Error

	var totalOrders int64
	_ = s.db.WithContext(ctx).Table("orders").Count(&totalOrders).Error

	var totalVolume float64
	_ = s.db.WithContext(ctx).Table("orders").
		Where("status IN ('CONFIRMED', 'PROCESSING', 'COMPLETED', 'DELIVERED')").
		Select("COALESCE(SUM(total_amount), 0)").
		Row().Scan(&totalVolume)

	var totalCustomers int64
	_ = s.db.WithContext(ctx).Table("customers").Where("is_active = true").Count(&totalCustomers).Error

	var inventoryValuation float64
	_ = s.db.WithContext(ctx).Table("product_stock").
		Joins("JOIN products ON products.id = product_stock.product_id").
		Select("COALESCE(SUM(product_stock.current_stock * products.cost_price), 0)").
		Row().Scan(&inventoryValuation)

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

	recentOrders := make([]dto.RecentOrderDTO, 0)
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

	lowStockAlerts := make([]dto.LowStockDTO, 0)
	for _, l := range rawLow {
		lowStockAlerts = append(lowStockAlerts, dto.LowStockDTO{
			ProductID:         l.ProductID,
			ProductName:       l.Name,
			SKU:               l.SKU,
			AvailableStock:    l.AvailableStock,
			LowStockThreshold: l.LowStockThreshold,
		})
	}

	// 7-Day sales and revenue breakdown for live dashboard diagrams
	type dailyRaw struct {
		Date    string
		Orders  int64
		Revenue float64
	}
	var rawDailies []dailyRaw
	_ = s.db.WithContext(ctx).Table("orders").
		Select("TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as revenue").
		Where("created_at >= NOW() - INTERVAL '7 days'").
		Where("status != 'CANCELLED'").
		Group("TO_CHAR(created_at, 'YYYY-MM-DD')").
		Order("date ASC").
		Scan(&rawDailies).Error

	dailyMap := make(map[string]dailyRaw)
	for _, d := range rawDailies {
		dailyMap[d.Date] = d
	}

	weeklySales := make([]dto.DailySalesDTO, 0, 7)
	nowTime := time.Now()
	for i := 6; i >= 0; i-- {
		dayStr := nowTime.AddDate(0, 0, -i).Format("2006-01-02")
		if d, exists := dailyMap[dayStr]; exists {
			weeklySales = append(weeklySales, dto.DailySalesDTO{
				Date:    dayStr,
				Orders:  d.Orders,
				Revenue: d.Revenue,
			})
		} else {
			weeklySales = append(weeklySales, dto.DailySalesDTO{
				Date:    dayStr,
				Orders:  0,
				Revenue: 0,
			})
		}
	}

	return &dto.DashboardMetricsResponse{
		TotalProducts:      totalProducts,
		LowStockCount:      lowStockCount,
		OutOfStockCount:    outOfStockCount,
		TotalOrders:        totalOrders,
		PendingOrders:      statusCounts["PENDING"],
		ProcessingOrders:   statusCounts["PROCESSING"],
		CompletedOrders:    statusCounts["DELIVERED"] + statusCounts["COMPLETED"],
		TotalOrderVolume:   totalVolume,
		InventoryValuation: inventoryValuation,
		TotalCustomers:     totalCustomers,
		ActiveSuppliers:    activeSuppliers,
		PendingPOs:         pendingPOs,
		OrdersByStatus:     statusCounts,
		RecentOrders:       recentOrders,
		LowStockAlerts:     lowStockAlerts,
		WeeklySales:        weeklySales,
	}, nil
}

func (s *reportService) GetSalesReport(ctx context.Context, period string) (*dto.SalesReportResponse, error) {
	now := time.Now()
	var startDate time.Time
	endDate := now

	dateFilter := "1=1"
	switch period {
	case "weekly":
		startDate = now.AddDate(0, 0, -7)
		dateFilter = "created_at >= NOW() - INTERVAL '7 days'"
	case "monthly":
		startDate = now.AddDate(0, -1, 0)
		dateFilter = "created_at >= NOW() - INTERVAL '30 days'"
	default:
		period = "all"
		startDate = now.AddDate(-1, 0, 0)
	}

	// Revenue & Order counts
	var totalRevenue float64
	_ = s.db.WithContext(ctx).Table("orders").
		Where(dateFilter).
		Where("status != 'CANCELLED'").
		Select("COALESCE(SUM(total_amount), 0)").
		Row().Scan(&totalRevenue)

	var totalOrders int64
	_ = s.db.WithContext(ctx).Table("orders").Where(dateFilter).Count(&totalOrders).Error

	var completedOrders int64
	_ = s.db.WithContext(ctx).Table("orders").Where(dateFilter).Where("status = 'COMPLETED'").Count(&completedOrders).Error

	var pendingOrders int64
	_ = s.db.WithContext(ctx).Table("orders").Where(dateFilter).Where("status = 'PENDING'").Count(&pendingOrders).Error

	var avgOrder float64
	if totalOrders > 0 {
		avgOrder = totalRevenue / float64(totalOrders)
	}

	// Total wholesale units sold
	var totalUnits int64
	_ = s.db.WithContext(ctx).Table("order_items").
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("orders." + dateFilter).
		Where("orders.status != 'CANCELLED'").
		Select("COALESCE(SUM(order_items.quantity), 0)").
		Row().Scan(&totalUnits)

	// Top selling products
	type topRaw struct {
		ProductName string
		SKU         string
		Quantity    int64
		TotalSales  float64
	}
	var rawTops []topRaw
	_ = s.db.WithContext(ctx).Table("order_items").
		Select("order_items.product_name, products.sku, SUM(order_items.quantity) as quantity, SUM(order_items.subtotal) as total_sales").
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Joins("LEFT JOIN products ON products.id = order_items.product_id").
		Where("orders." + dateFilter).
		Where("orders.status != 'CANCELLED'").
		Group("order_items.product_name, products.sku").
		Order("total_sales DESC").
		Limit(10).
		Scan(&rawTops).Error

	var topProducts []dto.TopProductReportDTO
	for _, t := range rawTops {
		sku := t.SKU
		if sku == "" {
			sku = "—"
		}
		topProducts = append(topProducts, dto.TopProductReportDTO{
			ProductName: t.ProductName,
			SKU:         sku,
			Quantity:    t.Quantity,
			TotalSales:  t.TotalSales,
		})
	}

	// Daily sales breakdown
	type dailyRaw struct {
		Date    string
		Orders  int64
		Revenue float64
	}
	var rawDailies []dailyRaw
	_ = s.db.WithContext(ctx).Table("orders").
		Select("TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as revenue").
		Where(dateFilter).
		Where("status != 'CANCELLED'").
		Group("TO_CHAR(created_at, 'YYYY-MM-DD')").
		Order("date ASC").
		Scan(&rawDailies).Error

	var dailySales []dto.DailySalesDTO
	for _, d := range rawDailies {
		dailySales = append(dailySales, dto.DailySalesDTO{
			Date:    d.Date,
			Orders:  d.Orders,
			Revenue: d.Revenue,
		})
	}

	return &dto.SalesReportResponse{
		Period:          period,
		StartDate:       startDate.Format("2006-01-02"),
		EndDate:         endDate.Format("2006-01-02"),
		TotalRevenue:    totalRevenue,
		TotalOrders:     totalOrders,
		CompletedOrders: completedOrders,
		PendingOrders:   pendingOrders,
		AverageOrder:    avgOrder,
		TotalUnitsSold:  totalUnits,
		TopProducts:     topProducts,
		DailySales:      dailySales,
	}, nil
}
