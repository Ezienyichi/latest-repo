import { grantsDigitalAccess } from './orderFlow.js';

// What a buyer-facing order response may show of a product. digitalAccessUrl
// is selected only so withAccess() can turn it into an item's `accessUrl`;
// it never leaves the server as a product field.
export const PRODUCT_VIEW_SELECT = {
  title: true, images: true, slug: true, category: true, digitalAccessUrl: true, creatorName: true,
  artist: { select: { displayName: true } }, charity: { select: { name: true } }, autoCertificate: true, certificateId: true,
};

// Every order response goes through this: a digital line gets its `accessUrl`
// (read / listen link) only once the order is PAID (and not since cancelled /
// refunded), and the raw product column is always removed.
export function withAccess(order) {
  if (!order) return order;
  const entitled = grantsDigitalAccess(order);
  return {
    ...order,
    items: (order.items || []).map(({ product, ...item }) => {
      const { digitalAccessUrl, ...safeProduct } = product || {};
      const digital = item.format === 'DIGITAL' || (!item.format && safeProduct.category === 'MUSIC');
      return { ...item, product: product ? safeProduct : product, accessUrl: digital && entitled ? digitalAccessUrl || null : null };
    }),
  };
}
