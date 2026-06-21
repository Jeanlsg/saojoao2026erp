export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  promoPrice?: number | null;
  showInOffers?: boolean;
  image: string;
  categoryId: string;
  description?: string;
  unit?: string;
  stock: number;
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
  wholesaleActive?: boolean;
}

export interface FreightRange {
  id: string;
  minKm: number;
  maxKm: number;
  price: number;
}

export interface Combo {
  id: string;
  name: string;
  description: string;
  discountPercent: number;
  image: string;
  productIds: string[];
}

export const categories: Category[] = [
  { id: "mercearia", name: "Mercearia", icon: "🛒" },
  { id: "bebidas", name: "Bebidas", icon: "🥤" },
  { id: "hortifruti", name: "Hortifruti", icon: "🍎" },
  { id: "padaria", name: "Padaria", icon: "🍞" },
  { id: "frios", name: "Frios", icon: "🧀" },
  { id: "limpeza", name: "Limpeza", icon: "🧹" },
  { id: "higiene", name: "Higiene", icon: "🧴" },
];

export const products: Product[] = [
  // Mercearia
  { id: "p1", name: "Arroz Tipo 1 - 5kg", price: 22.90, image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&h=300&fit=crop", categoryId: "mercearia", unit: "pct", stock: 50 },
  { id: "p2", name: "Feijão Carioca - 1kg", price: 8.49, image: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=300&h=300&fit=crop", categoryId: "mercearia", unit: "pct", stock: 40 },
  { id: "p3", name: "Açúcar Cristal - 1kg", price: 4.99, image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300&h=300&fit=crop", categoryId: "mercearia", unit: "pct", stock: 60 },
  { id: "p4", name: "Óleo de Soja - 900ml", price: 7.29, image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&h=300&fit=crop", categoryId: "mercearia", unit: "un", stock: 30 },
  { id: "p5", name: "Macarrão Espaguete - 500g", price: 3.99, image: "https://images.unsplash.com/photo-1551462147-37885acc36f1?w=300&h=300&fit=crop", categoryId: "mercearia", unit: "pct", stock: 45 },
  { id: "p6", name: "Café Torrado e Moído - 500g", price: 15.90, image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300&h=300&fit=crop", categoryId: "mercearia", unit: "pct", stock: 25 },

  { id: "p7", name: "Refrigerante Cola - 2L", price: 8.99, image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&h=300&fit=crop", categoryId: "bebidas", unit: "un", stock: 80 },
  { id: "p8", name: "Suco de Laranja - 1L", price: 6.49, image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=300&h=300&fit=crop", categoryId: "bebidas", unit: "un", stock: 35 },
  { id: "p9", name: "Água Mineral - 1.5L", price: 2.49, image: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&h=300&fit=crop", categoryId: "bebidas", unit: "un", stock: 100 },
  { id: "p10", name: "Cerveja Lata - 350ml", price: 3.99, image: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=300&h=300&fit=crop", categoryId: "bebidas", unit: "un", stock: 120 },

  { id: "p11", name: "Banana Prata - kg", price: 5.99, image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300&h=300&fit=crop", categoryId: "hortifruti", unit: "kg", stock: 20 },
  { id: "p12", name: "Tomate Italiano - kg", price: 7.99, image: "https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=300&h=300&fit=crop", categoryId: "hortifruti", unit: "kg", stock: 15 },
  { id: "p13", name: "Cebola - kg", price: 4.49, image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=300&h=300&fit=crop", categoryId: "hortifruti", unit: "kg", stock: 25 },
  { id: "p14", name: "Alface Crespa", price: 2.99, image: "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=300&h=300&fit=crop", categoryId: "hortifruti", unit: "un", stock: 10 },
  { id: "p15", name: "Maçã Fuji - kg", price: 9.90, image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&h=300&fit=crop", categoryId: "hortifruti", unit: "kg", stock: 18 },

  { id: "p16", name: "Pão Francês - kg", price: 12.90, image: "https://images.unsplash.com/photo-1549931319-a545753467c8?w=300&h=300&fit=crop", categoryId: "padaria", unit: "kg", stock: 30 },
  { id: "p17", name: "Pão de Forma - 500g", price: 7.49, image: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=300&h=300&fit=crop", categoryId: "padaria", unit: "un", stock: 20 },
  { id: "p18", name: "Bolo de Chocolate", price: 18.90, image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=300&fit=crop", categoryId: "padaria", unit: "un", stock: 5 },

  { id: "p19", name: "Presunto Fatiado - 200g", price: 8.99, image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=300&fit=crop", categoryId: "frios", unit: "pct", stock: 15 },
  { id: "p20", name: "Queijo Mussarela - 200g", price: 10.90, image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=300&h=300&fit=crop", categoryId: "frios", unit: "pct", stock: 15 },
  { id: "p21", name: "Iogurte Natural - 170g", price: 3.49, image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&h=300&fit=crop", categoryId: "frios", unit: "un", stock: 25 },

  { id: "p22", name: "Detergente Líquido - 500ml", price: 2.49, image: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=300&h=300&fit=crop", categoryId: "limpeza", unit: "un", stock: 40 },
  { id: "p23", name: "Água Sanitária - 1L", price: 3.99, image: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&h=300&fit=crop", categoryId: "limpeza", unit: "un", stock: 30 },
  { id: "p24", name: "Sabão em Pó - 1kg", price: 11.90, image: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=300&h=300&fit=crop", categoryId: "limpeza", unit: "un", stock: 20 },

  { id: "p25", name: "Papel Higiênico - 12 rolos", price: 15.90, image: "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=300&h=300&fit=crop", categoryId: "higiene", unit: "pct", stock: 35 },
  { id: "p26", name: "Sabonete - 90g", price: 1.99, image: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=300&h=300&fit=crop", categoryId: "higiene", unit: "un", stock: 50 },
  { id: "p27", name: "Creme Dental - 90g", price: 4.49, image: "https://images.unsplash.com/photo-1559304822-9eb2813c9844?w=300&h=300&fit=crop", categoryId: "higiene", unit: "un", stock: 40 },
];

export const combos: Combo[] = [
  {
    id: "c1",
    name: "Kit Básico do Mês",
    description: "Arroz 5kg + Feijão 1kg + Óleo 900ml + Açúcar 1kg",
    discountPercent: 15,
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=250&fit=crop",
    productIds: ["p1", "p2", "p4", "p3"],
  },
  {
    id: "c2",
    name: "Combo Café da Manhã",
    description: "Pão de Forma + Presunto + Queijo + Café 500g",
    discountPercent: 17,
    image: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=400&h=250&fit=crop",
    productIds: ["p17", "p19", "p20", "p6"],
  },
  {
    id: "c3",
    name: "Combo Churrasco",
    description: "Cerveja 6un + Refrigerante 2L + Cebola kg",
    discountPercent: 14,
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=250&fit=crop",
    productIds: ["p10", "p7", "p13"],
  },
];
