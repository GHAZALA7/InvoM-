/**
 * Generates a unique SKU for a store-product combination.
 * Format: STORE_PREFIX-CATEGORY_PREFIX-RANDOM
 * Example: DT-PHC-X7K2
 */
export function generateSKU(storeName: string, categoryName: string): string {
  const storePrefix = storeName
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 3);

  const catPrefix = categoryName
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 3);

  const random = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `${storePrefix}-${catPrefix}-${random}`;
}
