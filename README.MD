#  Food Ordering System

This a modern full-stack food ordering system that connects users with food vendors and enables seamless online food purchases. It features secure authentication, multi-role dashboards, dynamic menu management, cart + order processing, and admin oversight.

---

## 🧭 Purpose

To digitize and streamline food ordering for customers, while giving vendors and admins full control of operations through secure, role-specific access.

---

## ✨ Core Features

### 🔐 Multi-Role Access

- **👤 User Dashboard**
  - Browse food
  - Add to cart
  - Place orders
  - Track delivery
  - Leave reviews

- **🏪 Vendor Dashboard**
  - Apply to become a vendor
  - Add/update/remove food items
  - Manage incoming orders
  - Monitor delivery status
  - Access analytics (future feature)

- **🛡️ Admin Dashboard**
  - Manage users and vendors
  - Approve vendor applications
  - Monitor orders across the platform
  - Moderate reviews

---

### 🧾 Authentication & Authorization

- Secure login/register using JWT and HTTP-only cookies  
- Role-Based Access Control (RBAC): `user`, `vendor`, `admin`  
- Refresh tokens (optional for multi-session auth)  
- Route-level and action-level protection  

---

### 🍲 Menu & Product Management

- Vendors can:
  - Create, update, and delete menu items (products)
  - Set prices, categories, and images
- Users can:
  - View available food across vendors
  - Filter by category, price, or rating

---

### 🛒 Cart & Order System

- Persistent cart per user  
- Order creation from cart  
- Order status management:  
  `Pending → Accepted → Preparing → Out for delivery → Delivered`  
- Vendor sees and updates order status  
- Admin sees full order flow  

---

### 💳 Payment Integration (Planned)

- Support for:
  - Cards (Visa, MasterCard)
  - USSD
  - Wallets
  - Paystack / Flutterwave / Stripe
- Track payment status: `Unpaid`, `Paid`, `Failed`

---

### ⭐ Ratings & Reviews

- Only users who ordered can review  
- 1–5 star rating + comment  
- Vendor's products get aggregated ratings  
- Admin can delete inappropriate reviews  

---

### 🔍 Search & Filters

- Filter meals/vendors by:
  - Name
  - Category
  - Price range
  - Rating
  - Location (optional)

---

### 🔔 Notifications (Planned)

- Email or in-app notifications for:
  - Order updates
  - Promotions
  - Account status (approval, suspension, etc.)

---

## 🧪 Tech Stack

| Layer             | Stack                                    |
|-------------------|------------------------------------------|
| **Backend**       | Node.js, Express.js, MongoDB (Mongoose)  |
| **Frontend**      | React.js or Next.js                      |
| **Authentication**| JWT, bcrypt, Role-Based Access           |
| **Payments**      | Paystack, Flutterwave, Stripe (Planned)  |
| **State Mgmt**    | Redux Toolkit or Context API             |


