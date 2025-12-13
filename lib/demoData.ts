// Demo-mode data. Safe to extend without a backend.

import type { DemoProduct } from './types';

export type DemoRender = {
  id: string;
  imageUrl: string;
  status?: "pending" | "approved" | "changes";
  // NEW: link to project + area for filtering on details page
  projectId?: string;
  area?: string;
};

export type DemoUpload = {
  id: string;
  name: string;
  size: number;
  mime: string;
  url: string; // in demo: blob: URL; in prod: Drive/Supabase URL
};

export type DemoProject = {
  id: string;
  name: string;
  project_code?: string;
  scope: string;
  address?: string;
  pincode?: string;
  notes?: string;
  area?: string;
  // Optional list of areas (newer format). Use either `area` (legacy single) or `areas`.
  areas?: string[];
  status?: string;
  uploads?: DemoUpload[];
  createdAt: number; // auto-captured
};

// NEW: relation table for products linked to a project & area
export type DemoProjectProduct = {
  id: string;
  projectId: string;
  productId: string;
  area: string;
};

// -------------------- Seed Data --------------------

export const demoProducts: DemoProduct[] = [
  {
    id: "prod_1",
    title: "Linen Sofa 3-Seater",
    imageUrl:
      "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=1200&auto=format&fit=crop",
    price: 39999,
    category: "Living Room",
    description:
      "Comfortable 3-seater linen fabric sofa with wooden legs and timeless design, perfect for modern living rooms.",
  },
  {
    id: "prod_2",
    title: "Pendant Light Brass",
    imageUrl:
      "https://images.unsplash.com/photo-1540574163026-643ea20ade25?q=80&w=1200&auto=format&fit=crop",
    price: 6999,
    category: "Lighting",
    description:
      "Elegant brass pendant light with matte finish, ideal for dining or lounge spaces.",
  },
  {
    id: "prod_3",
    title: "Walnut Coffee Table",
    imageUrl:
      "https://images.unsplash.com/photo-1615870216515-4f6a87c87fec?q=80&w=1200&auto=format&fit=crop",
    price: 12999,
    category: "Furniture",
    description:
      "Premium walnut veneer coffee table with minimal steel legs — sturdy, aesthetic, and functional.",
  },
];

export const demoProjects: DemoProject[] = [
  {
    id: "demo_1",
    name: "2BHK - Koramangala",
    scope: "2BHK",
    address: "12, 5th Cross, Koramangala, Bengaluru",
    area: "Living Room",
    areas: ["Living Room", "Kitchen", "Bedroom"],
    status: "in_progress",
    uploads: [],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 4, // 4 days ago
  },
  {
    id: "demo_2",
    name: "Villa - Whitefield",
    scope: "Commercial",
    address: "Plot 27, Palm Meadows, Whitefield, Bengaluru",
    area: "Dining",
    areas: ["Dining", "Living Room"],
    status: "designs_shared",
    uploads: [],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
  },
  {
    id: "demo_3",
    name: "3BHK - Indiranagar",
    scope: "3BHK",
    address: "45, 8th Main, Indiranagar, Bengaluru",
    area: "Master Bedroom",
    areas: ["Master Bedroom"],
    status: "approved",
    uploads: [],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7, // 7 days ago
  },
  {
    id: "demo_4",
    name: "Office Space - HSR",
    scope: "Commercial",
    address: "Tech Park, HSR Layout, Bengaluru",
    area: "Reception",
    areas: ["Reception"],
    status: "ordered",
    uploads: [],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 1, // 1 day ago
  },
  {
    id: "demo_5",
    name: "1BHK - JP Nagar",
    scope: "1BHK",
    address: "33, 4th Phase, JP Nagar, Bengaluru",
    area: "Living Room",
    areas: ["Living Room"],
    status: "on_hold",
    uploads: [],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3, // 3 days ago
  },
];

export const demoRenders: DemoRender[] = [
  // Demo Project 1 - 2BHK Koramangala
  {
    id: "ren_1",
    imageUrl: "https://images.unsplash.com/photo-1514517220035-0001f84778f5?q=80&w=1600&auto=format&fit=crop",
    status: "changes",
    projectId: "demo_1",
    area: "Living Room",
  },
  {
    id: "ren_1b",
    imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1600&auto=format&fit=crop",
    status: "approved",
    projectId: "demo_1",
    area: "Living Room",
  },
  {
    id: "ren_6",
    imageUrl: "https://images.unsplash.com/photo-1616137466211-f939a420be84?q=80&w=1600&auto=format&fit=crop",
    status: "pending",
    projectId: "demo_1",
    area: "Kitchen",
  },
  {
    id: "ren_6b",
    imageUrl: "https://images.unsplash.com/photo-1556911220-bff31c812dba?q=80&w=1600&auto=format&fit=crop",
    status: "approved",
    projectId: "demo_1",
    area: "Kitchen",
  },
  {
    id: "ren_1c",
    imageUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=1600&auto=format&fit=crop",
    status: "pending",
    projectId: "demo_1",
    area: "Bedroom",
  },
  {
    id: "ren_1d",
    imageUrl: "https://images.unsplash.com/photo-1616594266889-f99f76596aa2?q=80&w=1600&auto=format&fit=crop",
    status: "approved",
    projectId: "demo_1",
    area: "Bedroom",
  },
  // Demo Project 2 - Villa Whitefield
  {
    id: "ren_2",
    imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1600&auto=format&fit=crop",
    status: "approved",
    projectId: "demo_2",
    area: "Dining",
  },
  {
    id: "ren_2b",
    imageUrl: "https://images.unsplash.com/photo-1617098720902-24f16669c9cb?q=80&w=1600&auto=format&fit=crop",
    status: "approved",
    projectId: "demo_2",
    area: "Dining",
  },
  {
    id: "ren_2c",
    imageUrl: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1600&auto=format&fit=crop",
    status: "approved",
    projectId: "demo_2",
    area: "Living Room",
  },
  // Demo Project 3 - 3BHK Indiranagar
  {
    id: "ren_3",
    imageUrl: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?q=80&w=1600&auto=format&fit=crop",
    status: "pending",
    projectId: "demo_3",
    area: "Master Bedroom",
  },
  {
    id: "ren_3b",
    imageUrl: "https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=1600&auto=format&fit=crop",
    status: "approved",
    projectId: "demo_3",
    area: "Master Bedroom",
  },
  // Demo Project 4 - Office Space HSR
  {
    id: "ren_4",
    imageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=1600&auto=format&fit=crop",
    status: "approved",
    projectId: "demo_4",
    area: "Reception",
  },
  {
    id: "ren_4b",
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1600&auto=format&fit=crop",
    status: "approved",
    projectId: "demo_4",
    area: "Reception",
  },
  // Demo Project 5 - 1BHK JP Nagar
  {
    id: "ren_5",
    imageUrl: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1600&auto=format&fit=crop",
    status: "changes",
    projectId: "demo_5",
    area: "Living Room",
  },
  {
    id: "ren_5b",
    imageUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1600&auto=format&fit=crop",
    status: "pending",
    projectId: "demo_5",
    area: "Living Room",
  },
];

// NEW: products linked to project+area
export const demoProjectProducts: DemoProjectProduct[] = [
  // Demo Project 1 - 2BHK Koramangala
  { id: "pp_1", projectId: "demo_1", productId: "prod_1", area: "Living Room" },
  { id: "pp_2", projectId: "demo_1", productId: "prod_3", area: "Living Room" },
  { id: "pp_3", projectId: "demo_1", productId: "prod_105", area: "Living Room" },
  { id: "pp_4", projectId: "demo_1", productId: "prod_104", area: "Living Room" },
  { id: "pp_5", projectId: "demo_1", productId: "prod_110", area: "Living Room" },
  { id: "pp_10", projectId: "demo_1", productId: "prod_107", area: "Kitchen" },
  { id: "pp_11", projectId: "demo_1", productId: "prod_2", area: "Kitchen" },
  { id: "pp_12", projectId: "demo_1", productId: "prod_106", area: "Bedroom" },
  { id: "pp_13", projectId: "demo_1", productId: "prod_101", area: "Bedroom" },
  
  // Demo Project 2 - Villa Whitefield
  { id: "pp_14", projectId: "demo_2", productId: "prod_109", area: "Dining" },
  { id: "pp_15", projectId: "demo_2", productId: "prod_2", area: "Dining" },
  { id: "pp_16", projectId: "demo_2", productId: "prod_102", area: "Dining" },
  { id: "pp_17", projectId: "demo_2", productId: "prod_1", area: "Living Room" },
  { id: "pp_18", projectId: "demo_2", productId: "prod_3", area: "Living Room" },
  { id: "pp_19", projectId: "demo_2", productId: "prod_110", area: "Living Room" },
  
  // Demo Project 3 - 3BHK Indiranagar
  { id: "pp_20", projectId: "demo_3", productId: "prod_106", area: "Master Bedroom" },
  { id: "pp_21", projectId: "demo_3", productId: "prod_110", area: "Master Bedroom" },
  { id: "pp_22", projectId: "demo_3", productId: "prod_101", area: "Master Bedroom" },
  { id: "pp_23", projectId: "demo_3", productId: "prod_104", area: "Master Bedroom" },
  
  // Demo Project 4 - Office Space HSR
  { id: "pp_24", projectId: "demo_4", productId: "prod_103", area: "Reception" },
  { id: "pp_25", projectId: "demo_4", productId: "prod_102", area: "Reception" },
  { id: "pp_26", projectId: "demo_4", productId: "prod_105", area: "Reception" },
  { id: "pp_27", projectId: "demo_4", productId: "prod_1", area: "Reception" },
  
  // Demo Project 5 - 1BHK JP Nagar
  { id: "pp_28", projectId: "demo_5", productId: "prod_105", area: "Living Room" },
  { id: "pp_29", projectId: "demo_5", productId: "prod_104", area: "Living Room" },
  { id: "pp_30", projectId: "demo_5", productId: "prod_1", area: "Living Room" },
  { id: "pp_31", projectId: "demo_5", productId: "prod_3", area: "Living Room" },
  { id: "pp_32", projectId: "demo_5", productId: "prod_110", area: "Living Room" },
];
// -------------------- Demo Cart & Orders (for presentation) --------------------

export type DemoCartLine = {
  id: string;
  productId: string;
  qty: number;
  projectId?: string;
  area?: string;
};

export const demoCart: DemoCartLine[] = [
  {
    id: "line_1",
    productId: "prod_1", // Linen Sofa
    qty: 1,
    projectId: "demo_1", // 2BHK - Koramangala
    area: "Living Room",
  },
  {
    id: "line_2",
    productId: "prod_2", // Pendant Light
    qty: 2,
    projectId: "demo_2", // Villa - Whitefield
    area: "Dining",
  },
  {
    id: "line_3",
    productId: "prod_3", // Coffee Table
    qty: 1,
    projectId: "demo_1", // 2BHK - Koramangala
    area: "Living Room",
  },
];

// Demo order type (simple)
export type DemoOrder = {
  id: string;
  items: DemoCartLine[];
  total: number;
  status: string;
  ts: number;
};

export const demoOrders: DemoOrder[] = [
  {
    id: "ord_1",
    items: [
      { id: "line_1", productId: "prod_1", qty: 1, projectId: "demo_1", area: "Living Room" },
      { id: "line_3", productId: "prod_3", qty: 1, projectId: "demo_1", area: "Living Room" },
    ],
    total: 52998,
    status: "Delivered",
    ts: Date.now() - 1000 * 60 * 60 * 24 * 3, // 3 days ago
  },
  {
    id: "ord_2",
    items: [
      { id: "line_2", productId: "prod_2", qty: 2, projectId: "demo_2", area: "Dining" },
    ],
    total: 13998,
    status: "Placed",
    ts: Date.now() - 1000 * 60 * 60 * 12, // 12 hours ago
  },
  {
    id: "ord_3",
    items: [
      { id: "line_4", productId: "prod_106", qty: 1, projectId: "demo_3", area: "Master Bedroom" },
      { id: "line_5", productId: "prod_110", qty: 2, projectId: "demo_3", area: "Master Bedroom" },
    ],
    total: 60970,
    status: "Shipped",
    ts: Date.now() - 1000 * 60 * 60 * 24 * 1, // 1 day ago
  },
  {
    id: "ord_4",
    items: [
      { id: "line_6", productId: "prod_103", qty: 4, projectId: "demo_4", area: "Reception" },
      { id: "line_7", productId: "prod_102", qty: 6, projectId: "demo_4", area: "Reception" },
    ],
    total: 81920,
    status: "Processing",
    ts: Date.now() - 1000 * 60 * 60 * 6, // 6 hours ago
  },
  {
    id: "ord_5",
    items: [
      { id: "line_8", productId: "prod_105", qty: 1, projectId: "demo_5", area: "Living Room" },
      { id: "line_9", productId: "prod_104", qty: 2, projectId: "demo_5", area: "Living Room" },
    ],
    total: 36970,
    status: "Placed",
    ts: Date.now() - 1000 * 60 * 30, // 30 minutes ago
  },
];


// /* EXTRA DEMO PRODUCTS */
export const extraDemoProducts: DemoProduct[] = [
  { 
    id: "prod_101",
    title: "Walnut Lounge Chair",
    imageUrl: "https://images.unsplash.com/photo-1549187774-b4e9b0445b41?w=800&auto=format&fit=crop",
    price: 18990,
    category: "Living Room",
    roomType: "Living Room",
    description: "Ergonomic lounge chair in walnut finish with brass legs.",
    color: "#964B00",
    rating: 4.8,
    isNew: true
  },
  {
    id: "prod_102",
    title: "Brass Pendant Light",
    imageUrl: "https://images.unsplash.com/photo-1503602642458-232111445657?w=800&auto=format&fit=crop",
    price: 4990,
    category: "Lighting",
    roomType: "Dining Room",
    description: "Warm brass dome pendant, perfect for dining tables.",
    color: "#DAA520",
    rating: 4.5
  },
  {
    id: "prod_103",
    title: "Oak Study Desk",
    imageUrl: "https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=800&auto=format&fit=crop",
    price: 12990,
    category: "Home Office",
    roomType: "Office",
    description: "Minimal oak desk with cable grommet and soft radius corners.",
    color: "#8B4513",
    rating: 4.7,
    isNew: true
  },
  {
    id: "prod_104",
    title: "Neutral Area Rug",
    imageUrl: "https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=800&auto=format&fit=crop",
    price: 5990,
    category: "Decor",
    roomType: "Living Room",
    description: "Hand-tufted wool rug in beige/ivory palette.",
    color: "#F5F5DC",
    rating: 4.3
  },
  {
    id: "prod_105",
    title: "Modern TV Unit",
    imageUrl: "https://images.unsplash.com/photo-1601392740426-907c7b028119?w=800&auto=format&fit=crop",
    price: 24990,
    category: "Living Room",
    roomType: "Living Room",
    description: "Floating TV unit with hidden cable management.",
    color: "#808080",
    rating: 4.6
  },
  {
    id: "prod_106",
    title: "Queen Size Bed",
    imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&auto=format&fit=crop",
    price: 42990,
    category: "Bedroom",
    roomType: "Bedroom",
    description: "Modern platform bed with upholstered headboard.",
    color: "#F5F5DC",
    rating: 4.9,
    isNew: true
  },
  {
    id: "prod_107",
    title: "Kitchen Island",
    imageUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop",
    price: 35990,
    category: "Kitchen",
    roomType: "Kitchen",
    description: "Mobile kitchen island with marble top and storage.",
    color: "#FFFFFF",
    rating: 4.7
  },
  {
    id: "prod_108",
    title: "Bathroom Vanity",
    imageUrl: "https://images.unsplash.com/photo-1620626011761-996317b8d101?w=800&auto=format&fit=crop",
    price: 28990,
    category: "Bathroom",
    roomType: "Bathroom",
    description: "Modern vanity unit with integrated sink and storage.",
    color: "#FFFFFF",
    rating: 4.4
  },
  {
    id: "prod_109",
    title: "Dining Set",
    imageUrl: "https://images.unsplash.com/photo-1617098474202-0d0d7f60c56b?w=800&auto=format&fit=crop",
    price: 54990,
    category: "Dining Room",
    roomType: "Dining Room",
    description: "6-seater dining set with solid wood table and chairs.",
    color: "#8B4513",
    rating: 4.8
  },
  {
    id: "prod_110",
    title: "Floor Lamp",
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop",
    price: 8990,
    category: "Lighting",
    roomType: "Living Room",
    description: "Adjustable arc floor lamp with marble base.",
    color: "#000000",
    rating: 4.5,
    isNew: true
  },
  {
    id: "prod_111",
    title: "Velvet Accent Chair",
    imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop",
    price: 22990,
    category: "Living Room",
    roomType: "Living Room",
    description: "Luxurious teal velvet accent chair with gold legs. Deep seat cushioning, 360° swivel base. Dimensions: 32\"W x 34\"D x 35\"H. Weight capacity: 120kg. Stain-resistant fabric.",
    color: "#008080",
    rating: 4.9,
    isNew: true
  },
  {
    id: "prod_112",
    title: "Marble Coffee Table",
    imageUrl: "https://images.unsplash.com/photo-1551298370-9d3d53740c72?w=800&auto=format&fit=crop",
    price: 38990,
    category: "Living Room",
    roomType: "Living Room",
    description: "Italian Carrara marble top with brass-finished metal frame. Dimensions: 48\"W x 24\"D x 18\"H. Natural stone variations. Easy-clean surface. Assembly required.",
    color: "#FFFFFF",
    rating: 4.8
  },
  {
    id: "prod_113",
    title: "Mid-Century Sideboard",
    imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop",
    price: 45990,
    category: "Living Room",
    roomType: "Living Room",
    description: "Solid teak wood sideboard with sliding doors. 3 shelves, 2 drawers. Dimensions: 72\"W x 18\"D x 32\"H. Soft-close hinges. Hand-crafted joinery. Pre-assembled.",
    color: "#8B4513",
    rating: 4.7,
    isNew: true
  },
  {
    id: "prod_114",
    title: "Modular Sofa Set",
    imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop",
    price: 89990,
    category: "Living Room",
    roomType: "Living Room",
    description: "5-piece modular sectional in grey linen. Includes corner, 2 armless chairs, chaise, ottoman. Total: 120\"W. Removable covers, machine washable. High-density foam cushions.",
    color: "#808080",
    rating: 4.9
  },
  {
    id: "prod_115",
    title: "Designer Wall Clock",
    imageUrl: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=800&auto=format&fit=crop",
    price: 3490,
    category: "Decor",
    roomType: "Living Room",
    description: "Silent quartz movement wall clock. Diameter: 16\". Brass frame, Roman numerals. Battery-powered (AA not included). Minimalist Scandinavian design.",
    color: "#DAA520",
    rating: 4.4
  },
  {
    id: "prod_116",
    title: "Recliner Sofa",
    imageUrl: "https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=800&auto=format&fit=crop",
    price: 64990,
    category: "Living Room",
    roomType: "Living Room",
    description: "3-seater power recliner in brown leather. USB charging ports, cup holders. Dimensions: 88\"W x 40\"D x 42\"H. Premium Italian leather. Electric footrest and headrest.",
    color: "#964B00",
    rating: 4.8,
    isNew: true
  },
  {
    id: "prod_117",
    title: "King Size Upholstered Bed",
    imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&auto=format&fit=crop",
    price: 54990,
    category: "Bedroom",
    roomType: "Bedroom",
    description: "Upholstered platform bed with tufted headboard. King size (78\"W x 80\"L). Grey linen fabric, solid wood slats. Storage drawers available. Requires king mattress.",
    color: "#808080",
    rating: 4.7
  },
  {
    id: "prod_118",
    title: "6-Drawer Dresser",
    imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&auto=format&fit=crop",
    price: 32990,
    category: "Bedroom",
    roomType: "Bedroom",
    description: "Solid oak dresser with 6 spacious drawers. Dimensions: 60\"W x 18\"D x 36\"H. Dovetail joints, soft-close glides. Natural wood grain finish. Mirror available separately.",
    color: "#8B4513",
    rating: 4.6
  },
  {
    id: "prod_119",
    title: "Bedside Table Pair",
    imageUrl: "https://images.unsplash.com/photo-1594480915095-83d89129f-56a?w=800&auto=format&fit=crop",
    price: 18990,
    category: "Bedroom",
    roomType: "Bedroom",
    description: "Set of 2 matching nightstands. Each: 20\"W x 16\"D x 24\"H. 2 drawers + 1 shelf. Walnut veneer with matte black handles. USB port in top drawer. Sold as pair.",
    color: "#964B00",
    rating: 4.5,
    isNew: true
  },
  {
    id: "prod_120",
    title: "Wardrobe with Mirror",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop",
    price: 72990,
    category: "Bedroom",
    roomType: "Bedroom",
    description: "3-door sliding wardrobe. Dimensions: 96\"W x 24\"D x 84\"H. Mirror on center door, LED interior lighting, hanging rail, 5 shelves. Soft-close mechanism. Assembly service available.",
    color: "#FFFFFF",
    rating: 4.8
  },
  {
    id: "prod_121",
    title: "Memory Foam Mattress",
    imageUrl: "https://images.unsplash.com/photo-1631049035634-c04e04f2c0e8?w=800&auto=format&fit=crop",
    price: 42990,
    category: "Bedroom",
    roomType: "Bedroom",
    description: "Queen size memory foam mattress. 12\" thick, 3-layer construction. Cooling gel-infused top layer. Hypoallergenic, dust-mite resistant. 10-year warranty. Medium-firm support.",
    color: "#FFFFFF",
    rating: 4.9,
    isNew: true
  },
  {
    id: "prod_122",
    title: "8-Seater Dining Table",
    imageUrl: "https://images.unsplash.com/photo-1617098474202-0d0d7f60c56b?w=800&auto=format&fit=crop",
    price: 68990,
    category: "Dining Room",
    roomType: "Dining Room",
    description: "Extendable dining table in solid mango wood. Extends from 72\" to 96\". Seats 6-8 people. Tapered legs, smooth edges. Chairs sold separately. Heat and water-resistant finish.",
    color: "#8B4513",
    rating: 4.7
  },
  {
    id: "prod_123",
    title: "Dining Chairs Set of 6",
    imageUrl: "https://images.unsplash.com/photo-1503602642458-232111445657?w=800&auto=format&fit=crop",
    price: 38990,
    category: "Dining Room",
    roomType: "Dining Room",
    description: "Set of 6 upholstered dining chairs. Grey fabric, solid wood legs. Dimensions: 18\"W x 22\"D x 38\"H. Ergonomic curved backrest. Stackable design. Easy assembly.",
    color: "#808080",
    rating: 4.5
  },
  {
    id: "prod_124",
    title: "Glass Display Cabinet",
    imageUrl: "https://images.unsplash.com/photo-1594526538404-8583be2e7b1f?w=800&auto=format&fit=crop",
    price: 34990,
    category: "Dining Room",
    roomType: "Dining Room",
    description: "Elegant glass-front display cabinet. Dimensions: 36\"W x 16\"D x 72\"H. LED lighting, 4 glass shelves, wooden back panel. Perfect for china, glassware. Tempered safety glass.",
    color: "#000000",
    rating: 4.6,
    isNew: true
  },
  {
    id: "prod_125",
    title: "Bar Cart",
    imageUrl: "https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800&auto=format&fit=crop",
    price: 12990,
    category: "Dining Room",
    roomType: "Dining Room",
    description: "2-tier rolling bar cart with gold finish. Dimensions: 30\"W x 16\"D x 32\"H. Tempered glass shelves, locking wheels. Holds up to 50kg. Perfect for entertaining.",
    color: "#DAA520",
    rating: 4.4
  },
  {
    id: "prod_126",
    title: "Crystal Chandelier",
    imageUrl: "https://images.unsplash.com/photo-1565183997392-2f69f2e59f2d?w=800&auto=format&fit=crop",
    price: 56990,
    category: "Lighting",
    roomType: "Dining Room",
    description: "8-light crystal chandelier. Diameter: 28\", Height: 36\". Chrome finish, K9 crystal drops. Dimmable LED compatible. Adjustable chain. Professional installation recommended.",
    color: "#FFFFFF",
    rating: 4.9
  },
  {
    id: "prod_127",
    title: "L-Shape Office Desk",
    imageUrl: "https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=800&auto=format&fit=crop",
    price: 28990,
    category: "Home Office",
    roomType: "Office",
    description: "L-shaped corner desk with storage. Main: 60\"W, Return: 48\"W. 3 drawers, keyboard tray, cable management. Espresso finish. Scratch-resistant surface. Easy assembly.",
    color: "#2e2e2e",
    rating: 4.7,
    isNew: true
  },
  {
    id: "prod_128",
    title: "Ergonomic Office Chair",
    imageUrl: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800&auto=format&fit=crop",
    price: 24990,
    category: "Home Office",
    roomType: "Office",
    description: "Mesh back executive chair. Adjustable lumbar support, 3D armrests, seat depth. Height range: 18\"-22\". 360° swivel, smooth-rolling casters. Weight capacity: 135kg.",
    color: "#000000",
    rating: 4.8
  },
  {
    id: "prod_129",
    title: "Bookshelf 6-Tier",
    imageUrl: "https://images.unsplash.com/photo-1594526538404-8583be2e7b1f?w=800&auto=format&fit=crop",
    price: 16990,
    category: "Home Office",
    roomType: "Office",
    description: "Open bookshelf unit. Dimensions: 36\"W x 12\"D x 72\"H. 6 adjustable shelves, each holds 30kg. Engineered wood with oak veneer. Anti-tip kit included. Modern minimalist design.",
    color: "#8B4513",
    rating: 4.5
  },
  {
    id: "prod_130",
    title: "Filing Cabinet",
    imageUrl: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&auto=format&fit=crop",
    price: 14990,
    category: "Home Office",
    roomType: "Office",
    description: "3-drawer lateral filing cabinet. Dimensions: 36\"W x 18\"D x 40\"H. Full extension ball-bearing slides. Locking mechanism. Letter/legal size compatible. Steel construction.",
    color: "#808080",
    rating: 4.4
  },
  {
    id: "prod_131",
    title: "Monitor Stand with Storage",
    imageUrl: "https://images.unsplash.com/photo-1595814433015-e7b6e25a51ac?w=800&auto=format&fit=crop",
    price: 5990,
    category: "Home Office",
    roomType: "Office",
    description: "Bamboo monitor riser with drawer and organizer. Dimensions: 24\"W x 10\"D x 5\"H. Elevates screen to ergonomic height. Storage for pens, notepads. Eco-friendly material.",
    color: "#8B4513",
    rating: 4.6,
    isNew: true
  },
  {
    id: "prod_132",
    title: "Modular Kitchen Cabinets",
    imageUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop",
    price: 124990,
    category: "Kitchen",
    roomType: "Kitchen",
    description: "Complete modular kitchen package. 10 cabinets: 6 base + 4 wall. Soft-close hinges, stainless steel hardware. High-gloss acrylic finish. Granite countertop. Installation included.",
    color: "#FFFFFF",
    rating: 4.9
  },
  {
    id: "prod_133",
    title: "Kitchen Island with Seating",
    imageUrl: "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&auto=format&fit=crop",
    price: 48990,
    category: "Kitchen",
    roomType: "Kitchen",
    description: "Multi-functional island with breakfast bar. Dimensions: 60\"W x 36\"D x 36\"H. Quartz countertop, 3 drawers, wine rack, towel bar. Seats 3. Heavy-duty locking casters.",
    color: "#808080",
    rating: 4.7,
    isNew: true
  },
  {
    id: "prod_134",
    title: "Pantry Storage Unit",
    imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&auto=format&fit=crop",
    price: 22990,
    category: "Kitchen",
    roomType: "Kitchen",
    description: "Tall pantry cabinet with pull-out shelves. Dimensions: 24\"W x 20\"D x 84\"H. 5 adjustable shelves, 2 deep drawers. White shaker style. Soft-close doors. Assembly required.",
    color: "#FFFFFF",
    rating: 4.5
  },
  {
    id: "prod_135",
    title: "Range Hood",
    imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop",
    price: 18990,
    category: "Kitchen",
    roomType: "Kitchen",
    description: "Wall-mount range hood. 30\" width, 900 CFM. 3-speed touch control, LED lighting. Stainless steel, dishwasher-safe filters. Quiet operation (65dB max). Ducted/ductless modes.",
    color: "#C0C0C0",
    rating: 4.6
  },
  {
    id: "prod_136",
    title: "Kitchen Sink Double Bowl",
    imageUrl: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=800&auto=format&fit=crop",
    price: 12990,
    category: "Kitchen",
    roomType: "Kitchen",
    description: "Undermount double bowl sink. Dimensions: 33\"W x 22\"D x 10\"H. 18-gauge stainless steel, sound-dampening pads. Includes basket strainers, mounting clips. Easy-clean satin finish.",
    color: "#C0C0C0",
    rating: 4.7
  },
  {
    id: "prod_137",
    title: "Double Vanity Unit",
    imageUrl: "https://images.unsplash.com/photo-1620626011761-996317b8d101?w=800&auto=format&fit=crop",
    price: 54990,
    category: "Bathroom",
    roomType: "Bathroom",
    description: "72\" double vanity with marble top. 2 undermount sinks, 4 soft-close drawers, 2 cabinets. White shaker style, chrome hardware. Pre-drilled for 8\" faucet spread. Mirror optional.",
    color: "#FFFFFF",
    rating: 4.8,
    isNew: true
  },
  {
    id: "prod_138",
    title: "LED Bathroom Mirror",
    imageUrl: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&auto=format&fit=crop",
    price: 14990,
    category: "Bathroom",
    roomType: "Bathroom",
    description: "Backlit LED mirror with defogger. Dimensions: 48\"W x 36\"H. Touch sensor dimmer, 3 color temperatures. Energy-efficient LED (50,000 hrs). Anti-fog heating pad. Hardwired.",
    color: "#FFFFFF",
    rating: 4.7
  },
  {
    id: "prod_139",
    title: "Shower Enclosure",
    imageUrl: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&auto=format&fit=crop",
    price: 38990,
    category: "Bathroom",
    roomType: "Bathroom",
    description: "Frameless glass shower enclosure. 48\"W x 36\"D x 72\"H. 8mm tempered glass, brushed nickel hardware. Reversible door, magnetic seal. Easy-clean coating. Professional installation included.",
    color: "#C0C0C0",
    rating: 4.6
  },
  {
    id: "prod_140",
    title: "Freestanding Bathtub",
    imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop",
    price: 78990,
    category: "Bathroom",
    roomType: "Bathroom",
    description: "Acrylic soaking tub with overflow. Dimensions: 67\"L x 31\"W x 24\"H. 70-gallon capacity. Reinforced fiberglass, high-gloss finish. Center drain. Faucet sold separately.",
    color: "#FFFFFF",
    rating: 4.9
  },
  {
    id: "prod_141",
    title: "Bathroom Storage Tower",
    imageUrl: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&auto=format&fit=crop",
    price: 8990,
    category: "Bathroom",
    roomType: "Bathroom",
    description: "Slim storage cabinet. Dimensions: 12\"W x 12\"D x 60\"H. 3 shelves + 1 drawer. Water-resistant finish, adjustable feet. Perfect for narrow spaces. Easy assembly.",
    color: "#FFFFFF",
    rating: 4.4
  },
];
export const demoProductsAll: DemoProduct[] = [...demoProducts, ...extraDemoProducts];
