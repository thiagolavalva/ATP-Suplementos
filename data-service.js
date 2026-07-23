(() => {
  const cfg = window.ATP_CONFIG || {};
  const configured =
    typeof cfg.supabaseUrl === "string" &&
    cfg.supabaseUrl.startsWith("https://") &&
    !cfg.supabaseUrl.includes("PEGAR_") &&
    typeof cfg.supabaseKey === "string" &&
    cfg.supabaseKey.length > 20 &&
    !cfg.supabaseKey.includes("PEGAR_");

  if (!configured) {
    const error = new Error("Falta configurar Supabase en config.js.");
    const reject = async () => { throw error; };
    window.ATPData = {
      mode: "sin-configurar",
      client: null,
      getProducts: reject,
      getSettings: reject,
      signIn: reject,
      signOut: async () => {},
      getSession: async () => null,
      saveProduct: reject,
      deleteProduct: reject,
      saveSettings: reject,
      uploadProductImage: reject,
      createOrder: async () => ({ id: null }),
      getOrders: async () => [],
      updateOrder: reject
    };
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    throw new Error("No se pudo cargar Supabase.");
  }

  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

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
    let query = client.from("atp_products").select("*").order("created_at", { ascending: false });
    if (!includeInactive) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(normalizeProduct);
  }

  async function getSettings() {
    const { data, error } = await client
      .from("atp_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return data || {};
  }

  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error("Correo o contraseña incorrectos.");
    return data;
  }

  async function signOut() {
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  async function getSession() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function saveProduct(product) {
    const clean = normalizeProduct(product);
    const payload = {
      ...clean,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await client
      .from("atp_products")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return normalizeProduct(data);
  }

  async function deleteProduct(id) {
    const { error } = await client.from("atp_products").delete().eq("id", String(id));
    if (error) throw error;
  }

  async function saveSettings(value) {
    const payload = {
      id: 1,
      storeName: value.storeName || "ATP Suplementos",
      whatsapp: value.whatsapp || "5493518136003",
      instagram: value.instagram || "_atpsuplementos",
      location: value.location || "Córdoba, Argentina",
      heroTitle: value.heroTitle || "Potenciá tu rendimiento.",
      heroText: value.heroText || "Las principales marcas de suplementación, con atención directa desde Córdoba.",
      updated_at: new Date().toISOString()
    };
    const { data, error } = await client
      .from("atp_settings")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  function safeFileName(name) {
    return String(name || "imagen")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-");
  }

  async function uploadProductImage(file, productId) {
    if (!file) return "";
    if (!file.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen.");
    if (file.size > 5 * 1024 * 1024) throw new Error("La imagen no puede superar 5 MB.");
    const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${safeFileName(productId)}/${Date.now()}-${safeFileName(file.name || `producto.${extension}`)}`;
    const { error } = await client.storage
      .from("atp-product-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data } = client.storage.from("atp-product-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function createOrder({ items, customer = {}, subtotal = 0, discount = 0, total = 0, coupon = "", delivery_method = "retiro", channel = "whatsapp", status = "nuevo" }) {
    const { data, error } = await client
      .from("atp_orders")
      .insert({items, customer, subtotal:Number(subtotal||0), discount:Number(discount||0), total:Number(total||0), coupon, delivery_method, channel, status, payment_status:"pending"})
      .select("id")
      .single();
    if (error) {
      console.warn("No se pudo registrar el pedido:", error.message);
      return { id: null };
    }
    return data;
  }

  window.ATPData = {
    mode: "supabase",
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
    createOrder,
    async getOrders(){const {data,error}=await client.from("atp_orders").select("*").order("created_at",{ascending:false});if(error)throw error;return data||[]},
    async updateOrder(id,changes){const {data,error}=await client.from("atp_orders").update({...changes,updated_at:new Date().toISOString()}).eq("id",id).select().single();if(error)throw error;return data}
  };
})();
