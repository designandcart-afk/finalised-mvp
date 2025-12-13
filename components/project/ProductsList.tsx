'use client';

import { Trash2 } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  imageUrl: string;
  price: number;
}

interface ProductsListProps {
  products: { product: Product; count: number }[];
  area: string;
  onRemove: (productId: string, area: string) => void;
}

export default function ProductsList({ products, area, onRemove }: ProductsListProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-zinc-500">
        No products linked yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {products.map(({ product, count }) => (
        <div
          key={product.id}
          className="flex items-center gap-3 p-3 bg-white border border-zinc-200 rounded-xl hover:shadow-md transition-all group"
        >
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-16 h-16 object-cover rounded-lg"
            loading="lazy"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-[#2e2e2e] truncate">
              {product.title}
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              ₹{product.price.toLocaleString()}
            </p>
            {count > 1 && (
              <p className="text-xs text-[#d96857] font-medium mt-1">
                Qty: {count}
              </p>
            )}
          </div>
          <button
            onClick={() => onRemove(product.id, area)}
            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all"
            title="Remove"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      ))}
    </div>
  );
}
