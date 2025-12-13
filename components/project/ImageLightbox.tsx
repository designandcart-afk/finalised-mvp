'use client';

import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageLightboxProps {
  isOpen: boolean;
  images: { id: string; imageUrl: string }[];
  currentIndex: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

export default function ImageLightbox({
  isOpen,
  images,
  currentIndex,
  onClose,
  onPrevious,
  onNext,
}: ImageLightboxProps) {
  if (!isOpen || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-10"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Image */}
      <img
        src={images[currentIndex]?.imageUrl}
        alt="Lightbox"
        className="max-w-[90vw] max-h-[90vh] object-contain"
        loading="lazy"
      />

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <button
            onClick={onPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </>
      )}

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}
