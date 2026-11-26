import api from './api';
import {
  ApiResponse,
  User,
  Role,
  Category,
  Product,
  ProductAdmin,
  ProductImage,
  StockMovement,
  Supplier,
  PurchaseOrder,
  Cart,
  Order,
  Customer,
  UpdateCustomerProfilePayload,
  AdminUpdateCustomerPayload,
  ChangePasswordPayload,
  CustomerFilterParams,
  DashboardMetrics,
  AuditLog,
  SalesReport,
  CustomerMembership,
  LoyaltySettingsResponse,
  UpdateThresholdsRequest,
  MembershipStats,
  MembershipCustomerItem,
  OTPChallenge,
  RegistrationVerifiedResponse,
} from '../types';

export interface RegisterInitiatePayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password?: string;
  phone: string;
  residential_address: string;
  business_name?: string;
  delivery_address?: string;
  address?: string;
  delivery_same_as_residential?: boolean;
  del_recipient_name?: string;
  del_phone?: string;
  del_house_no?: string;
  del_street?: string;
  del_city?: string;
  del_district?: string;
  del_postal_code?: string;
  terms_accepted?: boolean;
}

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post<ApiResponse<{
      token: string;
      user: User;
      business_name?: string;
      phone?: string;
      residential_address?: string;
      delivery_address?: string;
      address?: string;
      membership_tier?: string;
    }>>('/auth/login', { email, password });
    return res.data;
  },
  initiateRegister: async (payload: RegisterInitiatePayload) => {
    const res = await api.post<ApiResponse<OTPChallenge>>('/auth/customer/register/initiate', payload);
    return res.data;
  },
  verifyRegistrationOTP: async (payload: {
    verification_id: string;
    email: string;
    otp: string;
  }) => {
    const res = await api.post<ApiResponse<RegistrationVerifiedResponse>>('/auth/customer/register/verify-otp', payload);
    return res.data;
  },
  resendRegistrationOTP: async (payload: {
    verification_id: string;
    recipient_name?: string;
  }) => {
    const res = await api.post<ApiResponse<OTPChallenge>>('/auth/customer/register/resend-otp', payload);
    return res.data;
  },
};

export const publicApi = {
  getCategories: async () => {
    const res = await api.get<ApiResponse<Category[]>>('/public/categories');
    return res.data;
  },
  getProducts: async (params?: { category_id?: number; search?: string; page?: number; limit?: number }) => {
    const res = await api.get<ApiResponse<Product[]>>('/public/products', { params });
    return res.data;
  },
  getProduct: async (id: string) => {
    const res = await api.get<ApiResponse<Product>>(`/public/products/${id}`);
    return res.data;
  },
  getCart: async () => {
    const res = await api.get<ApiResponse<Cart>>('/public/cart');
    return res.data;
  },
  addToCart: async (productId: string, quantity: number) => {
    const res = await api.post<ApiResponse<Cart>>('/public/cart/items', { product_id: productId, quantity });
    return res.data;
  },
  updateCartItem: async (itemId: string, quantity: number) => {
    const res = await api.put<ApiResponse<Cart>>(`/public/cart/items/${itemId}`, { quantity });
    return res.data;
  },
  removeCartItem: async (itemId: string) => {
    const res = await api.delete<ApiResponse<{ message: string }>>(`/public/cart/items/${itemId}`);
    return res.data;
  },
  checkout: async (payload: {
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    delivery_address: string;
    customer_notes?: string;
  }) => {
    const res = await api.post<ApiResponse<Order>>('/public/checkout', payload);
    return res.data;
  },
  getOrder: async (id: string) => {
    const res = await api.get<ApiResponse<Order>>(`/public/orders/${id}`);
    return res.data;
  },
  getWhatsAppLink: async (id: string) => {
    const res = await api.get<ApiResponse<{ whatsapp_url: string }>>(`/public/orders/${id}/whatsapp`);
    return res.data;
  },
};

export interface GuestCheckoutPayload {
  first_name: string;
  last_name: string;
  whatsapp_number: string;
  email?: string;
  delivery_address: string;
  city: string;
  province: string;
  postal_code?: string;
  delivery_instructions?: string;
  idempotency_key?: string;
  items?: { product_id: string; quantity: number }[];
}

export const guestApi = {
  createOrder: async (payload: GuestCheckoutPayload) => {
    const res = await api.post<ApiResponse<Order>>('/guest/orders', payload);
    return res.data;
  },
  getOrder: async (orderNumber: string, params: { token?: string; phone?: string }) => {
    const res = await api.get<ApiResponse<Order>>(`/guest/orders/${encodeURIComponent(orderNumber)}`, { params });
    return res.data;
  },
};

export const adminApi = {
  // Dashboard
  getDashboardMetrics: async () => {
    const res = await api.get<ApiResponse<DashboardMetrics>>('/reports/dashboard');
    return res.data;
  },

  // Categories
  getCategories: async () => {
    const res = await api.get<ApiResponse<Category[]>>('/categories');
    return res.data;
  },
  createCategory: async (data: { name: string; description?: string; is_active?: boolean }) => {
    const res = await api.post<ApiResponse<Category>>('/categories', data);
    return res.data;
  },
  updateCategory: async (id: number, data: { name: string; description?: string; is_active?: boolean }) => {
    const res = await api.put<ApiResponse<Category>>(`/categories/${id}`, data);
    return res.data;
  },
  deleteCategory: async (id: number) => {
    const res = await api.delete<ApiResponse<{ message: string }>>(`/categories/${id}`);
    return res.data;
  },

  // Products
  getProducts: async (params?: { category_id?: number; search?: string; page?: number; limit?: number }) => {
    const res = await api.get<ApiResponse<ProductAdmin[]>>('/products', { params });
    return res.data;
  },
  getProduct: async (id: string) => {
    const res = await api.get<ApiResponse<ProductAdmin>>(`/products/${id}`);
    return res.data;
  },
  createProduct: async (data: any) => {
    const res = await api.post<ApiResponse<ProductAdmin>>('/products', data);
    return res.data;
  },
  updateProduct: async (id: string, data: any) => {
    const res = await api.put<ApiResponse<ProductAdmin>>(`/products/${id}`, data);
    return res.data;
  },
  deleteProduct: async (id: string) => {
    const res = await api.delete<ApiResponse<{ message: string }>>(`/products/${id}`);
    return res.data;
  },
  uploadProductImage: async (productId: string, file: File, isPrimary: boolean = false) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('is_primary', String(isPrimary));
    const res = await api.post<ApiResponse<ProductImage>>(`/products/${productId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  deleteProductImage: async (productId: string, imageId: string) => {
    const res = await api.delete<ApiResponse<{ message: string }>>(`/products/${productId}/images/${imageId}`);
    return res.data;
  },

  // Inventory
  getLowStock: async () => {
    const res = await api.get<ApiResponse<any[]>>('/inventory/low-stock');
    return res.data;
  },
  adjustStock: async (payload: { product_id: string; quantity_changed: number; reason: string; notes?: string }) => {
    const res = await api.post<ApiResponse<{ message: string }>>('/inventory/adjustments', payload);
    return res.data;
  },
  getStockMovements: async (params?: { product_id?: string; type?: string; page?: number; limit?: number }) => {
    const res = await api.get<ApiResponse<StockMovement[]>>('/stock-movements', { params });
    return res.data;
  },

  // Suppliers
  getSuppliers: async (params?: { page?: number; limit?: number }) => {
    const res = await api.get<ApiResponse<Supplier[]>>('/suppliers', { params });
    return res.data;
  },
  createSupplier: async (data: any) => {
    const res = await api.post<ApiResponse<Supplier>>('/suppliers', data);
    return res.data;
  },
  updateSupplier: async (id: string, data: any) => {
    const res = await api.put<ApiResponse<Supplier>>(`/suppliers/${id}`, data);
    return res.data;
  },
  deleteSupplier: async (id: string) => {
    const res = await api.delete<ApiResponse<{ message: string }>>(`/suppliers/${id}`);
    return res.data;
  },

  // Procurement
  getPurchaseOrders: async (params?: { status?: string; supplier_id?: string; page?: number; limit?: number }) => {
    const res = await api.get<ApiResponse<PurchaseOrder[]>>('/purchase-orders', { params });
    return res.data;
  },
  getPurchaseOrder: async (id: string) => {
    const res = await api.get<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`);
    return res.data;
  },
  createPurchaseOrder: async (data: any) => {
    const res = await api.post<ApiResponse<PurchaseOrder>>('/purchase-orders', data);
    return res.data;
  },
  updatePOStatus: async (id: string, status: string) => {
    const res = await api.put<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/status`, { status });
    return res.data;
  },
  createGoodsReceipt: async (data: { purchase_order_id: string; notes?: string; items: { product_id: string; quantity_received: number }[] }) => {
    const res = await api.post<ApiResponse<PurchaseOrder>>('/goods-receipts', data);
    return res.data;
  },

  // Orders
  getOrders: async (params?: { customer_id?: string; customer_type?: 'guest' | 'registered' | ''; status?: string; payment_status?: string; search?: string; page?: number; limit?: number }) => {
    const res = await api.get<ApiResponse<Order[]>>('/orders', { params });
    return res.data;
  },
  getOrder: async (id: string) => {
    const res = await api.get<ApiResponse<Order>>(`/orders/${id}`);
    return res.data;
  },
  updateOrderStatus: async (id: string, status: string, notes?: string) => {
    const res = await api.put<ApiResponse<Order>>(`/orders/${id}/status`, { status, notes });
    return res.data;
  },
  updateOrderPayment: async (id: string, payment_status: string, notes?: string) => {
    const res = await api.put<ApiResponse<Order>>(`/orders/${id}/payment`, { payment_status, notes });
    return res.data;
  },
  retryOrderWhatsApp: async (id: string) => {
    const res = await api.post<ApiResponse<Order>>(`/orders/${id}/whatsapp/retry`);
    return res.data;
  },

  // Customers
  getCustomers: async (params?: CustomerFilterParams) => {
    const res = await api.get<ApiResponse<Customer[]>>('/customers', { params });
    return res.data;
  },
  getCustomer: async (id: string) => {
    const res = await api.get<ApiResponse<Customer>>(`/customers/${id}`);
    return res.data;
  },
  updateCustomer: async (id: string, data: AdminUpdateCustomerPayload) => {
    const res = await api.put<ApiResponse<Customer>>(`/customers/${id}`, data);
    return res.data;
  },
  updateCustomerStatus: async (id: string, isActive: boolean) => {
    const res = await api.put<ApiResponse<Customer>>(`/customers/${id}/status`, { is_active: isActive });
    return res.data;
  },
  resetCustomerPassword: async (id: string, newPassword: string) => {
    const res = await api.post<ApiResponse<{ message: string }>>(`/customers/${id}/reset-password`, { new_password: newPassword });
    return res.data;
  },

  // Users
  getUsers: async (params?: { page?: number; limit?: number }) => {
    const res = await api.get<ApiResponse<User[]>>('/users', { params });
    return res.data;
  },
  createUser: async (data: any) => {
    const res = await api.post<ApiResponse<User>>('/users', data);
    return res.data;
  },
  updateUserStatus: async (id: string, isActive: boolean) => {
    const res = await api.put<ApiResponse<{ message: string }>>(`/users/${id}/status`, { is_active: isActive });
    return res.data;
  },
  getRoles: async () => {
    const res = await api.get<ApiResponse<Role[]>>('/roles');
    return res.data;
  },

  // Audit Logs
  getAuditLogs: async (params?: { entity?: string; page?: number; limit?: number }) => {
    const res = await api.get<ApiResponse<AuditLog[]>>('/audit-logs', { params });
    return res.data;
  },

  // Sales Reporting & PDF Analytics
  getSalesReport: async (period: 'weekly' | 'monthly' | 'all' = 'weekly') => {
    const res = await api.get<ApiResponse<SalesReport>>('/reports/sales', { params: { period } });
    return res.data;
  },

  // Loyalty & Customer Membership
  getMembershipStats: async () => {
    const res = await api.get<ApiResponse<MembershipStats>>('/membership/stats');
    return res.data;
  },
  getMembershipSettings: async () => {
    const res = await api.get<ApiResponse<LoyaltySettingsResponse>>('/membership/settings');
    return res.data;
  },
  updateMembershipSettings: async (data: UpdateThresholdsRequest) => {
    const res = await api.put<ApiResponse<LoyaltySettingsResponse>>('/membership/settings', data);
    return res.data;
  },
  getMembershipCustomers: async (params?: {
    tier?: string;
    search?: string;
    sort_by?: string;
    order?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get<ApiResponse<MembershipCustomerItem[]>>('/membership/customers', { params });
    return res.data;
  },
  recalculateCustomerMembership: async (customerId: string) => {
    const res = await api.post<ApiResponse<CustomerMembership>>(`/membership/recalculate/${customerId}`);
    return res.data;
  },
};

export const customerApi = {
  getProfile: async () => {
    const res = await api.get<ApiResponse<Customer>>('/customer/profile');
    return res.data;
  },
  getMembership: async () => {
    const res = await api.get<ApiResponse<CustomerMembership>>('/customer/membership');
    return res.data;
  },
  updateProfile: async (data: UpdateCustomerProfilePayload) => {
    const res = await api.put<ApiResponse<Customer>>('/customer/profile', data);
    return res.data;
  },
  uploadProfilePhoto: async (file: File, onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await api.post<ApiResponse<Customer>>('/customer/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(pct);
        }
      },
    });
    return res.data;
  },
  removeProfilePhoto: async () => {
    const res = await api.delete<ApiResponse<Customer>>('/customer/profile/photo');
    return res.data;
  },
  initiateEmailChange: async (newEmail: string) => {
    const res = await api.post<ApiResponse<OTPChallenge>>('/customer/profile/email/initiate', {
      new_email: newEmail,
    });
    return res.data;
  },
  verifyEmailChange: async (payload: {
    verification_id: string;
    new_email: string;
    otp: string;
  }) => {
    const res = await api.post<ApiResponse<Customer>>('/customer/profile/email/verify', payload);
    return res.data;
  },
  resendEmailChangeOTP: async (verificationId: string) => {
    const res = await api.post<ApiResponse<OTPChallenge>>('/customer/profile/email/resend', {
      verification_id: verificationId,
    });
    return res.data;
  },
  changePassword: async (data: ChangePasswordPayload) => {
    const res = await api.post<ApiResponse<{ message: string }>>('/customer/change-password', data);
    return res.data;
  },
  getMyOrders: async (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const res = await api.get<ApiResponse<Order[]>>('/customer/orders', { params });
    return res.data;
  },
  getMyOrder: async (id: string) => {
    const res = await api.get<ApiResponse<Order>>(`/customer/orders/${id}`);
    return res.data;
  },
  getWhatsAppLink: async (id: string) => {
    const res = await api.get<ApiResponse<{ whatsapp_url: string }>>(`/customer/orders/${id}/whatsapp`);
    return res.data;
  },
};
