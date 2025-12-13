"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from 'react-hot-toast';

// Format price: use only numeric value, add ₹ if present
function formatPrice(numeric: number | null | undefined) {
  if (numeric !== null && numeric !== undefined && !isNaN(Number(numeric))) {
    return `₹${numeric}`;
  }
  return "";
}
import { supabase } from '@/lib/supabase';
import { Button, Select, Card, Badge } from "@/components/UI";
import { useAuth } from "@/lib/auth/authContext";
import { useProjects } from "@/lib/contexts/projectsContext";
import { ArrowLeft } from "lucide-react";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Carousel state for images
  const [imageIndex, setImageIndex] = useState(0);
  // Parse images once per product
  const images = useMemo(() => {
    let imgs: string[] = [];
    if (product && product.image_url) {
      try {
        let urlString = product.image_url;
        if (urlString.startsWith('d ')) urlString = urlString.slice(2);
        if (urlString.startsWith('d')) urlString = urlString.slice(1);
        // Replace low-res thumbnail with higher-res
        urlString = urlString.replace(/-100x100(\\.jpg|\\.jpeg|\\.png)/gi, '-800x800$1');
        if (urlString.trim().startsWith('[')) {
          imgs = JSON.parse(urlString);
        } else if (urlString.includes('\n')) {
          imgs = urlString.split('\n').map((s: string) => s.trim()).filter(Boolean);
        } else if (urlString.includes(',')) {
          imgs = urlString.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else {
          imgs = [urlString];
        }
      } catch {
        imgs = [product.image_url];
      }
    }
    return imgs;
  }, [product]);

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        setError(error.message || 'Product not found.');
        setProduct(null);
      } else {
        setProduct(data);
      }
      setLoading(false);
    }
    if (id) fetchProduct();
  }, [id]);

  const { user } = useAuth();
  const { projects } = useProjects();
  const isLoggedIn = !!user;
  const authEmail = user?.email || null;

  // Filter to only show user's own projects (not demo projects)
  const userProjects = useMemo(() => {
    return projects.filter(p => !p.id.startsWith('demo_'));
  }, [projects]);

  const [projectId, setProjectId] = useState("");
  const [area, setArea] = useState("");
  const [note, setNote] = useState("");

  // Set initial project when userProjects load
  useEffect(() => {
    if (userProjects.length > 0 && !projectId) {
      setProjectId(userProjects[0].id);
    }
  }, [userProjects, projectId]);

  // Get areas for the selected project
  const selectedProject = useMemo(() => {
    return userProjects.find(p => p.id === projectId);
  }, [userProjects, projectId]);

  const availableAreas = useMemo(() => {
    // Support both new `areas` array and legacy `area` string
    if (selectedProject?.areas && selectedProject.areas.length > 0) {
      return selectedProject.areas;
    }
    // Fallback to legacy single area field
    if (selectedProject?.area) {
      return [selectedProject.area];
    }
    return [];
  }, [selectedProject]);

  // Set initial area when project changes
  useEffect(() => {
    if (availableAreas.length > 0) {
      setArea(availableAreas[0]);
    } else {
      setArea("");
    }
  }, [availableAreas]);


  // Debug output for troubleshooting
  if (process.env.NODE_ENV !== 'production') {
    console.log('Product Detail Debug:', { id, loading, error, product });
  }

  if (loading) {
    return (
      <main className="p-10 text-center text-zinc-600">
        Loading product...
        <pre className="mt-4 text-xs text-left bg-zinc-100 p-2 rounded">
          {JSON.stringify({ id, loading, error, product }, null, 2)}
        </pre>
      </main>
    );
  }
  if (error || !product) {
    return (
      <main className="p-10 text-center text-zinc-600">
        {error || 'Product not found.'}
        <pre className="mt-4 text-xs text-left bg-zinc-100 p-2 rounded">
          {JSON.stringify({ id, loading, error, product }, null, 2)}
        </pre>
      </main>
    );
  }

  // Store "Add to Design" - save to Supabase project_products table
  async function addToProjectProducts(projectId: string, productId: string, area: string, note?: string) {
    try {
      // Save to Supabase
      const { data, error } = await supabase
        .from('project_products')
        .insert([
          {
            project_id: projectId,
            product_id: productId,
            area: area,
            notes: note || null,
          }
        ])
        .select();
      
      if (error) {
        console.error('Error saving to Supabase:', error);
        throw error;
      }
      
      // Also store in localStorage as backup and for immediate UI update
      const key = "dc:projectProducts";
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      const entry = {
        id: data?.[0]?.id || `pp_${Date.now()}`,
        projectId,
        productId,
        area,
        note: note || "",
        createdAt: Date.now(),
      };
      list.push(entry);
      localStorage.setItem(key, JSON.stringify(list));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('projectProductsUpdated'));
      
      return true;
    } catch (error) {
      console.error('Failed to add product:', error);
      return false;
    }
  }

  async function handleAddToDesign() {
    if (!projectId) {
      toast.error("Please choose a project.");
      return;
    }
    if (!area) {
      toast.error("Please select an area. Add areas to your project if needed.");
      return;
    }
    
    const projectName = selectedProject?.name || projectId;
    const productName = product.name || product.title || "Product";
    
    const loadingToast = toast.loading('Adding to design...');
    
    const success = await addToProjectProducts(projectId, product.id, area, note);
    
    toast.dismiss(loadingToast);
    
    if (success) {
      toast.success(
        `✓ Added "${productName}" to ${projectName} (${area})`,
        {
          duration: 3000,
          style: {
            background: '#10b981',
            color: '#fff',
            borderRadius: '12px',
            padding: '12px 16px',
          },
        }
      );
      setNote("");
    } else {
      toast.error('Failed to add product. Please try again.');
    }
  }

  return (
    <main className="min-h-screen bg-[#efeee9]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/products')}
          className="mb-6 flex items-center gap-2 text-[#2e2e2e] hover:text-[#d96857] transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Products</span>
        </button>

        {/* Product Card */}
        <Card className="overflow-hidden shadow-lg">
          <div className="grid md:grid-cols-2 gap-8 p-8">
            {/* Left: Image */}
            <div>
              {/* Show all images if available */}
              <div className="aspect-square rounded-2xl overflow-hidden bg-[#f9f8f7] border border-[#2e2e2e]/10 flex items-center justify-center">
                {/* Product Image Carousel */}
                {images.length > 0 && (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={images[imageIndex % images.length]}
                      alt={product.name + ' image ' + ((imageIndex % images.length) + 1)}
                      className="object-cover rounded-xl border border-[#2e2e2e]/10 w-full h-full max-h-96"
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setImageIndex((i) => (i - 1 + images.length) % images.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow"
                          aria-label="Previous image"
                        >
                          <span className="text-2xl">&#8592;</span>
                        </button>
                        <button
                          onClick={() => setImageIndex((i) => (i + 1) % images.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow"
                          aria-label="Next image"
                        >
                          <span className="text-2xl">&#8594;</span>
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {images.map((_, idx) => (
                            <span
                              key={idx}
                              className={`inline-block w-2 h-2 rounded-full ${idx === (imageIndex % images.length) ? 'bg-[#d96857]' : 'bg-zinc-300'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Info + Actions */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold text-[#2e2e2e] leading-tight">
                    {product.name}
                  </h1>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {product.brand && (
                      <Badge>
                        {product.brand}
                      </Badge>
                    )}
                    {product.category && (
                      <Badge>
                        {product.category}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <div className="text-2xl font-semibold text-[#d96857]">
                    {formatPrice(product.selling_price)}
                  </div>
                  {(!!product.mrp) && (product.mrp !== product.selling_price) && (
                    <span className="line-through text-zinc-400 text-lg">{formatPrice(product.mrp)}</span>
                  )}
                </div>

                {product.description && (
                  <p className="text-[#2e2e2e]/70 leading-relaxed border-t border-[#2e2e2e]/10 pt-4">
                    {product.description}
                  </p>
                )}
                {product.dimensions && (
                  <div className="text-[#2e2e2e]/70 border-t border-[#2e2e2e]/10 pt-2">
                    <span className="font-medium text-[#2e2e2e]">Dimensions:</span> {product.dimensions}
                  </div>
                )}
                {product.specifications && (
                  <div className="text-[#2e2e2e]/70 border-t border-[#2e2e2e]/10 pt-2">
                    <span className="font-medium text-[#2e2e2e]">Specifications:</span> {product.specifications}
                  </div>
                )}
              </div>

              {/* Designer Actions */}
              {isLoggedIn ? (
                <div className="space-y-4 border-t border-[#2e2e2e]/10 pt-6">
                  {userProjects.length === 0 ? (
                    <div className="text-center py-4 text-[#2e2e2e]/60">
                      <p className="mb-3">No projects yet. Create a project first to add products.</p>
                      <Button
                        onClick={() => {
                          window.location.href = '/';
                        }}
                        className="w-full"
                      >
                        Go to Dashboard
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-[#2e2e2e] mb-2">
                          Select Project
                        </label>
                        <Select
                          value={projectId}
                          onChange={(e) => setProjectId(e.target.value)}
                        >
                          {userProjects.map((pj) => (
                            <option key={pj.id} value={pj.id}>
                              {pj.name}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#2e2e2e] mb-2">
                          Select Area
                        </label>
                        {availableAreas.length === 0 ? (
                          <div className="text-sm text-[#2e2e2e]/60 p-3 bg-[#f9f8f7] border border-[#2e2e2e]/10 rounded-xl">
                            No areas in this project. Add areas from the project page.
                          </div>
                        ) : (
                          <Select
                            value={area}
                            onChange={(e) => setArea(e.target.value)}
                          >
                            {availableAreas.map((ar) => (
                              <option key={ar} value={ar}>
                                {ar}
                              </option>
                            ))}
                          </Select>
                        )}
                      </div>
                    </>
                  )}

                  {userProjects.length > 0 && (
                    <>
                      <textarea
                        placeholder="Add a note (optional)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full min-h-[100px] resize-none border border-zinc-300 rounded-lg p-3 bg-transparent text-[#2e2e2e] placeholder:text-zinc-400 focus:outline-none focus:border-[#d96857] transition-colors"
                      />

                      <Button
                        onClick={handleAddToDesign}
                        className="w-full"
                        disabled={!projectId || !area || availableAreas.length === 0}
                      >
                        Add to Design
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="border-t border-[#2e2e2e]/10 pt-6 text-center space-y-4">
                  <p className="text-[#2e2e2e]/70">
                    Sign in to add this product to your design projects.
                  </p>
                  <Button
                    onClick={() => {
                      window.location.href = '/login';
                    }}
                    className="w-full"
                  >
                    Sign In
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Product Details */}
        <div className="mt-8 space-y-6">
          {/* Full Description */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[#2e2e2e] mb-4">Product Details</h3>
            <p className="text-[#2e2e2e]/70 text-sm leading-relaxed">
              {product.description || 'This high-quality product has been carefully selected for our catalog to ensure realistic 3D visualization and reliable sourcing options for your interior design projects.'}
            </p>
            {product.dimensions && (
              <div className="mt-2 text-sm text-[#2e2e2e]/70">
                <span className="font-medium text-[#2e2e2e]">Dimensions:</span> {product.dimensions}
              </div>
            )}
            {product.specifications && (
              <div className="mt-2 text-sm text-[#2e2e2e]/70">
                <span className="font-medium text-[#2e2e2e]">Specifications:</span> {product.specifications}
              </div>
            )}
          </Card>

          {/* Specifications Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-[#2e2e2e] mb-4">Basic Info</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <span className="text-[#2e2e2e]/60">Name</span>
                  <span className="text-[#2e2e2e] font-medium">{product.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <span className="text-[#2e2e2e]/60">Brand</span>
                  <span className="text-[#2e2e2e] font-medium">{product.brand}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <span className="text-[#2e2e2e]/60">Category</span>
                  <span className="text-[#2e2e2e] font-medium">{product.category}</span>
                </div>
                {product.dimensions && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <span className="text-[#2e2e2e]/60">Dimensions</span>
                    <span className="text-[#2e2e2e] font-medium">{product.dimensions}</span>
                  </div>
                )}
                {product.specifications && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <span className="text-[#2e2e2e]/60">Specifications</span>
                    <span className="text-[#2e2e2e] font-medium">{product.specifications}</span>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-[#2e2e2e] mb-4">Pricing</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <span className="text-[#2e2e2e]/60">MRP</span>
                  <span className="text-[#2e2e2e] font-medium">{formatPrice(product.mrp)}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <span className="text-[#2e2e2e]/60">Selling Price</span>
                  <span className="text-[#d96857] font-semibold text-lg">{formatPrice(product.selling_price)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-[#2e2e2e] mb-4">Availability</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <span className="text-[#2e2e2e]/60">Stock Status</span>
                  <Badge className="w-fit bg-green-100 text-green-700 border-green-200">In Stock</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <span className="text-[#2e2e2e]/60">Delivery</span>
                  <span className="text-[#2e2e2e] font-medium">2-4 weeks</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <span className="text-[#2e2e2e]/60">Warranty</span>
                  <span className="text-[#2e2e2e] font-medium">1 Year</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Additional Information */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[#2e2e2e] mb-4">Additional Information</h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-[#2e2e2e]">Features</h4>
                <ul className="list-disc list-inside space-y-1 text-[#2e2e2e]/70">
                  <li>Premium quality materials</li>
                  <li>Professional assembly available</li>
                  <li>Easy care and maintenance</li>
                  <li>Eco-friendly manufacturing</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-[#2e2e2e]">Care Instructions</h4>
                <ul className="list-disc list-inside space-y-1 text-[#2e2e2e]/70">
                  <li>Clean with soft, damp cloth</li>
                  <li>Avoid harsh chemicals</li>
                  <li>Keep away from direct sunlight</li>
                  <li>Follow manufacturer guidelines</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
