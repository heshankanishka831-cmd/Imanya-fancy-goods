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
  DashboardMetrics,
  AuditLog,
  SalesReport,
} from '../types';

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post<ApiResponse<{ token: string; user: User; business_name?: string; phone?: string; address?: string }>>('/auth/login', { email, password });
    return res.data;
  },
  register: async (payload: {
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    password: string;
    phone: string;
    business_name?: string;
    address?: string;
  }) => {
    const res = await api.post<ApiResponse<{ token: string; user: User; business_name?: string; phone?: string; address?: string }>>('/auth/customer/register', payload);
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
  getOrders: async (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
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

  // Customers
  getCustomers: async (params?: { search?: string; page?: number; limit?: number }) => {
    const res = await api.get<ApiResponse<Customer[]>>('/customers', { params });
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
};

export const customerApi = {
  getProfile: async () => {
    const res = await api.get<ApiResponse<Customer>>('/customer/profile');
    return res.data;
  },
  updateProfile: async (data: { business_name?: string; phone?: string; delivery_address?: string }) => {
    const res = await api.put<ApiResponse<Customer>>('/customer/profile', data);
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
