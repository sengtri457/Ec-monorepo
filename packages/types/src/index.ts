export type Audience = "all" | "men" | "women" | "kids" | "unisex";
export type Department = "all" | "clothes" | "shoes" | "accessories";
export type Subcategory =
  | "all"
  // Clothes
  | "tshirt"
  | "sweater"
  | "hoodies"
  // Shoes
  | "running"
  | "basketball"
  | "lifestyle"
  // Accessories
  | "hat"
  | "jewelry"
  | "socks";

export type ProductVariant = {
  id: number;
  productId: number;
  sku: string;
  size?: string;
  color?: string;
  colorHex?: string;
  price?: number;
  stock: number;
  isDefault?: boolean;
  thumbnail?: string;
};

export type Product = {
  id: number;
  slug?: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  thumbnail: string;
  category: string;

  audience?: Audience;
  department?: Department;
  subcategory?: Subcategory;

  fabric?: string;
  sizes?: string[];
  colors?: { name: string; hex?: string; thumbnail?: string }[];
  variants?: ProductVariant[];
  imageWidth?: number;
  imageHeight?: number;
};

export type CartItem = {
  id?: string;
  productId: number;
  variantId?: number;
  sku?: string;
  selectedSize?: string;
  selectedColor?: string;
  title: string;
  price: number;
  thumbnail: string;
  quantity: number;
  maxStock?: number;
  selected?: boolean;
};

export type WishlistItem = {
  productId: number;
  title: string;
  price: number;
  thumbnail: string;
  category: string;
  audience?: Audience;
  department?: Department;
  subcategory?: Subcategory;
  fabric?: string;
  sizes?: string[];
  stock: number;
  addedAt: string;
};

export type ShippingMethod =
  | "phnom_penh_express"
  | "phnom_penh_standard"
  | "provincial";

export type PaymentMethod = "khqr" | "cod" | "card";

export type Customer = {
  name: string;
  email: string;
  phone: string;
  telegram?: string;
  address: string;

  cityProvince: string;
  khanDistrict?: string;
  sangkatCommune?: string;
  streetAddress: string;
  landmark?: string;

  street?: string;
  apartment?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;

  shippingMethod?: ShippingMethod;
  shippingCost?: number;
  paymentMethod?: PaymentMethod;
  cardNumberLast4?: string;
  orderNotes?: string;
};

export type Order = {
  id: string;
  createdAt: string;
  customer: Customer;
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  totalKhr?: number;
  trackingNumber?: string;
  status?: "confirmed" | "processing" | "out_for_delivery" | "delivered" | "pending";
  paymentStatus?: "PAID" | "UNPAID" | "PENDING" | "FAILED" | string;
};

export type UserAddress = {
  cityProvince: string;
  khanDistrict?: string;
  sangkatCommune?: string;
  streetAddress: string;
  landmark?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  telegram?: string;
  address?: UserAddress;
};

export type DeliveryStatus =
  | "PENDING_DISPATCH"
  | "PACKED"
  | "PICKED_UP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED_ATTEMPT"
  | "RETURNED";

export type DeliveryTimelineEvent = {
  id: number;
  status: string;
  title: string;
  description: string;
  location: string;
  occurred_at: string;
};

export type DeliveryShipment = {
  id: string;
  orderNumber: string;
  trackingNumber: string;
  courierName: string;
  courierPhone: string;
  driverName?: string;
  driverPhone?: string;
  vehicleInfo?: string;
  status: DeliveryStatus;
  shippingMethodCode: string;
  destinationCity: string;
  destinationAddress: string;
  recipientName: string;
  recipientPhone: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  currentLat?: number;
  currentLng?: number;
  heading?: number;
  speed?: number;
  estimatedDeliveryAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  timeline: DeliveryTimelineEvent[];
  createdAt: string;
  updatedAt: string;
};

export type StockMovementType =
  | 'PURCHASE'
  | 'RESTOCK'
  | 'RETURN'
  | 'ADJUSTMENT'
  | 'RESERVATION'
  | 'RELEASE';

export type StockMovement = {
  id: number;
  variantId?: number;
  sku: string;
  productTitle?: string;
  quantityChange: number;
  movementType: StockMovementType;
  referenceId?: string;
  balanceAfter: number;
  notes?: string;
  createdAt: string;
};

export type AdminInventoryItem = {
  id: number;
  productId: number;
  productTitle: string;
  categoryName?: string;
  department?: string;
  sku: string;
  size?: string;
  color?: string;
  colorHex?: string;
  stock: number;
  effectivePrice: number;
  thumbnail?: string;
  isActive: boolean;
  lowStock: boolean;
};

export type AdminOrderSummary = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  cityProvince: string;
  totalUsd: number;
  totalKhr?: number;
  status: string;
  paymentStatus: string;
  shippingMethodName: string;
  itemsCount: number;
  createdAt: string;
};

export type AdminOrderStatusHistory = {
  id: number;
  fromStatus: string;
  toStatus: string;
  changedByUserId?: number | null;
  notes?: string;
  createdAt: string;
};

export type AdminOrderDetail = Order & {
  statusHistory?: AdminOrderStatusHistory[];
  shipment?: DeliveryShipment;
  updatedAt?: string;
};

export type AdminDashboardStats = {
  totalRevenue: number;
  totalOrders: number;
  pendingFulfillmentCount: number;
  dispatchedCount: number;
  recentOrders: AdminOrderSummary[];
};

export type ProductUpsertInput = {
  title: string;
  slug?: string;
  description: string;
  categoryId: number;
  department: Department;
  audience: Audience;
  subcategory?: string;
  fabric?: string;
  basePrice: number;
  isActive?: boolean;
  isFeatured?: boolean;
  variants?: {
    id?: number;
    sku: string;
    size?: string;
    color?: string;
    colorHex?: string;
    stock: number;
    priceOverride?: number;
    isDefault?: boolean;
    isActive?: boolean;
  }[];
  images?: {
    id?: number;
    imageUrl: string;
    altText?: string;
    isPrimary?: boolean;
    sortOrder?: number;
  }[];
};

