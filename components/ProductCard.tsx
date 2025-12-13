'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import type { DemoProduct } from '@/lib/types';
import { useState } from 'react';

interface ProductCardProps {
  product: DemoProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block bg-white border border-[#2e2e2e]/10 hover:border-[#d96857]/30 rounded-2xl overflow-hidden
        shadow-sm hover:shadow-md transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-[#f9f8f7] overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Tags */}
        <div className="absolute top-3 left-3 flex gap-2">
          {product.isNew && (
            <span className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-[#d96857] to-[#c45745] text-white rounded-full shadow-sm">
              New
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div
          className={`absolute top-3 right-3 transition-all duration-200 transform
            ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
        >
          <button
            className="w-9 h-9 rounded-full bg-white/95 shadow-lg flex items-center justify-center
              hover:bg-[#d96857] hover:text-white transition-colors"
            onClick={(e) => {
              e.preventDefault();
              // Handle wishlist action
            }}
          >
            <Heart className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="space-y-3">

          {/* Title and Brand */}
          <h3 className="font-medium text-[#2e2e2e] leading-snug">
            {product.title}
          </h3>
          {product.brand && (
            <div className="text-sm text-[#2e2e2e]/60 font-medium mt-0.5 capitalize">
              {product.brand.toLowerCase()}
            </div>
          )}

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {product.category && (
              <span className="text-xs px-3 py-1 bg-[#f9f8f7] rounded-full text-[#2e2e2e]/70 border border-[#2e2e2e]/10">
                {product.category}
              </span>
            )}
            {product.roomType && (
              <span className="text-xs px-3 py-1 bg-[#f9f8f7] rounded-full text-[#2e2e2e]/70 border border-[#2e2e2e]/10">
                {product.roomType}
              </span>
            )}
          </div>

          {/* Price and Rating */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-lg font-semibold text-[#d96857]">
                {typeof product.price === "number"
                  ? `₹${product.price.toLocaleString("en-IN")}`
                  : product.price}
              </span>
              {typeof product.mrp === "number" && product.mrp > product.price && (
                <span className="ml-2 text-sm text-zinc-400 line-through">
                  ₹{product.mrp.toLocaleString("en-IN")}
                </span>
              )}
            </div>
            {product.rating && (
              <div className="flex items-center gap-1.5 bg-[#f9f8f7] px-2 py-1 rounded-full">
                <span className="text-yellow-500">★</span>
                <span className="text-sm text-[#2e2e2e]/70">{product.rating}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}