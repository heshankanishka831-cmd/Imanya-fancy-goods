export interface User {
  id: string;
  role_id: number;
  role_name: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string;
  is_primary: boolean;
}

export interface Product {
  id: string;
  category_id: number;
  category_name: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  unit_of_measure: string;
  selling_price: number;
  in_stock: boolean;
  images: ProductImage[];
}

export interface ProductAdmin extends Product {
  cost_price: number;
  current_stock: number;
  allocated_stock: number;
  available_stock: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: string;
  quantity_changed: number;
  quantity_before: number;
  quantity_after: number;
  reference_id: string;
  notes: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  is_active: boolean;
  created_at: string;
}

export interface POItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  subtotal: number;
}

export interface GoodsReceipt {
  id: string;
  receipt_number: string;
  received_by: string;
  receiver_name: string;
  received_at: string;
  notes: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  created_by: string;
  creator_name: string;
  status: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';
  total_amount: number;
  expected_delivery_date?: string;
  notes: string;
  items: POItem[];
  receipts: GoodsReceipt[];
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_image: string;
  unit_of_measure: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  available_stock: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  total_items: number;
  total_amount: number;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderStatusHistory {
  id: string;
  previous_status: string;
  new_status: string;
  changed_by_name: string;
  notes: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  total_amount: number;
  delivery_address: string;
  customer_notes: string;
  internal_notes: string;
  whatsapp_url?: string;
  items: OrderItem[];
  status_history: OrderStatusHistory[];
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  phone: string;
  business_name: string;
  delivery_address: string;
  order_count: number;
  is_active: boolean;
  created_at: string;
}

export interface DashboardMetrics {
  total_products: number;
  low_stock_count: number;
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  total_order_volume: number;
  active_suppliers: number;
  pending_pos: number;
  orders_by_status: Record<string, number>;
  recent_orders: {
    id: string;
    order_number: string;
    customer: string;
    total_amount: number;
    status: string;
    created_at: string;
  }[];
  low_stock_alerts: {
    product_id: string;
    product_name: string;
    sku: string;
    available_stock: number;
    low_stock_threshold: number;
  }[];
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity_name: string;
  entity_id: string;
  old_values: any;
  new_values: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
