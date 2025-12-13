"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, ArrowLeft, Lock } from "lucide-react";
import { demoProjects, demoRenders, demoProducts, demoProjectProducts, demoProductsAll } from "@/lib/demoData";
import { useProjects } from "@/lib/contexts/projectsContext";
import { supabase } from "@/lib/supabase";
import { cartService } from "@/lib/services/cartService";
import toast from "react-hot-toast";

type ProductT = { id: string; title: string; imageUrl: string; price: number };

export default function AreaDetailPage() {
  const params = useParams<{ id: string; areaName: string }>();
  const projectId = params?.id as string;
  const areaName = params?.areaName ? decodeURIComponent(params.areaName) : '';
  const router = useRouter();

  const { getProject } = useProjects();
  const project = useMemo(() => {
    return getProject(projectId) ?? (demoProjects ?? []).find((p) => p.id === projectId);
  }, [projectId, getProject]);

  const isDemoProject = useMemo(() => project?.id?.startsWith('demo_') ?? false, [project?.id]);

  const [activeTab, setActiveTab] = useState<'renders' | 'screenshots'>('renders');
  const [activeSlide, setActiveSlide] = useState({ renders: 0, screenshots: 0 });
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectedQuantities, setSelectedQuantities] = useState<Map<string, number>>(new Map());
  const [user, setUser] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  
  // State for real project data
  const [renders, setRenders] = useState<any[]>([]);
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [projectProducts, setProjectProducts] = useState<any[]>([]);
  
  // Payment status state
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  const [loadingPaymentStatus, setLoadingPaymentStatus] = useState(true);
  
  // Helper functions for selected quantities
  const getSelectedQuantity = (productId: string) => {
    return selectedQuantities.get(productId) || 1;
  };

  const updateSelectedQuantity = (productId: string, delta: number) => {
    const currentQty = getSelectedQuantity(productId);
    const newQty = Math.max(1, currentQty + delta);
    setSelectedQuantities(new Map(selectedQuantities.set(productId, newQty)));
  };

  // Cart helper functions using Supabase data
  const isInCart = (productId: string) => {
    return cartItems.some(item => 
      item.product_id === productId && 
      item.area === areaName && 
      item.project_id === projectId
    );
  };

  const getCartQuantity = (productId: string) => {
    const item = cartItems.find(item => 
      item.product_id === productId && 
      item.area === areaName && 
      item.project_id === projectId
    );
    return item?.quantity || 0;
  };

  // Function to refresh cart data after operations
  const refreshCartItems = async () => {
    if (user) {
      try {
        const items = await cartService.getCartItems();
        setCartItems(items);
      } catch (error) {
        console.error('Failed to refresh cart items:', error);
      }
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('=== Area Detail Page Debug ===');
    console.log('URL params:', { projectId, areaName, rawAreaName: params?.areaName });
    console.log('Project:', project);
    console.log('Is Demo Project:', isDemoProject);
    console.log('All demoProjectProducts:', demoProjectProducts);
    console.log('All demoRenders:', demoRenders);
  }, [projectId, areaName, params, project, isDemoProject]);

  // Fetch real project data from Supabase
  useEffect(() => {
    if (!isDemoProject && projectId && areaName) {
      const fetchData = async () => {
        // Fetch renders
        const { data: rendersData } = await supabase
          .from('project_renders')
          .select('*')
          .eq('project_id', projectId)
          .eq('area', areaName);
        
        if (rendersData) setRenders(rendersData);

        // Fetch screenshots
        const { data: screenshotsData } = await supabase
          .from('project_screenshots')
          .select('*')
          .eq('project_id', projectId)
          .eq('area', areaName);
        
        if (screenshotsData) setScreenshots(screenshotsData);

        // Fetch project products with product details
        const { data: projectProductsData } = await supabase
          .from('project_products')
          .select(`
            *,
            product:products(*)
          `)
          .eq('project_id', projectId)
          .eq('area', areaName);
        
        if (projectProductsData) setProjectProducts(projectProductsData);
      };
      
      fetchData();
    }
  }, [isDemoProject, projectId, areaName]);

  // Get current user and load cart data
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Load cart items from Supabase
        try {
          const items = await cartService.getCartItems();
          setCartItems(items);
        } catch (error) {
          console.error('Failed to load cart items:', error);
        }
      }
    };
    
    getUser();
  }, []);
  
  // Load payment status for real projects
  useEffect(() => {
    if (!isDemoProject && projectId) {
      const loadPaymentStatus = async () => {
        setLoadingPaymentStatus(true);
        try {
          const response = await fetch(`/api/projects/${projectId}/payment-status`);
          if (response.ok) {
            const data = await response.json();
            setPaymentStatus(data);
          }
        } catch (error) {
          console.error('Failed to load payment status:', error);
        } finally {
          setLoadingPaymentStatus(false);
        }
      };
      loadPaymentStatus();
    } else {
      setLoadingPaymentStatus(false);
    }
  }, [isDemoProject, projectId]);

  // Helper function to convert Google Drive URLs to proxied URLs
  const getDirectImageUrl = (url: string) => {
    if (!url) return null;
    if (url.includes('drive.google.com')) {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // Get renders for this area
  const areaRenders = useMemo(() => {
    if (isDemoProject) {
      const renders = (demoRenders ?? []).filter((r) => r.projectId === projectId && r.area === areaName);
      console.log('Area Renders:', { projectId, areaName, totalRenders: demoRenders?.length, filteredRenders: renders.length, renders });
      return renders;
    }
    // Real projects from Supabase
    return renders.map((r) => ({
      ...r,
      imageUrl: getDirectImageUrl(r.render_url) || r.render_url,
    }));
  }, [isDemoProject, projectId, areaName, renders]);

  // Get screenshots for this area
  const areaScreenshots = useMemo(() => {
    if (isDemoProject) {
      return (demoRenders ?? []).filter((r) => r.projectId === projectId && r.area === areaName);
    }
    // Real projects from Supabase
    return screenshots.map((s) => ({
      ...s,
      imageUrl: getDirectImageUrl(s.image_url) || s.image_url,
    }));
  }, [isDemoProject, projectId, areaName, screenshots]);

  // Get products for this area - using the same logic as the main project page
  const areaProducts = useMemo(() => {
    if (isDemoProject) {
      // Get all project-product links for this area
      const linkedProducts = (demoProjectProducts ?? [])
        .filter((pp) => pp.projectId === projectId && pp.area === areaName);
      
      // Map to actual product details from demoProductsAll
      const products = linkedProducts
        .map((l) => (demoProductsAll ?? []).find((p) => p.id === l.productId))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => ({
          id: p.id,
          title: p.title,
          imageUrl: p.imageUrl,
          price: p.price,
        }));
      
      console.log('Area Products:', { 
        projectId, 
        areaName, 
        totalLinks: demoProjectProducts?.length,
        areaLinks: linkedProducts.length,
        productsCount: products.length,
        linkedProducts,
        products
      });
      
      return products;
    }
    // Real projects from Supabase
    return projectProducts
      .filter((pp) => pp.product)
      .map((pp) => ({
        id: pp.product.id,
        title: pp.product.title || pp.product.name || 'Product',
        imageUrl: pp.product.image_url || pp.product.imageUrl,
        price: pp.product.price || pp.product.selling_price || 0,
      }));
  }, [isDemoProject, projectId, areaName, projectProducts]);
  // Count product occurrences - count each linked instance
  const productCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (isDemoProject) {
      (demoProjectProducts ?? [])
        .filter((pp) => pp.projectId === projectId && pp.area === areaName)
        .forEach((pp) => {
          counts.set(pp.productId, (counts.get(pp.productId) || 0) + 1);
        });
      console.log('Product Counts:', { counts: Object.fromEntries(counts) });
    } else {
      // Real projects - count from fetched project products
      projectProducts.forEach((pp) => {
        const productId = pp.product_id || pp.productId;
        counts.set(productId, (counts.get(productId) || 0) + 1);
      });
    }
    return counts;
  }, [isDemoProject, projectId, areaName, projectProducts]);

  // Get unique products
  const uniqueProducts = useMemo(() => {
    const seen = new Set<string>();
    return areaProducts.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [areaProducts]);





  const currentImages = activeTab === 'renders' ? areaRenders : areaScreenshots;
  const currentIndex = activeSlide[activeTab];

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Project not found</p>
          <button
            onClick={() => router.push('/projects')}
            className="mt-4 px-6 py-2 bg-[#d96857] text-white rounded-lg hover:bg-[#c85745]"
          >
            Go to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf8f6] to-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[2000px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#2e2e2e]" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-[#2e2e2e]">{areaName}</h1>
                <p className="text-xs text-[#2e2e2e]/60">{project.name}</p>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex gap-2 bg-[#f7f4f2] p-1.5 rounded-xl">
              <button
                className={`text-sm px-6 py-2.5 rounded-lg font-medium transition-all ${
                  activeTab === 'renders'
                    ? 'bg-white text-[#d96857] shadow-sm'
                    : 'text-gray-600 hover:text-[#2e2e2e]'
                }`}
                onClick={() => setActiveTab('renders')}
              >
                Renders
              </button>
              <button
                className={`text-sm px-6 py-2.5 rounded-lg font-medium transition-all ${
                  activeTab === 'screenshots'
                    ? 'bg-white text-[#d96857] shadow-sm'
                    : 'text-gray-600 hover:text-[#2e2e2e]'
                }`}
                onClick={() => setActiveTab('screenshots')}
              >
                Screenshots
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Split Screen Layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Side - Renders/Screenshots */}
        <div className="w-1/2 border-r border-gray-200 bg-white overflow-hidden">
          <div className="p-8 h-full flex flex-col">
            {/* Image Display */}
            {currentImages.length > 0 ? (
              <div className="relative rounded-2xl overflow-hidden bg-[#f7f4f2] border border-gray-200 flex-1 flex items-center justify-center">
                <img
                  src={currentImages[currentIndex]?.imageUrl}
                  className={`w-full h-full object-cover cursor-pointer ${
                    activeTab === 'renders' && !isDemoProject && !paymentStatus?.rendersUnlocked ? 'blur-md' : ''
                  }`}
                  alt={activeTab}
                  onClick={() => {
                    if (activeTab === 'renders' && !isDemoProject && !paymentStatus?.rendersUnlocked) {
                      return; // Don't open lightbox if locked
                    }
                    setLightbox(currentImages[currentIndex]?.imageUrl);
                  }}
                />
                
                {/* Lock Overlay for Renders */}
                {activeTab === 'renders' && !isDemoProject && !paymentStatus?.rendersUnlocked && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                    <Lock className="w-16 h-16 text-white mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Renders Locked</h3>
                    <p className="text-sm text-white/80 text-center max-w-xs px-4">
                      Complete payment to unlock renders
                    </p>
                  </div>
                )}

                {/* Navigation Arrows */}
                {currentImages.length > 1 && (
                  <>
                    <button
                      onClick={() => {
                        setActiveSlide((prev) => ({
                          ...prev,
                          [activeTab]: currentIndex > 0 ? currentIndex - 1 : currentImages.length - 1,
                        }));
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6 text-gray-700" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveSlide((prev) => ({
                          ...prev,
                          [activeTab]: currentIndex < currentImages.length - 1 ? currentIndex + 1 : 0,
                        }));
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <ChevronRight className="w-6 h-6 text-gray-700" />
                    </button>
                  </>
                )}

                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full text-white text-sm">
                  {currentIndex + 1} / {currentImages.length}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 h-[600px] flex items-center justify-center">
                <p className="text-gray-500">No {activeTab} available</p>
              </div>
            )}

            {/* Thumbnails */}
            {currentImages.length > 1 && (
              <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
                {currentImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlide((prev) => ({ ...prev, [activeTab]: idx }))}
                    className={`flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentIndex
                        ? 'border-[#d96857] shadow-lg scale-105'
                        : 'border-gray-200 hover:border-[#d96857]/50'
                    }`}
                  >
                    <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Products */}
        <div className="w-1/2 bg-gradient-to-br from-white to-[#faf8f6] relative">
          {/* Fixed Header */}
          <div className="sticky top-0 z-20 bg-gradient-to-br from-white to-[#faf8f6] backdrop-blur-sm border-b border-gray-200/30">
            <div className="px-8 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#2e2e2e] mb-1">Products</h2>
                  <p className="text-sm text-gray-500">{uniqueProducts.length} items available</p>
                </div>
                
                <div className="flex items-center gap-4">
                  {selectedProducts.size > 0 && (
                    <div className="bg-white px-3 py-1.5 rounded-full border border-[#d96857]/20 shadow-sm">
                      <span className="text-sm font-medium text-[#d96857]">
                        {selectedProducts.size} selected
                      </span>
                    </div>
                  )}
                  
                  <button
                    onClick={async () => {
                      let addedCount = 0;
                      
                      for (const productId of selectedProducts) {
                        const product = uniqueProducts.find(p => p.id === productId);
                        if (!product) continue;
                        
                        const quantity = getSelectedQuantity(productId);
                        
                        try {
                          await cartService.addToCart(
                            product.id,
                            quantity,
                            projectId,
                            areaName,
                            {
                              title: product.title,
                              price: product.price,
                              imageUrl: product.imageUrl
                            }
                          );
                          addedCount++;
                        } catch (error) {
                          console.error('Failed to add to cart:', error);
                          toast.error(`Failed to add ${product.title} to cart`);
                        }
                      }
                      
                      setSelectedProducts(new Set());
                      setSelectedQuantities(new Map());
                      
                      // Refresh cart data
                      await refreshCartItems();
                      
                      if (addedCount > 0) {
                        toast.success(`${addedCount} product${addedCount > 1 ? 's' : ''} added to cart`, {
                          duration: 2000,
                          position: 'top-right',
                          style: {
                            background: '#10b981',
                            color: '#fff',
                            padding: '12px 20px',
                            fontSize: '14px',
                            fontWeight: '500',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
                          },
                        });
                      }
                    }}
                    disabled={selectedProducts.size === 0}
                    className={`px-6 py-3 font-semibold rounded-xl transition-all duration-200 shadow-lg ${
                      selectedProducts.size > 0 
                        ? 'bg-[#d96857] hover:bg-[#c85745] text-white transform hover:scale-105 hover:shadow-xl' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      Add to Cart
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Scrollable Content */}
          <div className="overflow-y-auto scrollbar-hide h-[calc(100vh-73px-88px)]">
            <div className="p-8 pt-6">

            {uniqueProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <div className="w-20 h-20 rounded-full bg-[#d96857]/10 flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-[#d96857]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-sm text-[#2e2e2e]/60">No products added to this area yet</p>
                <button
                  onClick={() => router.push('/products')}
                  className="mt-4 px-6 py-2.5 bg-[#d96857] text-white rounded-lg hover:bg-[#c85745] transition-colors font-medium"
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  {uniqueProducts.map((p) => {
                  const count = productCounts.get(p.id) || 0;
                  const cartQty = getCartQuantity(p.id);
                  const inCart = isInCart(p.id);
                  const isSelected = selectedProducts.has(p.id);

                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                    >
                      {/* Product Image Container */}
                      <div className="relative">
                        {/* Product Image */}
                        <div className="w-full aspect-square bg-[#f7f4f2] overflow-hidden">
                          <img
                            src={p.imageUrl}
                            alt={p.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        {/* Checkbox at top-left */}
                        <div className="absolute top-2 left-2 z-20">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelected = new Set(selectedProducts);
                              if (e.target.checked) {
                                newSelected.add(p.id);
                              } else {
                                newSelected.delete(p.id);
                              }
                              setSelectedProducts(newSelected);
                            }}
                            className="w-5 h-5 cursor-pointer"
                            style={{
                              accentColor: '#d96857',
                            }}
                          />
                        </div>
                        

                        
                        {/* Quantity Selector overlaying at bottom */}
                        <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2">
                          <div className="flex items-center justify-center gap-0 bg-white/95 rounded-md shadow-lg overflow-hidden border border-[#d96857]/20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateSelectedQuantity(p.id, -1);
                              }}
                              className="w-6 h-6 flex items-center justify-center hover:bg-[#d96857]/10 active:bg-[#d96857]/20 transition-colors border-r border-[#d96857]/20"
                            >
                              <svg className="w-3 h-3 text-[#d96857]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                              </svg>
                            </button>
                            
                            <div className="w-7 h-6 flex items-center justify-center border-r border-[#d96857]/20">
                              <span className="text-xs font-bold text-[#2e2e2e]">{getSelectedQuantity(p.id)}</span>
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateSelectedQuantity(p.id, 1);
                              }}
                              className="w-6 h-6 flex items-center justify-center hover:bg-[#d96857]/10 active:bg-[#d96857]/20 transition-colors"
                            >
                              <svg className="w-3 h-3 text-[#d96857]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-3 space-y-1">
                        {/* Product Name - Clickable */}
                        <h3 
                          className="text-xs font-medium text-[#2e2e2e] line-clamp-2 leading-tight cursor-pointer hover:text-[#d96857] transition-colors"
                          onClick={() => router.push(`/products/${p.id}`)}
                        >
                          {p.title}
                        </h3>

                        {/* Product Price */}
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-[#d96857]">₹{p.price.toLocaleString()}</p>
                          {inCart && (
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                              In Cart
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                  })}
                  
                  {/* Add Product Button - Same size as product thumbnail */}
                  <button
                  onClick={() => router.push('/products')}
                  className="aspect-square rounded-xl border-2 border-dashed border-[#d96857]/40 hover:border-[#d96857] bg-[#d96857]/5 hover:bg-[#d96857]/10 transition-all flex items-center justify-center"
                >
                  <svg className="w-12 h-12 text-[#d96857]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/95 z-[1001] flex items-center justify-center p-8"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={lightbox}
            alt="Lightbox"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
