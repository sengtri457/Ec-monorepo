import {
  Product,
  ProductVariant,
  CartItem,
  Customer,
  Order,
  Audience,
  Department,
  Subcategory,
  ShippingMethod,
  PaymentMethod,
  DeliveryShipment,
} from "@/types";
import { apiClient, API_BASE } from "@/lib/apiClient";
export { API_BASE };

interface DjangoVariantResponse {
  id: number;
  sku: string;
  size?: string;
  color?: string;
  color_hex?: string;
  price: string | number;
  stock: number;
  is_default?: boolean;
  is_active?: boolean;
}

interface DjangoTimelineEventResponse {
  id: number;
  status: string;
  title: string;
  description: string;
  location: string;
  occurred_at: string;
}

interface DjangoProductResponse {
  id: number;
  slug: string;
  title: string;
  description?: string;
  price: string | number;
  thumbnail: string;
  category?: { name: string; slug: string } | string;
  category_name?: string;
  department?: string;
  audience?: string;
  subcategory?: string;
  fabric?: string;
  total_stock?: number;
  stock?: number;
  variants?: DjangoVariantResponse[];
  images?: { id: number; image_url: string; alt_text?: string; is_primary?: boolean }[];
}

export function transformDjangoProduct(item: DjangoProductResponse): Product {
  const variants: ProductVariant[] = (item.variants || []).map((v) => ({
    id: v.id,
    productId: item.id,
    sku: v.sku,
    size: v.size,
    color: v.color,
    colorHex: v.color_hex,
    price: typeof v.price === "string" ? parseFloat(v.price) : v.price,
    stock: v.stock,
    isDefault: v.is_default,
    thumbnail: item.thumbnail,
  }));

  const sizes = Array.from(new Set(variants.map((v) => v.size).filter((s): s is string => Boolean(s))));
  const categoryName =
    typeof item.category === "object"
      ? item.category.name
      : item.category_name || item.category || "Clothes";

  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    description: item.description || "",
    price: typeof item.price === "string" ? parseFloat(item.price) : item.price,
    stock: item.total_stock ?? item.stock ?? 20,
    thumbnail: item.thumbnail,
    category: categoryName,
    department: item.department as Department | undefined,
    audience: item.audience as Audience | undefined,
    subcategory: item.subcategory as Subcategory | undefined,
    fabric: item.fabric,
    sizes: sizes.length > 0 ? sizes : undefined,
    variants: variants.length > 0 ? variants : undefined,
  };
}

/**
 * Fetch all catalog products strictly from the backend Django microservice.
 * No local json array fallback.
 */
export async function fetchCatalogProducts(params?: {
  department?: string;
  audience?: string;
  category?: string;
  subcategory?: string;
  search?: string;
  sort?: string;
}): Promise<Product[]> {
  try {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val && val !== "all") query.set(key, val);
      });
    }

    const res = await fetch(`${API_BASE}/catalog/products/?${query.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Backend responded with HTTP ${res.status}`);
    }

    const data = await res.json();
    const results: DjangoProductResponse[] = data.results || (Array.isArray(data) ? data : []);
    return results.map(transformDjangoProduct);
  } catch (error) {
    console.error("Failed to fetch catalog from backend microservice:", error);
    return [];
  }
}

/**
 * Fetch a single product detail strictly from backend microservice.
 */
export async function fetchProductDetail(slugOrId: string | number): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE}/catalog/products/${slugOrId}/`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`Product not found on backend (HTTP ${res.status})`);
      return null;
    }

    const data: DjangoProductResponse = await res.json();
    return transformDjangoProduct(data);
  } catch (error) {
    console.error(`Failed to fetch product "${slugOrId}" from backend:`, error);
    return null;
  }
}

/**
 * Fetch live shipping methods strictly from Order Service database.
 */
export async function fetchShippingMethods(): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(`${API_BASE}/orders/shipping-methods/`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch shipping methods from backend:", err);
    return [];
  }
}

/**
 * Fetch live categories strictly from Product Service database.
 */
export async function fetchCategories(): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(`${API_BASE}/catalog/categories/`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch categories from backend:", err);
    return [];
  }
}

export interface CheckoutApiResponse {
  order: {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_telegram?: string;
    city_province: string;
    khan_district?: string;
    sangkat_commune?: string;
    street_address: string;
    landmark?: string;
    subtotal: string | number;
    shipping_cost: string | number;
    tax: string | number;
    total_usd: string | number;
    total_khr: number;
    status: string;
    payment_status: string;
    guest_access_token?: string;
    tracking_number?: string;
    created_at: string;
  };
  payment?: {
    id: string;
    method: string;
    status: string;
    amount_usd: string;
    amount_khr: number;
    khqr_payload: string;
    khqr_md5: string;
  };
}

/**
 * Submit checkout order to Django backend with atomic stock deduction and KHQR payload generation.
 */
export async function submitOrderCheckout(payload: {
  customer: Customer;
  items: CartItem[];
  token?: string | null;
}): Promise<CheckoutApiResponse> {
  const backendItems = payload.items.map((item) => {
    const variantId = item.variantId || item.productId;
    return {
      variant_id: variantId,
      quantity: item.quantity,
      product_title: item.title,
      sku: item.sku || `SKU-${variantId}`,
      size: item.selectedSize || "",
      color: item.selectedColor || "",
      unit_price: Number(item.price.toFixed(2)),
    };
  });

  const bodyData = {
    name: payload.customer.name,
    email: payload.customer.email,
    phone: payload.customer.phone,
    telegram: payload.customer.telegram || "",
    city_province: payload.customer.cityProvince,
    khan_district: payload.customer.khanDistrict || "",
    sangkat_commune: payload.customer.sangkatCommune || "",
    street_address: payload.customer.streetAddress,
    landmark: payload.customer.landmark || "",
    shipping_method: payload.customer.shippingMethod || "phnom_penh_express",
    payment_method: (payload.customer.paymentMethod || "khqr").toUpperCase(),
    order_notes: payload.customer.orderNotes || "",
    items: backendItems,
  };

  const backendData = await apiClient<{
    order: CheckoutApiResponse["order"] & { guest_access_token?: string };
    guest_access_token?: string;
    message?: string;
  }>("/orders/checkout/", {
    method: "POST",
    body: JSON.stringify(bodyData),
  });

  const order = backendData.order;
  if (!order.guest_access_token && backendData.guest_access_token) {
    order.guest_access_token = backendData.guest_access_token;
  }

  // Immediately initiate payment record in payment-service
  let paymentRecord = undefined;
  try {
    const paymentMethodUpper = (payload.customer.paymentMethod || "khqr").toUpperCase();
    paymentRecord = await apiClient<CheckoutApiResponse["payment"]>("/payments/", {
      method: "POST",
      body: JSON.stringify({
        order_id: order.id,
        order_number: order.order_number,
        payment_method: paymentMethodUpper,
        amount_usd: typeof order.total_usd === "string" ? order.total_usd : Number(order.total_usd).toFixed(2),
        amount_khr: order.total_khr || Math.round(Number(order.total_usd) * 4100),
      }),
    });
  } catch (payErr) {
    console.warn("Error creating payment record in payment-service:", payErr);
  }

  return {
    order,
    payment: paymentRecord,
  };
}

/**
 * Check payment status for polling the Bakong KHQR modal.
 */
export async function checkPaymentStatus(paymentId: string): Promise<{
  payment_id: string;
  order_number: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  amount_usd: string;
  amount_khr: number;
  khqr_payload?: string;
  khqr_md5?: string;
  paid_at?: string;
}> {
  return apiClient(`/payments/${paymentId}/status/`, {
    cache: "no-store",
  });
}

/**
 * Trigger immediate verification of payment.
 */
export async function verifyPayment(paymentId: string): Promise<Record<string, unknown>> {
  return apiClient(`/payments/${paymentId}/verify/`, {
    method: "POST",
    body: JSON.stringify({ status: "PAID" }),
  });
}

interface DjangoOrderResponse {
  order_number: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_telegram?: string;
  street_address: string;
  khan_district?: string;
  city_province: string;
  sangkat_commune?: string;
  landmark?: string;
  shipping_method?: { code?: string };
  shipping_cost: string;
  payments?: Array<{ payment_method?: string }>;
  order_notes?: string;
  subtotal: string;
  tax?: string;
  total_usd: string;
  total_khr?: number;
  tracking_number?: string;
  status: string;
  payment_status?: string;
  items?: Array<{
    sku?: string;
    variant?: { product_id?: number; id?: number };
    size?: string;
    color?: string;
    product_title?: string;
    unit_price: string;
    quantity: number;
  }>;
}

/**
 * Fetch official verified order receipt by order number with owner/token validation.
 */
export async function fetchOrderDetail(
  orderNumber: string,
  token?: string
): Promise<Order | null> {
  try {
    let orderToken = token;
    if (!orderToken && typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      orderToken = sp.get("token") || undefined;
    }

    const data = await apiClient<DjangoOrderResponse>(`/orders/${orderNumber}/`, {
      params: orderToken ? { token: orderToken } : undefined,
      cache: "no-store",
    });

    return {
      id: data.order_number,
      createdAt: data.created_at,
      customer: {
        name: data.customer_name,
        email: data.customer_email,
        phone: data.customer_phone,
        telegram: data.customer_telegram,
        address: `${data.street_address}, ${data.khan_district ? data.khan_district + ", " : ""}${data.city_province}`,
        cityProvince: data.city_province,
        khanDistrict: data.khan_district,
        sangkatCommune: data.sangkat_commune,
        streetAddress: data.street_address,
        landmark: data.landmark,
        shippingMethod: (data.shipping_method?.code as ShippingMethod) || "phnom_penh_express",
        shippingCost: parseFloat(data.shipping_cost || "0"),
        paymentMethod: (data.payments?.[0]?.payment_method?.toLowerCase() as PaymentMethod) || "khqr",
        orderNotes: data.order_notes,
      },
      items: (data.items || []).map((item) => ({
        id: `${item.sku}`,
        productId: item.variant?.product_id || 1,
        variantId: item.variant?.id,
        sku: item.sku,
        selectedSize: item.size,
        selectedColor: item.color,
        title: item.product_title || "Apparel Item",
        price: parseFloat(item.unit_price),
        thumbnail: "/collection/ctrl-blazer.webp",
        quantity: item.quantity,
      })),
      subtotal: parseFloat(data.subtotal),
      shippingCost: parseFloat(data.shipping_cost),
      tax: parseFloat(data.tax || "0"),
      total: parseFloat(data.total_usd),
      totalKhr: data.total_khr,
      trackingNumber: data.tracking_number,
      status: (data.status?.toLowerCase() as Order["status"]) || "confirmed",
      paymentStatus: data.payment_status || "PENDING",
    };
  } catch (err) {
    console.warn(`Could not fetch order ${orderNumber} from backend:`, err);
    return null;
  }
}

export async function fetchDeliveryTracking(
  trackingNumber: string
): Promise<DeliveryShipment | null> {
  try {
    const res = await fetch(
      `${API_BASE}/orders/tracking/${encodeURIComponent(trackingNumber)}/`,
      {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      }
    );
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return {
      id: data.id,
      orderNumber: data.order_number,
      trackingNumber: data.tracking_number,
      courierName: data.courier_name,
      courierPhone: data.courier_phone,
      driverName: data.driver_name,
      driverPhone: data.driver_phone,
      vehicleInfo: data.vehicle_info,
      status: data.status,
      shippingMethodCode: data.shipping_method_code,
      destinationCity: data.destination_city,
      destinationAddress: data.destination_address,
      recipientName: data.recipient_name,
      recipientPhone: data.recipient_phone,
      originLat: parseFloat(data.origin_lat || "11.5761"),
      originLng: parseFloat(data.origin_lng || "104.8988"),
      destLat: parseFloat(data.dest_lat || "11.5564"),
      destLng: parseFloat(data.dest_lng || "104.9282"),
      currentLat: data.current_lat ? parseFloat(data.current_lat) : undefined,
      currentLng: data.current_lng ? parseFloat(data.current_lng) : undefined,
      heading: data.heading,
      speed: data.speed,
      estimatedDeliveryAt: data.estimated_delivery_at,
      dispatchedAt: data.dispatched_at,
      deliveredAt: data.delivered_at,
      timeline: (data.timeline || []).map((ev: DjangoTimelineEventResponse) => ({
        id: ev.id,
        status: ev.status,
        title: ev.title,
        description: ev.description,
        location: ev.location,
        occurred_at: ev.occurred_at,
      })),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.warn("Could not fetch delivery tracking:", err);
    return null;
  }
}

export async function updateRiderLocation(
  trackingNumber: string,
  coords: { latitude: number; longitude: number; heading?: number | null; speed?: number | null }
): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_BASE}/orders/tracking/${encodeURIComponent(trackingNumber)}/location/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coords),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export default fetchDeliveryTracking;

