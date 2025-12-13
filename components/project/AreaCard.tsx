'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AreaCardProps {
  area: string;
  areaRenders: any[];
  areaScreens: any[];
  activeTab: 'renders' | 'screenshots';
  activeSlide: number;
  onTabChange: (tab: 'renders' | 'screenshots') => void;
  onSlideChange: (index: number) => void;
  onImageClick: (type: 'renders' | 'screenshots', index: number) => void;
  getStatusButtons: (area: string, type: 'renders' | 'screenshots', index: number) => React.ReactNode;
}

export default function AreaCard({
  area,
  areaRenders,
  areaScreens,
  activeTab,
  activeSlide,
  onTabChange,
  onSlideChange,
  onImageClick,
  getStatusButtons,
}: AreaCardProps) {
  const images = activeTab === 'renders' ? areaRenders : areaScreens;
  const hasImages = images.length > 0;

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all">
      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => onTabChange('renders')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
            activeTab === 'renders'
              ? 'bg-[#d96857] text-white'
              : 'bg-white text-[#2e2e2e] hover:bg-zinc-50'
          }`}
        >
          Renders ({areaRenders.length})
        </button>
        <button
          onClick={() => onTabChange('screenshots')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
            activeTab === 'screenshots'
              ? 'bg-[#d96857] text-white'
              : 'bg-white text-[#2e2e2e] hover:bg-zinc-50'
          }`}
        >
          Screenshots ({areaScreens.length})
        </button>
      </div>

      {/* Image Display */}
      {hasImages ? (
        <div className="relative">
          <img
            src={images[activeSlide]?.imageUrl}
            className="w-full h-[400px] object-cover cursor-pointer"
            alt={activeTab}
            loading="lazy"
            onClick={() => onImageClick(activeTab, activeSlide)}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMDAgMTAwQzE2MS4zIDEwMCAxMzAgMTMxLjMgMTMwIDE3MFYyMzBDMTMwIDI2OC43IDE2MS4zIDMwMCAyMDAgMzAwQzIzOC43IDMwMCAyNzAgMjY4LjcgMjcwIDIzMFYxNzBDMjcwIDEzMS4zIDIzOC43IDEwMCAyMDAgMTAwWk0yMDAgMjcwQzE3Ny45IDI3MCAyNTAgMjQ3LjEgMTUwIDIzMFYxNzBDMTUwIDE0Mi4zIDE3Mi4zIDEyMCAyMDAgMTIwQzIyNy43IDEyMCAyNTAgMTQyLjMgMjUwIDE3MFYyMzBDMjUwIDI0Ny4xIDIyNy43IDI3MCAyMDAgMjcwWiIgZmlsbD0iIzk5OTk5OSIvPgo8cGF0aCBkPSJNMTcwIDE3MEMxNzAgMTUzLjMgMTgzLjMgMTQwIDIwMCAxNDBDMjE2LjcgMTQwIDIzMCAxNTMuMyAyMzAgMTcwQzIzMCAxODYuNyAyMTYuNyAyMDAgMjAwIDIwMEMxODMuMyAyMDAgMTcwIDE4Ni43IDE3MCAxNzBaIiBmaWxsPSIjOTk5OTk5Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMzMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2NjY2IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==';
            }}
          />
          
          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSlideChange(activeSlide > 0 ? activeSlide - 1 : images.length - 1);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100"
              >
                <ChevronLeft className="w-6 h-6 text-gray-700" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSlideChange(activeSlide < images.length - 1 ? activeSlide + 1 : 0);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100"
              >
                <ChevronRight className="w-6 h-6 text-gray-700" />
              </button>
            </>
          )}
          
          {/* Status Buttons */}
          <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2">
            {getStatusButtons(area, activeTab, activeSlide)}
          </div>
        </div>
      ) : (
        <div className="h-[400px] flex items-center justify-center text-sm text-black/50">
          No {activeTab} yet
        </div>
      )}
    </div>
  );
}
