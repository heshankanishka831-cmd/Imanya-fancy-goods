import type { Order } from '../types/index';

/**
 * Normalizes phone numbers to standard international format (digits only).
 * Handles Sri Lankan numbers (07XXXXXXXX -> 947XXXXXXXX).
 * Prevents duplicate country codes (e.g. 9494... -> 94...).
 * Removes all spaces, +, hyphens, brackets, parentheses.
 */
export const normalizeWhatsAppNumber = (rawPhone: string | undefined | null): string => {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/[^0-9]/g, '');

  // Guard against accidental duplicate country codes (9494...)
  while (digits.startsWith('9494')) {
    digits = digits.slice(2);
  }

  // If local 10-digit Sri Lankan format (07XXXXXXXX), convert to international format (947XXXXXXXX)
  if (digits.startsWith('0') && digits.length === 10) {
    digits = '94' + digits.slice(1);
  }

  return digits;
};

/**
 * Obtains the configured Store Owner WhatsApp destination number.
 * Priority:
 * 1. Database order record's store_whatsapp_number returned from Checkout API.
 * 2. Destination phone extracted from order.whatsapp_url (guarding against old placeholders).
 * 3. Frontend environment variable VITE_WHATSAPP_STORE_NUMBER.
 * 4. Authoritative configured Store Owner WhatsApp number.
 */
export const resolveStoreOwnerWhatsAppNumber = (order?: Order): string => {
  // 1. From order API response if provided
  if (order?.store_whatsapp_number) {
    const num = normalizeWhatsAppNumber(order.store_whatsapp_number);
    if (num && num !== '94770000000' && num !== '94775776158') {
      return num;
    }
  }

  // 2. Extracted from order.whatsapp_url if provided by backend API
  if (order?.whatsapp_url) {
    const match = order.whatsapp_url.match(/wa\.me\/([0-9+]+)/);
    if (match && match[1]) {
      const extracted = normalizeWhatsAppNumber(match[1]);
      if (extracted && extracted !== '94770000000' && extracted !== '94775776158') {
        return extracted;
      }
    }
  }

  // 3. From frontend environment variable
  const envPhone = (import.meta as any).env?.VITE_WHATSAPP_STORE_NUMBER;
  if (envPhone) {
    const num = normalizeWhatsAppNumber(envPhone);
    if (num) {
      return num;
    }
  }

  // 4. Default configured store owner number
  return '94766611606';
};

/**
 * Formats the standardized WhatsApp order receipt matching the exact
 * structure required for Imanya Fancy Goods store orders.
 */
export const formatWhatsAppOrderMessage = (order: Order): string => {
  const customerName = order.customer_name?.trim() || 'Customer';
  const customerPhone = order.customer_phone?.trim() || 'N/A';
  const deliveryAddress = order.delivery_address?.trim() || 'Standard Delivery Address';

  let msg = `Hello Imanya Fancy Goods Team,\n\n`;
  msg += `I would like to confirm my customer order.\n\n`;

  msg += `ORDER DETAILS\n`;
  msg += `Order Number: ${order.order_number}\n`;
  msg += `Customer Name: ${customerName}\n`;
  msg += `Phone Number: ${customerPhone}\n`;
  msg += `Delivery Address: ${deliveryAddress}\n\n`;

  msg += `ITEMS ORDERED\n\n`;

  let totalQuantity = 0;
  if (order.items && order.items.length > 0) {
    order.items.forEach((item, index) => {
      totalQuantity += item.quantity;
      const sku = item.product_sku?.trim() ? item.product_sku.trim() : 'N/A';
      const unitPrice = Number(item.unit_price) || 0;
      const lineTotal = Number(item.subtotal) || unitPrice * item.quantity;

      msg += `${index + 1}. Product Name: ${item.product_name}\n`;
      msg += `   Item Code: ${sku}\n`;
      msg += `   Quantity: ${item.quantity}\n`;
      msg += `   Unit Price: Rs. ${unitPrice.toFixed(2)}\n`;
      msg += `   Line Total: Rs. ${lineTotal.toFixed(2)}\n\n`;
    });
  }

  const totalItems = order.items ? order.items.length : 0;
  const totalAmount = Number(order.total_amount) || 0;

  msg += `ORDER SUMMARY\n`;
  msg += `Total Items: ${totalItems}\n`;
  msg += `Total Quantity: ${totalQuantity}\n`;
  msg += `Total Order Amount: Rs. ${totalAmount.toFixed(2)}\n\n`;

  msg += `PAYMENT METHOD\n`;
  msg += `Online Banking / Direct Deposit\n\n`;
  msg += `Please attach the bank transfer receipt / payment slip here.\n\n`;
  msg += `Thank you.`;

  return msg;
};

/**
 * Builds the standard WhatsApp URL pre-filled with the order confirmation message.
 * Strict URL shape: https://wa.me/INTERNATIONAL_NUMBER?text=ENCODED_MESSAGE
 */
export const buildWhatsAppOrderUrl = (
  order: Order,
  customStorePhone?: string
): string => {
  const rawMessage = formatWhatsAppOrderMessage(order);

  const destinationNumber = customStorePhone
    ? normalizeWhatsAppNumber(customStorePhone)
    : resolveStoreOwnerWhatsAppNumber(order);

  const encoded = encodeURIComponent(rawMessage);
  return `https://wa.me/${destinationNumber}?text=${encoded}`;
};
