# Import & Wholesale Distribution Management System
## Project Specification and Architecture Blueprint

**Document purpose:** Single source of truth for AI-assisted planning and implementation.  
**Project type:** Web-based Import & Wholesale Distribution Management System  
**Architecture:** Modular Monolith with REST API  
**Status:** Requirements baseline with confirmed architecture and relational schema.  

---

## 1. Project Overview
Build a secure web-based system for an import and wholesale distribution business. The solution has two main user-facing areas:
1. **Customer-facing website** where customers can browse products, search/filter the catalogue, manage a cart, and submit orders. WhatsApp Click-to-Chat can be used to send an order summary to the business.
2. **Secure administration dashboard** where authorized staff manage products, categories, suppliers, imports/purchase orders, inventory, customers, orders, reporting, and audit history.

The system must keep order and inventory records in its own database. WhatsApp is a communication channel, not the system of record.

### Primary Goals
- Centralize product, supplier, import, stock, customer, and order information.
- Improve visibility of stock levels and stock movements.
- Track purchasing/import receiving and the resulting stock changes.
- Provide a simple customer product-browsing and ordering experience.
- Restrict administrative functions by role and permission.
- Provide useful operational dashboards and reports.
- Maintain traceable records for important business actions.

---

## 2. Confirmed Technology Stack
- **Frontend:** React, TypeScript, Vite, React Router, Tailwind CSS, Lucide React, Centralized Axios API client.
- **Backend:** Go (1.27+), Gin HTTP framework, GORM ORM, PostgreSQL driver, golang-migrate, JWT authentication, Casbin RBAC, go-playground/validator, Zap structured logging, Testify.
- **Database:** PostgreSQL (v18+), database name: `wholesale_management`.
- **Architecture:** Modular Monolith with layered modules (handler, service, repository, model, dto).

---

## 3. User Roles and Access Control
1. **Super Administrator:** Full system administration, users, roles, permissions, system configuration, audit logs, and all operational modules.
2. **Inventory Manager:** Products, categories, suppliers, purchase orders, goods receiving, stock balances, adjustments, and inventory reports.
3. **Order Manager:** View and process customer orders, update order statuses, manage customer profiles and shipping records.
4. **Customer:** Browse public products, manage personal cart and orders, access only their own customer profile.

---

## 4. Database Entities
- `roles`, `permissions`, `role_permissions`, `users`, `casbin_rule`
- `categories`, `products`, `product_images`
- `product_stock`, `stock_movements`
- `suppliers`, `purchase_orders`, `purchase_order_items`, `goods_receipts`, `goods_receipt_items`
- `customers`, `carts`, `cart_items`
- `orders`, `order_items`, `order_status_history`
- `audit_logs`
