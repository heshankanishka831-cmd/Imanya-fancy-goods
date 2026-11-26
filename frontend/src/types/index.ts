export interface User {
  id: string;
  role_id: number;
  role_name: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  email_verified?: boolean;
  created_at: string;
}

export interface OTPChallenge {
  verification_id: string;
  email: string;
  expires_in_seconds: number;
  resend_cooldown_seconds: number;
}

export interface RegistrationVerifiedResponse {
  message: string;
  email: string;
  user: User;
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
  min_order_quantity?: number;
  is_discount_enabled?: boolean;
  is_discount_active?: boolean;
  discount_status?: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'DISABLED';
  discount_percent?: number;
  discounted_price?: number;
  discount_amount?: number;
  discount_start_date?: string;
  discount_end_date?: string;
  in_stock: boolean;
  available_stock?: number;
  images: ProductImage[];
}

export interface ProductAdmin extends Product {
  cost_price: number;
  is_discount_enabled?: boolean;
  discount_status?: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'DISABLED';
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
  original_price?: number;
  unit_price: number;
  discount_percent?: number;
  discount_amount?: number;
  is_discount_active?: boolean;
  min_order_quantity?: number;
  quantity: number;
  subtotal: number;
  available_stock: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  total_items: number;
  total_amount: number;
  original_total?: number;
  total_savings?: number;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  unit_price: number;
  original_price?: number;
  discount_percent?: number;
  discount_amount?: number;
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

export interface OrderPaymentHistory {
  id: string;
  previous_status: string;
  new_status: string;
  changed_by_name: string;
  source: string;
  notes: string;
  created_at: string;
}

export type PaymentStatus =
  | 'PAYMENT_PENDING'
  | 'RECEIPT_RECEIVED'
  | 'PAYMENT_VERIFIED'
  | 'PAYMENT_REJECTED';

export interface Order {
  id: string;
  order_number: string;
  customer_id?: string;
  is_guest?: boolean;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  guest_city?: string;
  guest_province?: string;
  guest_postal_code?: string;
  guest_access_token?: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  payment_status?: PaymentStatus;
  payment_method?: string;
  payment_notes?: string;
  payment_verified_at?: string;
  total_amount: number;
  delivery_address: string;
  customer_notes: string;
  internal_notes: string;
  whatsapp_url?: string;
  store_whatsapp_number?: string;
  whatsapp_notification_status?: string;
  whatsapp_notification_error?: string;
  items: OrderItem[];
  status_history: OrderStatusHistory[];
  payment_history?: OrderPaymentHistory[];
  created_at: string;
  updated_at: string;
}

export interface OrderStats {
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  processing_orders: number;
  cancelled_orders: number;
  total_amount_spent: number;
}

export interface Customer {
  id: string;
  user_id?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  name: string;
  email: string;
  phone: string;
  business_name: string;
  residential_address?: string;
  delivery_address: string;
  res_house_no?: string;
  res_street?: string;
  res_city?: string;
  res_district?: string;
  res_postal_code?: string;
  delivery_same_as_residential?: boolean;
  del_recipient_name?: string;
  del_phone?: string;
  del_house_no?: string;
  del_street?: string;
  del_city?: string;
  del_district?: string;
  del_postal_code?: string;
  membership_tier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  lifetime_spent?: number;
  profile_photo_url?: string;
  order_count: number;
  order_stats?: OrderStats;
  is_active: boolean;
  password_status?: string;
  created_at: string;
  updated_at?: string;
}

export interface UpdateCustomerProfilePayload {
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  business_name?: string;
  residential_address?: string;
  delivery_address?: string;
  res_house_no?: string;
  res_street?: string;
  res_city?: string;
  res_district?: string;
  res_postal_code?: string;
  delivery_same_as_residential: boolean;
  del_recipient_name?: string;
  del_phone?: string;
  del_house_no?: string;
  del_street?: string;
  del_city?: string;
  del_district?: string;
  del_postal_code?: string;
}

export interface AdminUpdateCustomerPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  business_name?: string;
  residential_address: string;
  delivery_address?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface CustomerFilterParams {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  tier?: string;
  sort_by?: string;
  order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface DashboardMetrics {
  total_products: number;
  total_categories?: number;
  total_inventory_units?: number;
  low_stock_count: number;
  out_of_stock_count?: number;
  total_orders: number;
  pending_orders: number;
  processing_orders?: number;
  completed_orders: number;
  total_order_volume: number;
  pending_order_volume?: number;
  inventory_valuation?: number;
  total_customers?: number;
  total_suppliers?: number;
  active_suppliers: number;
  total_purchase_orders?: number;
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
  weekly_sales?: {
    date: string;
    orders: number;
    revenue: number;
    gross_demand?: number;
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

export interface SalesReport {
  period: string;
  start_date: string;
  end_date: string;
  total_revenue: number;
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  average_order: number;
  total_units_sold: number;
  top_products: {
    product_name: string;
    sku: string;
    quantity: number;
    total_sales: number;
  }[];
  daily_sales: {
    date: string;
    orders: number;
    revenue: number;
  }[];
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

export type MembershipTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface CustomerMembership {
  customer_id: string;
  customer_name: string;
  current_tier: MembershipTier;
  lifetime_spent: number;
  eligible_orders_count: number;
  next_tier: MembershipTier | null;
  next_tier_min_spend: number | null;
  remaining_for_next_tier: number;
  progress_percentage: number;
  is_highest_tier: boolean;
  tier_message: string;
}

export interface LoyaltyTierSetting {
  tier_name: MembershipTier;
  min_spend: number;
  description: string;
  sort_order: number;
}

export interface LoyaltySettingsResponse {
  tiers: LoyaltyTierSetting[];
}

export interface UpdateThresholdsRequest {
  silver_min_spend: number;
  gold_min_spend: number;
  platinum_min_spend: number;
}

export interface MembershipStats {
  total_customers: number;
  bronze_count: number;
  silver_count: number;
  gold_count: number;
  platinum_count: number;
}

export interface MembershipCustomerItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  business_name: string;
  membership_tier: MembershipTier;
  lifetime_spent: number;
  order_count: number;
  created_at: string;
}
