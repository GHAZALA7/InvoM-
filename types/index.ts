export type UserRole = 'super_admin' | 'manager' | 'employee'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Store {
  id: string
  name: string
  address: string | null
  is_active: boolean
  created_at: string
}

export interface OwnershipType {
  id: string
  name: string
}

export interface Category {
  id: string
  name: string
}

export interface Product {
  id: string
  name: string
  category_id: string
  ownership_type_id: string
  notes: string | null
  created_at: string
  category?: Category
  ownership_type?: OwnershipType
}

export interface StoreProduct {
  id: string
  store_id: string
  product_id: string
  quantity: number
  qr_code: string
  sku: string
  low_stock_threshold: number
  cost_price: number | null
  created_at: string
  product?: Product
  store?: Store
}

export type TransactionAction = 'sale' | 'restock' | 'correction'

export interface Transaction {
  id: string
  store_id: string
  store_product_id: string
  user_id: string
  action: TransactionAction
  quantity_changed: number
  quantity_before: number
  quantity_after: number
  notes: string | null
  created_at: string
  profile?: Profile
  store_product?: StoreProduct & { product?: Product }
  store?: Store
}
