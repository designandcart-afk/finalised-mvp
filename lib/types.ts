export type Project = {
  id: string;
  title: string;
  scope: '1BHK' | '2BHK' | '3BHK' | 'Commercial';
  status: 'wip' | 'screenshots_shared' | 'approved' | 'renders_shared' | 'delivering' | 'delivered';
  address: string;
  notes?: string;
};

export interface Product {
  id: string
  title: string
  imageUrl: string
  price: number
  mrp?: number
  category: string
  brand?: string
  roomType?: string
  description: string
  color?: string
  rating?: number
  isNew?: boolean
}

// Alias for backward compatibility
export type DemoProduct = Product;
