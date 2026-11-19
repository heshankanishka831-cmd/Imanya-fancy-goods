package dto

type DashboardMetricsResponse struct {
	TotalProducts     int64            `json:"total_products"`
	LowStockCount     int64            `json:"low_stock_count"`
	TotalOrders       int64            `json:"total_orders"`
	PendingOrders     int64            `json:"pending_orders"`
	CompletedOrders   int64            `json:"completed_orders"`
	TotalOrderVolume  float64          `json:"total_order_volume"`
	ActiveSuppliers   int64            `json:"active_suppliers"`
	PendingPOs        int64            `json:"pending_pos"`
	OrdersByStatus    map[string]int64 `json:"orders_by_status"`
	RecentOrders      []RecentOrderDTO `json:"recent_orders"`
	LowStockAlerts    []LowStockDTO    `json:"low_stock_alerts"`
}

type RecentOrderDTO struct {
	ID          string  `json:"id"`
	OrderNumber string  `json:"order_number"`
	Customer    string  `json:"customer"`
	TotalAmount float64 `json:"total_amount"`
	Status      string  `json:"status"`
	CreatedAt   string  `json:"created_at"`
}

type LowStockDTO struct {
	ProductID         string `json:"product_id"`
	ProductName       string `json:"product_name"`
	SKU               string `json:"sku"`
	AvailableStock    int    `json:"available_stock"`
	LowStockThreshold int    `json:"low_stock_threshold"`
}
