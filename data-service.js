(() => {
  const DEFAULT_PRODUCTS = [{"id": "ena-whey", "name": "True Made Whey Protein", "brand": "ENA", "category": "Proteínas", "detail": "2 lb · Varios sabores", "price": 84990, "stock": 8, "featured": true, "active": true, "tag": "Destacado", "image": "", "gallery": [], "flavors": ["Chocolate", "Vainilla", "Frutilla"], "presentation": "2 lb", "description": "Proteína de suero pensada para complementar la ingesta diaria de proteínas y acompañar procesos de recuperación y desarrollo muscular.", "ingredients": "Concentrado de proteína de suero, saborizantes y edulcorantes. Información demostrativa.", "nutrition": "La información nutricional definitiva se cargará cuando se confirme el producto y proveedor."}, {"id": "star-whey", "name": "Platinum Whey Protein", "brand": "Star Nutrition", "category": "Proteínas", "detail": "2 lb · Varios sabores", "price": 79990, "stock": 6, "featured": true, "active": true, "tag": "Más vendido", "image": "", "gallery": [], "flavors": ["Chocolate", "Vainilla", "Cookies"], "presentation": "2 lb", "description": "Suplemento proteico para acompañar entrenamientos de fuerza, hipertrofia y recuperación.", "ingredients": "Proteína de suero, aromatizantes y edulcorantes. Información demostrativa.", "nutrition": "Información nutricional pendiente de carga definitiva."}, {"id": "gold-whey", "name": "Whey Protein", "brand": "Gold Nutrition", "category": "Proteínas", "detail": "2 lb · Varios sabores", "price": 74990, "stock": 5, "featured": true, "active": true, "tag": "", "image": "", "gallery": [], "flavors": ["Chocolate", "Vainilla"], "presentation": "2 lb", "description": "Proteína de suero para complementar la alimentación diaria.", "ingredients": "Información demostrativa pendiente de proveedor.", "nutrition": "Información nutricional pendiente de carga definitiva."}, {"id": "ena-creatine", "name": "Creatina Monohidratada", "brand": "ENA", "category": "Creatinas", "detail": "300 g · Sin sabor", "price": 34990, "stock": 10, "featured": true, "active": true, "tag": "Destacado", "image": "", "gallery": [], "flavors": ["Sin sabor"], "presentation": "300 g", "description": "Creatina monohidratada para acompañar el rendimiento en esfuerzos breves y de alta intensidad.", "ingredients": "Creatina monohidratada.", "nutrition": "Información nutricional pendiente de carga definitiva."}, {"id": "star-creatine", "name": "Creatine Monohydrate", "brand": "Star Nutrition", "category": "Creatinas", "detail": "300 g · Sin sabor", "price": 32990, "stock": 9, "featured": true, "active": true, "tag": "", "image": "", "gallery": [], "flavors": ["Sin sabor"], "presentation": "300 g", "description": "Creatina monohidratada en polvo para uso deportivo.", "ingredients": "Creatina monohidratada.", "nutrition": "Información nutricional pendiente de carga definitiva."}, {"id": "gold-creatine", "name": "Gold Creatine", "brand": "Gold Nutrition", "category": "Creatinas", "detail": "300 g · Sin sabor", "price": 30990, "stock": 7, "featured": true, "active": true, "tag": "", "image": "", "gallery": [], "flavors": ["Sin sabor"], "presentation": "300 g", "description": "Creatina monohidratada para complementar entrenamientos de fuerza y potencia.", "ingredients": "Creatina monohidratada.", "nutrition": "Información nutricional pendiente de carga definitiva."}, {"id": "ena-prewar", "name": "Pre War", "brand": "ENA", "category": "Pre-entrenos", "detail": "30 servicios · Varios sabores", "price": 29990, "stock": 4, "featured": true, "active": true, "tag": "", "image": "", "gallery": [], "flavors": ["Frutos rojos", "Limón"], "presentation": "30 servicios", "description": "Pre-entreno formulado para acompañar energía, concentración y rendimiento.", "ingredients": "Ingredientes pendientes de confirmación con el proveedor.", "nutrition": "Información nutricional pendiente de carga definitiva."}, {"id": "star-pump", "name": "Pump V8", "brand": "Star Nutrition", "category": "Pre-entrenos", "detail": "30 servicios · Varios sabores", "price": 31990, "stock": 3, "featured": true, "active": true, "tag": "", "image": "", "gallery": [], "flavors": ["Blue raspberry", "Frutos rojos"], "presentation": "30 servicios", "description": "Pre-entreno para acompañar sesiones intensas.", "ingredients": "Ingredientes pendientes de confirmación con el proveedor.", "nutrition": "Información nutricional pendiente de carga definitiva."}];
  const DEFAULT_SETTINGS = {"storeName": "ATP Suplementos", "whatsapp": "5493518136003", "instagram": "_atpsuplementos", "location": "Córdoba, Argentina", "heroTitle": "Potenciá tu rendimiento.", "heroText": "Las principales marcas de suplementación, con atención directa desde Córdoba."};
  const client = null;

  const local = {
    products: () => JSON.parse(localStorage.getItem("atp_products") || "null") || structuredClone(DEFAULT_PRODUCTS),
    settings: () => JSON.parse(localStorage.getItem("atp_settings") || "null") || structuredClone(DEFAULT_SETTINGS),
    saveProducts: value => localStorage.setItem("atp_products", JSON.stringify(value)),
    saveSettings: value => localStorage.setItem("atp_settings", JSON.stringify(value))
  };

  const normalizeProduct = p => ({
    id: String(p.id),
    name: p.name || "",
    brand: p.brand || "",
    category: p.category || "",
    detail: p.detail || "",
    price: Number(p.price || 0),
    stock: Number(p.stock || 0),
    featured: p.featured !== false,
    active: p.active !== false,
    tag: p.tag || "",
    image: p.image || "",
    gallery: Array.isArray(p.gallery) ? p.gallery : [],
    flavors: Array.isArray(p.flavors) ? p.flavors : [],
    presentation: p.presentation || "",
    description: p.description || "",
    ingredients: p.ingredients || "",
    nutrition: p.nutrition || ""
  });

  async function getProducts({ includeInactive = false } = {}) {
    const list = local.products().map(normalizeProduct);
    return includeInactive ? list : list.filter(p => p.active);
  }

  async function getSettings() {
    return local.settings();
  }

  async function signIn(email, password) {
    if (email === "admin@atpsuplementos.local" && password === "atp2026") {
      sessionStorage.setItem("atp_admin", "1");
      return { user: { email } };
    }
    throw new Error("Datos incorrectos.");
  }

  async function signOut() {
    sessionStorage.removeItem("atp_admin");
  }

  async function getSession() {
    return sessionStorage.getItem("atp_admin") === "1" ? { user: { email: "admin@atpsuplementos.local" } } : null;
  }

  async function saveProduct(product) {
    const clean = normalizeProduct(product);
    const list = local.products().map(normalizeProduct);
    const exists = list.some(p => p.id === clean.id);
    local.saveProducts(exists ? list.map(p => p.id === clean.id ? clean : p) : [clean, ...list]);
    return clean;
  }

  async function deleteProduct(id) {
    local.saveProducts(local.products().filter(p => String(p.id) !== String(id)));
  }

  async function saveSettings(value) {
    local.saveSettings(value);
    return value;
  }

  async function uploadProductImage(file, productId) {
    if (!file) return "";
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  async function createOrder({ items, customer = {}, total = 0, channel = "whatsapp" }) {
    return { id: `local-${Date.now()}` };
  }

  window.ATPData = {
    mode: "local",
    client,
    getProducts,
    getSettings,
    signIn,
    signOut,
    getSession,
    saveProduct,
    deleteProduct,
    saveSettings,
    uploadProductImage,
    createOrder
  };
})();
