'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Coffee, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  ShieldCheck, 
  Upload, 
  Settings, 
  X, 
  Check, 
  Copy, 
  RefreshCw, 
  Send, 
  DollarSign, 
  User,
  AlertCircle,
  Eye,
  LogOut,
  Sparkles,
  ChevronRight,
  Edit2
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface OrderItem {
  id: number;
  order_id: number;
  product_name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: number;
  student_name: string;
  created_at: string;
  status: string;
  items: OrderItem[];
  total: number;
}

interface ConsolidatedItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export default function Home() {
  // App states
  const [products, setProducts] = useState<Product[]>([]);
  const [pixKey, setPixKey] = useState('lasse@ufpa.br');
  const [vitrineImageUrl, setVitrineImageUrl] = useState('');
  
  // Cart state
  const [cart, setCart] = useState<Record<number, CartItem>>({});
  const [studentName, setStudentName] = useState('');
  
  // UI states
  const [activeTab, setActiveTab] = useState<'order' | 'admin'>('order');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedConsolidated, setCopiedConsolidated] = useState(false);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  
  // Order submission state
  const [orderSubmitted, setOrderSubmitted] = useState<boolean>(false);
  const [lastSubmittedTotal, setLastSubmittedTotal] = useState<number>(0);
  const [lastSubmittedItems, setLastSubmittedItems] = useState<CartItem[]>([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Admin states
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'orders' | 'products' | 'settings'>('orders');
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [consolidatedOrders, setConsolidatedOrders] = useState<ConsolidatedItem[]>([]);
  const [isLoadingAdminData, setIsLoadingAdminData] = useState(false);
  
  // Product CRUD states
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Settings states
  const [settingsPixKey, setSettingsPixKey] = useState('');
  const [settingsAdminPin, setSettingsAdminPin] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // Image Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);



  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Erro ao buscar produtos:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings) {
        if (data.settings.pix_key) {
          setPixKey(data.settings.pix_key);
          setSettingsPixKey(data.settings.pix_key);
        }
        if (data.settings.vitrine_image_url) {
          setVitrineImageUrl(data.settings.vitrine_image_url);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar configurações:', err);
    }
  };

  const verifySavedAdmin = async (pin: string) => {
    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
        cache: 'no-store'
      });
      if (res.ok) {
        setIsAdminAuthenticated(true);
      } else {
        localStorage.removeItem('lasse_admin_pin');
      }
    } catch (err) {
      localStorage.removeItem('lasse_admin_pin');
    }
  };

  // Load products and settings on mount
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchProducts();
      await fetchSettings();
      
      // Auto login check from localStorage
      const savedPin = localStorage.getItem('lasse_admin_pin');
      if (savedPin) {
        await verifySavedAdmin(savedPin);
      }
    };
    loadInitialData();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPinInput.trim() }),
        cache: 'no-store'
      });

      if (res.ok) {
        setIsAdminAuthenticated(true);
        localStorage.setItem('lasse_admin_pin', adminPinInput.trim());
        setIsAdminModalOpen(false);
        setAdminPinInput('');
        showNotification('Login administrativo realizado com sucesso!');
        setActiveTab('admin');
        fetchAdminData();
      } else {
        showNotification('Código PIN inválido', 'error');
      }
    } catch (err) {
      showNotification('Erro ao autenticar', 'error');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('lasse_admin_pin');
    setActiveTab('order');
    showNotification('Sessão administrativa encerrada.');
  };

  const fetchAdminData = async () => {
    const pin = localStorage.getItem('lasse_admin_pin');
    if (!pin) return;

    setIsLoadingAdminData(true);
    try {
      const res = await fetch('/api/orders', {
        headers: { 'x-admin-pin': pin }
      });
      const data = await res.json();
      if (res.ok) {
        setAdminOrders(data.orders || []);
        setConsolidatedOrders(data.consolidated || []);
      } else {
        showNotification(data.error || 'Erro ao carregar dados admin', 'error');
      }
    } catch (err) {
      showNotification('Erro de rede ao carregar dados admin', 'error');
    } finally {
      setIsLoadingAdminData(false);
    }
  };

  // Trigger admin data load when auth success or switching tabs
  useEffect(() => {
    if (isAdminAuthenticated && activeTab === 'admin') {
      fetchAdminData();
    }
  }, [isAdminAuthenticated, activeTab]);

  // Cart operations
  const updateCartQuantity = (product: Product, quantity: number) => {
    setCart(prev => {
      const updated = { ...prev };
      if (quantity <= 0) {
        delete updated[product.id];
      } else {
        updated[product.id] = { product, quantity };
      }
      return updated;
    });
  };

  const getCartTotal = () => {
    return Object.values(cart).reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const getCartItemsCount = () => {
    return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleSendOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      showNotification('Por favor, informe seu nome para o pedido', 'error');
      return;
    }

    const itemsArray = Object.values(cart).map(item => ({
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity
    }));

    if (itemsArray.length === 0) {
      showNotification('Seu carrinho está vazio', 'error');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: studentName,
          items: itemsArray
        })
      });

      const data = await res.json();
      if (res.ok) {
        setLastSubmittedTotal(getCartTotal());
        setLastSubmittedItems(Object.values(cart));
        setCart({});
        setOrderSubmitted(true);
        setIsCartOpen(false);
        showNotification('Pedido enviado com sucesso!');
      } else {
        showNotification(data.error || 'Erro ao enviar pedido', 'error');
      }
    } catch (err) {
      showNotification('Erro de rede ao enviar pedido', 'error');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Product edit helpers
  const handleStartEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProductName(product.name);
    setNewProductPrice(product.price.toString().replace('.', ','));
  };

  const handleCancelEditProduct = () => {
    setEditingProduct(null);
    setNewProductName('');
    setNewProductPrice('');
  };

  // Product addition or editing
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = localStorage.getItem('lasse_admin_pin');
    if (!pin) return;

    const price = parseFloat(newProductPrice.replace(',', '.'));
    if (!newProductName.trim() || isNaN(price) || price <= 0) {
      showNotification('Preencha os campos com valores válidos', 'error');
      return;
    }

    setIsAddingProduct(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-pin': pin
        },
        body: JSON.stringify({
          id: editingProduct?.id,
          name: newProductName.trim(),
          price
        })
      });

      const data = await res.json();
      if (res.ok) {
        showNotification(
          editingProduct 
            ? `Produto "${newProductName}" atualizado!` 
            : `Produto "${newProductName}" cadastrado!`
        );
        setNewProductName('');
        setNewProductPrice('');
        setEditingProduct(null);
        fetchProducts();
      } else {
        showNotification(data.error || 'Erro ao salvar produto', 'error');
      }
    } catch (err) {
      showNotification('Erro de rede ao salvar produto', 'error');
    } finally {
      setIsAddingProduct(false);
    }
  };

  // Product delete
  const handleDeleteProduct = async (productId: number) => {
    const pin = localStorage.getItem('lasse_admin_pin');
    if (!pin) return;

    if (!confirm('Deseja realmente remover este produto?')) return;

    try {
      const res = await fetch(`/api/products?id=${productId}`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': pin }
      });

      const data = await res.json();
      if (res.ok) {
        showNotification('Produto removido.');
        fetchProducts();
      } else {
        showNotification(data.error || 'Erro ao remover produto', 'error');
      }
    } catch (err) {
      showNotification('Erro de rede ao remover produto', 'error');
    }
  };

  // Config save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = localStorage.getItem('lasse_admin_pin');
    if (!pin) return;

    setIsSavingSettings(true);
    try {
      const updates: Record<string, string> = {
        pix_key: settingsPixKey
      };
      
      if (settingsAdminPin.trim()) {
        updates.admin_pin = settingsAdminPin.trim();
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-pin': pin
        },
        body: JSON.stringify(updates)
      });

      const data = await res.json();
      if (res.ok) {
        showNotification('Configurações atualizadas!');
        if (settingsAdminPin.trim()) {
          // If admin pin was updated, update local storage pin to maintain session
          localStorage.setItem('lasse_admin_pin', settingsAdminPin.trim());
          setSettingsAdminPin('');
        }
        fetchSettings();
      } else {
        showNotification(data.error || 'Erro ao salvar configurações', 'error');
      }
    } catch (err) {
      showNotification('Erro de rede ao salvar configurações', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Showcase image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadImage = async () => {
    const pin = localStorage.getItem('lasse_admin_pin');
    if (!pin || !uploadFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-admin-pin': pin },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        showNotification('Foto da vitrine atualizada com sucesso!');
        setVitrineImageUrl(data.imageUrl);
        setUploadFile(null);
        setUploadPreview('');
      } else {
        showNotification(data.error || 'Erro ao enviar imagem', 'error');
      }
    } catch (err) {
      showNotification('Erro de rede ao enviar imagem', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Archive active orders
  const handleClearOrders = async () => {
    const pin = localStorage.getItem('lasse_admin_pin');
    if (!pin) return;

    if (!confirm('Tem certeza que deseja zerar a rodada de pedidos? Isso irá limpar a lista de pedidos ativos para iniciar uma nova rodada.')) {
      return;
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'DELETE',
        headers: { 'x-admin-pin': pin }
      });

      const data = await res.json();
      if (res.ok) {
        showNotification('Lista de pedidos zerada! Uma nova rodada foi iniciada.');
        fetchAdminData();
      } else {
        showNotification(data.error || 'Erro ao zerar pedidos', 'error');
      }
    } catch (err) {
      showNotification('Erro de rede ao zerar pedidos', 'error');
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, type: 'pix' | 'consolidated') => {
    navigator.clipboard.writeText(text);
    if (type === 'pix') {
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    } else {
      setCopiedConsolidated(true);
      setTimeout(() => setCopiedConsolidated(false), 2000);
    }
    showNotification('Copiado para a área de transferência!');
  };

  // Generate WhatsApp / Bakery text copy
  const getConsolidatedText = () => {
    if (consolidatedOrders.length === 0) return '';
    let text = `*📋 PEDIDO CONSOLIDADO - LASSE FOOD*\n\n`;
    consolidatedOrders.forEach(item => {
      text += `• *${item.quantity}x* ${item.name} (R$ ${item.price.toFixed(2)} cada)\n`;
    });
    const total = consolidatedOrders.reduce((sum, item) => sum + item.total, 0);
    text += `\n💵 *Valor Total: R$ ${total.toFixed(2)}*\n`;
    text += `⏱️ Gerado em: ${new Date().toLocaleTimeString('pt-BR')}`;
    return text;
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Dynamic Notification Popup */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3.5 rounded-xl backdrop-blur-md border shadow-2xl transition-all duration-300 transform animate-in slide-in-from-top ${
          notification.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300 shadow-emerald-500/10' 
            : 'bg-rose-950/80 border-rose-800 text-rose-300 shadow-rose-500/10'
        }`}>
          {notification.type === 'success' ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/80 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            onClick={() => { setActiveTab('order'); setOrderSubmitted(false); }} 
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/10 group-hover:scale-105 transition-transform duration-300">
              <Coffee className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-amber-500 bg-clip-text text-transparent flex items-center gap-1.5">
                LASSE <span className="text-amber-500">Food</span>
              </h1>
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider">LABORATORY OF APPLIED COMPUTATION</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'order' && !orderSubmitted && (
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-amber-500 hover:border-amber-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <ShoppingBag className="w-5.5 h-5.5" />
                {getCartItemsCount() > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-zinc-950 text-[11px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                    {getCartItemsCount()}
                  </span>
                )}
              </button>
            )}

            {isAdminAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab(activeTab === 'admin' ? 'order' : 'admin')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 flex items-center gap-1.5 ${
                    activeTab === 'admin' 
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' 
                      : 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-500 hover:from-amber-500/20 hover:to-orange-500/20'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  {activeTab === 'admin' ? 'Ver Vitrine' : 'Painel Admin'}
                </button>
                <button
                  onClick={handleAdminLogout}
                  title="Sair do modo administrador"
                  className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-950 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all duration-200 hover:scale-105"
                title="Administração"
              >
                <Settings className="w-5.5 h-5.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-8">
        
        {/* TAB 1: User / Customer Ordering Interface */}
        {activeTab === 'order' && (
          <div>
            {orderSubmitted ? (
              /* Success screen */
              <div className="max-w-2xl mx-auto py-12 px-6 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl backdrop-blur-md shadow-xl text-center flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-zinc-950 mb-6 shadow-lg shadow-emerald-500/20">
                  <Check className="w-10 h-10 stroke-[3]" />
                </div>
                
                <h2 className="text-3xl font-extrabold text-zinc-50 mb-2">Pedido Enviado! 🚀</h2>
                <p className="text-zinc-400 text-sm max-w-md mb-8">
                  Seu pedido foi registrado no sistema. Agora, faça o pagamento para o consolidar.
                </p>

                {/* Receipt Card */}
                <div className="w-full bg-[#0d0d11] border border-zinc-800/80 rounded-2xl p-6 text-left mb-8 max-w-md">
                  <span className="text-[10px] text-zinc-500 font-mono block mb-3 uppercase tracking-widest border-b border-zinc-800/60 pb-2">DETALHES DO SEU PEDIDO</span>
                  <div className="space-y-2 mb-4">
                    {lastSubmittedItems.map(item => (
                      <div key={item.product.id} className="flex justify-between text-sm">
                        <span className="text-zinc-300">
                          <strong className="text-amber-500">{item.quantity}x</strong> {item.product.name}
                        </span>
                        <span className="text-zinc-400 font-mono">
                          R$ {(item.product.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-zinc-850 pt-3 flex justify-between items-center">
                    <span className="text-sm font-semibold text-zinc-400">Total a pagar</span>
                    <span className="text-xl font-bold text-amber-500 font-mono">R$ {lastSubmittedTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* PIX Key Section */}
                <div className="w-full max-w-md bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20 rounded-2xl p-6 mb-8 flex flex-col items-center">
                  <div className="flex items-center gap-1 text-amber-500 text-xs font-bold uppercase tracking-widest mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    Pagamento via PIX (Confiança)
                  </div>
                  <p className="text-xs text-zinc-400 text-center mb-4 leading-relaxed">
                    Copie a chave PIX abaixo, faça a transferência do valor total e avise o aluno que está na padaria.
                  </p>
                  
                  <div className="w-full flex items-center justify-between bg-black/60 border border-zinc-800 rounded-xl py-3 px-4 font-mono text-sm text-zinc-300 select-all overflow-hidden text-ellipsis mb-2">
                    <span className="truncate">{pixKey}</span>
                    <button 
                      onClick={() => copyToClipboard(pixKey, 'pix')}
                      className="ml-2 text-zinc-400 hover:text-amber-500 transition-colors p-1"
                    >
                      {copiedPix ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-sans italic">Não precisa anexar comprovante (sistema baseado na confiança)</span>
                </div>

                <button
                  onClick={() => setOrderSubmitted(false)}
                  className="px-6 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-zinc-50 font-semibold transition-all duration-200 text-sm"
                >
                  Fazer outro Pedido
                </button>
              </div>
            ) : (
              /* Menu & Showcase screen */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Vitrine / Showcase Panel */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                        <h2 className="text-lg font-bold text-zinc-100">Vitrine da Padaria</h2>
                      </div>
                      <span className="text-xs text-zinc-500">Última atualização da foto</span>
                    </div>

                    {vitrineImageUrl ? (
                      <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-black/80 border border-zinc-800 flex items-center justify-center">
                        <img 
                          src={vitrineImageUrl} 
                          alt="Vitrine da padaria tirada pelo aluno" 
                          className="w-full h-full object-contain max-h-[500px]"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] rounded-2xl bg-zinc-950 border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center p-8">
                        <Coffee className="w-12 h-12 text-zinc-600 mb-3 stroke-[1.5]" />
                        <h3 className="font-semibold text-zinc-400 mb-1">Sem foto da vitrine</h3>
                        <p className="text-xs text-zinc-600 max-w-xs">
                          O administrador ainda não publicou uma foto da vitrine para esta rodada. Verifique os produtos abaixo.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Products Showcase */}
                  <div>
                    <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
                      Opções de Cardápio
                    </h3>

                    {products.length === 0 ? (
                      <div className="bg-zinc-900/20 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
                        <p className="text-sm text-zinc-500 mb-2">Nenhum produto cadastrado até o momento.</p>
                        <p className="text-xs text-zinc-600">Peça para o administrador cadastrar os produtos da padaria.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {products.map(product => {
                          const quantity = cart[product.id]?.quantity || 0;
                          return (
                            <div 
                              key={product.id}
                              className={`p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                                quantity > 0 
                                  ? 'bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/5' 
                                  : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700/80 hover:bg-zinc-900/60'
                              }`}
                            >
                              <div className="pr-4">
                                <h4 className="font-semibold text-zinc-200 text-base">{product.name}</h4>
                                <span className="text-sm font-bold text-amber-500 font-mono block mt-1">
                                  R$ {product.price.toFixed(2)}
                                </span>
                              </div>

                              {/* Quantity controls */}
                              <div className="flex items-center gap-2">
                                {quantity > 0 ? (
                                  <>
                                    <button
                                      onClick={() => updateCartQuantity(product, quantity - 1)}
                                      className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 hover:text-zinc-50 transition-colors active:scale-90"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-6 text-center font-bold text-base text-zinc-200 font-mono">
                                      {quantity}
                                    </span>
                                    <button
                                      onClick={() => updateCartQuantity(product, quantity + 1)}
                                      className="w-9 h-9 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center hover:bg-amber-400 font-bold transition-colors active:scale-90"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => updateCartQuantity(product, 1)}
                                    className="px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-semibold text-zinc-300 hover:text-amber-500 hover:border-amber-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
                                  >
                                    Adicionar
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar Cart panel (Large Screens) */}
                <div className="hidden lg:block">
                  <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 backdrop-blur-md sticky top-28 shadow-xl">
                    <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-amber-500" />
                      Seu Carrinho
                    </h3>
                    
                    <CartForm 
                      cart={cart}
                      studentName={studentName}
                      setStudentName={setStudentName}
                      updateCartQuantity={updateCartQuantity}
                      getCartTotal={getCartTotal}
                      handleSendOrder={handleSendOrder}
                      isSubmittingOrder={isSubmittingOrder}
                    />
                  </div>
                </div>

                {/* Cart FAB & Drawer (Mobile Screens) */}
                <div className="lg:hidden">
                  {getCartItemsCount() > 0 && (
                    <button
                      onClick={() => setIsCartOpen(true)}
                      className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-amber-500 to-orange-600 text-zinc-950 py-3.5 px-5 rounded-2xl flex items-center gap-2.5 font-bold shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition-transform animate-bounce"
                    >
                      <ShoppingBag className="w-5 h-5" />
                      Ver Carrinho ({getCartItemsCount()})
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}

                  {/* Drawer overlay */}
                  {isCartOpen && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
                      <div className="w-full max-w-md bg-[#0c0c0e] h-full p-6 border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
                          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-amber-500" />
                            Seu Carrinho ({getCartItemsCount()})
                          </h3>
                          <button 
                            onClick={() => setIsCartOpen(false)}
                            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1">
                          <CartForm 
                            cart={cart}
                            studentName={studentName}
                            setStudentName={setStudentName}
                            updateCartQuantity={updateCartQuantity}
                            getCartTotal={getCartTotal}
                            handleSendOrder={handleSendOrder}
                            isSubmittingOrder={isSubmittingOrder}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 2: Admin Dashboard Panel */}
        {activeTab === 'admin' && isAdminAuthenticated && (
          <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-3xl p-6 backdrop-blur-md shadow-2xl">
            
            {/* Dashboard Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6 mb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-amber-500" />
                  Painel de Controle Administrador
                </h2>
                <p className="text-zinc-500 text-xs mt-1">Gerencie a rodada de compras do LASSE</p>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center gap-1.5 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 self-start">
                <button
                  onClick={() => setAdminTab('orders')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    adminTab === 'orders' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Pedidos
                </button>
                <button
                  onClick={() => setAdminTab('products')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    adminTab === 'products' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Cardápio
                </button>
                <button
                  onClick={() => setAdminTab('settings')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    adminTab === 'settings' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Configurações
                </button>
              </div>
            </div>

            {/* Sub-tab 1: Orders Consolidation */}
            {adminTab === 'orders' && (
              <div>
                
                {/* Consolidation Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchAdminData}
                      disabled={isLoadingAdminData}
                      className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-amber-500 transition-colors disabled:opacity-50"
                      title="Sincronizar Pedidos"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingAdminData ? 'animate-spin' : ''}`} />
                    </button>
                    <span className="text-xs text-zinc-500">
                      {adminOrders.length} pedido(s) ativo(s) nesta rodada.
                    </span>
                  </div>

                  {adminOrders.length > 0 && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleClearOrders}
                        className="px-4 py-2 rounded-xl border border-rose-900/60 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 text-xs font-semibold transition-colors"
                      >
                        Zerar / Nova Rodada
                      </button>
                    </div>
                  )}
                </div>

                {adminOrders.length === 0 ? (
                  <div className="bg-[#0c0c0e] border border-dashed border-zinc-800 rounded-2xl p-16 text-center">
                    <Coffee className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-zinc-400 font-semibold mb-1">Nenhum pedido ativo</h3>
                    <p className="text-zinc-600 text-xs max-w-sm mx-auto">
                      Os alunos ainda não enviaram pedidos nesta rodada. Divulgue o link para a galera pedir.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Column 1 & 2: Individual order cards */}
                    <div className="lg:col-span-2 space-y-4">
                      <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Breakdown de Pedidos (por Pessoa)</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {adminOrders.map(order => (
                          <div key={order.id} className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-500 font-bold text-sm">
                                    {order.student_name.charAt(0).toUpperCase()}
                                  </div>
                                  <strong className="text-zinc-200 text-sm">{order.student_name}</strong>
                                </div>
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  {new Date(order.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>

                              <div className="space-y-1.5 pl-1.5 border-l border-zinc-850 py-1 mb-4">
                                {order.items.map(item => (
                                  <div key={item.id} className="text-xs text-zinc-400 flex justify-between">
                                    <span>
                                      <strong className="text-amber-500">{item.quantity}x</strong> {item.product_name}
                                    </span>
                                    <span className="text-zinc-500">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="border-t border-zinc-900 pt-3 flex justify-between items-center">
                              <span className="text-[10px] uppercase font-semibold text-zinc-500">Total</span>
                              <span className="text-sm font-bold text-amber-500 font-mono">R$ {order.total.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Column 3: Consolidated Summary Card */}
                    <div className="lg:col-span-1">
                      <div className="bg-[#0c0c0e] border border-zinc-800 rounded-2xl p-6 sticky top-28 shadow-xl">
                        <div className="flex items-center justify-between mb-4 border-b border-zinc-850 pb-3">
                          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">Pedido Consolidado</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20">Padaria</span>
                        </div>

                        {consolidatedOrders.length > 0 ? (
                          <div className="flex flex-col h-full">
                            <div className="space-y-3 mb-6">
                              {consolidatedOrders.map(item => (
                                <div key={item.name} className="flex justify-between items-center text-sm border-b border-zinc-900/60 pb-2">
                                  <div>
                                    <span className="font-bold text-amber-500 mr-2 font-mono text-base">{item.quantity}x</span>
                                    <span className="text-zinc-300 font-medium">{item.name}</span>
                                  </div>
                                  <span className="text-zinc-400 font-mono text-xs">R$ {item.total.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>

                            <div className="bg-black/60 rounded-xl p-4 border border-zinc-850 mb-6 flex justify-between items-center">
                              <span className="text-xs font-semibold text-zinc-400 uppercase">Total Geral</span>
                              <span className="text-xl font-bold text-amber-500 font-mono">
                                R$ {consolidatedOrders.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                              </span>
                            </div>

                            <button
                              onClick={() => copyToClipboard(getConsolidatedText(), 'consolidated')}
                              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-zinc-950 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-transform duration-200"
                            >
                              {copiedConsolidated ? <Check className="w-5 h-5 text-emerald-950 stroke-[3]" /> : <Copy className="w-5 h-5" />}
                              {copiedConsolidated ? 'Copiado!' : 'Copiar Texto Consolidado'}
                            </button>
                            <span className="text-[10px] text-zinc-500 text-center block mt-2">
                              Formata em uma lista para enviar no WhatsApp da padaria ou de alguém.
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500 py-6 text-center">Nenhum item consolidado.</p>
                        )}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Menu / Product CRUD */}
            {adminTab === 'products' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Form to add product */}
                <div className="lg:col-span-1">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-4 border-b border-zinc-850 pb-2">
                      {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                    </h3>
                    <form onSubmit={handleAddProduct} className="space-y-4">
                      <div>
                        <label className="text-xs text-zinc-400 block mb-1 font-medium">Nome do Produto</label>
                        <input
                          type="text"
                          required
                          value={newProductName}
                          onChange={(e) => setNewProductName(e.target.value)}
                          placeholder="Ex: Pão de Queijo, Coxinha, Cafezinho"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-650 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400 block mb-1 font-medium">Preço (R$)</label>
                        <input
                          type="text"
                          required
                          value={newProductPrice}
                          onChange={(e) => setNewProductPrice(e.target.value)}
                          placeholder="Ex: 5,50"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-650 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors font-mono"
                        />
                      </div>

                      <div className="flex gap-2">
                        {editingProduct && (
                          <button
                            type="button"
                            onClick={handleCancelEditProduct}
                            className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-350 hover:bg-zinc-700 hover:text-zinc-100 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                          >
                            Cancelar
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={isAddingProduct}
                          className={`font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                            editingProduct ? 'flex-1 bg-amber-500 text-zinc-950 hover:bg-amber-400' : 'w-full bg-amber-500 text-zinc-950 hover:bg-amber-400'
                          }`}
                        >
                          {editingProduct ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4 stroke-[3]" />}
                          {isAddingProduct ? 'Salvando...' : editingProduct ? 'Salvar Alterações' : 'Salvar Produto'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Products list */}
                <div className="lg:col-span-2">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-4 border-b border-zinc-850 pb-2">Produtos Cadastrados ({products.length})</h3>
                    {products.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-8 text-center">Nenhum produto cadastrado.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-zinc-850 text-zinc-500 font-semibold text-xs">
                              <th className="py-3 px-2">Produto</th>
                              <th className="py-3 px-2 text-right">Valor</th>
                              <th className="py-3 px-2 text-center w-24">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products.map(product => (
                              <tr key={product.id} className="border-b border-zinc-900/60 hover:bg-zinc-900/20 text-zinc-300">
                                <td className="py-3.5 px-2 font-medium">{product.name}</td>
                                <td className="py-3.5 px-2 text-right font-mono font-bold text-amber-500">R$ {product.price.toFixed(2)}</td>
                                <td className="py-3.5 px-2 text-center flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleStartEditProduct(product)}
                                    className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-500 hover:bg-amber-950/20 transition-colors"
                                    title="Editar produto"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(product.id)}
                                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                                    title="Remover produto"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* Sub-tab 3: Settings & Showcase Image */}
            {adminTab === 'settings' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Upload showcase image */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-4 border-b border-zinc-850 pb-2">Foto da Vitrine / Balcão</h3>
                  
                  <div className="space-y-5">
                    
                    {/* Drag and drop input */}
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-900/20 rounded-2xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center"
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageChange} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      <Upload className="w-10 h-10 text-zinc-500 mb-3" />
                      <span className="text-sm text-zinc-300 font-semibold mb-1">Selecionar Imagem</span>
                      <span className="text-xs text-zinc-500">Tire a foto da vitrine e selecione aqui</span>
                    </div>

                    {/* Preview chosen image */}
                    {uploadPreview && (
                      <div className="space-y-3">
                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-zinc-800 bg-black">
                          <img src={uploadPreview} alt="Preview do upload" className="w-full h-full object-contain" />
                          <button 
                            type="button"
                            onClick={() => { setUploadFile(null); setUploadPreview(''); }}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleUploadImage}
                          disabled={isUploading}
                          className="w-full py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          {isUploading ? 'Enviando...' : 'Confirmar e Publicar Foto'}
                        </button>
                      </div>
                    )}

                    {/* Currently live showcase image */}
                    {vitrineImageUrl && !uploadPreview && (
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest block mb-2">Foto Ativa na Vitrine:</span>
                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-zinc-800 bg-black">
                          <img src={vitrineImageUrl} alt="Vitrine ativa" className="w-full h-full object-contain" />
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Configurations */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-4 border-b border-zinc-850 pb-2">Parâmetros do Sistema</h3>
                  <form onSubmit={handleSaveSettings} className="space-y-5">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1 font-medium">Chave PIX para Receber Pagamentos</label>
                      <input
                        type="text"
                        required
                        value={settingsPixKey}
                        onChange={(e) => setSettingsPixKey(e.target.value)}
                        placeholder="Ex: lasse@ufpa.br ou celular ou CNPJ"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-650 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors"
                      />
                      <span className="text-[10px] text-zinc-500 mt-1 block">Esta chave será exibida aos alunos na confirmação do pedido.</span>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1 font-medium">Nova Senha PIN de Acesso Admin</label>
                      <input
                        type="password"
                        value={settingsAdminPin}
                        onChange={(e) => setSettingsAdminPin(e.target.value)}
                        placeholder="Deixe em branco para manter a atual"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-650 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors font-mono"
                      />
                      <span className="text-[10px] text-zinc-500 mt-1 block">Insira pelo menos 4 caracteres para mudar a senha PIN.</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="w-full bg-amber-500 text-zinc-950 hover:bg-amber-400 font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      {isSavingSettings ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </form>
                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900/60 bg-[#070709] py-8 text-center text-zinc-500 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-400">
            LASSE Food — Desenvolvido para o LASSE ☕️
          </div>
          <p>© 2026 LASSE. Sistema de pedidos.</p>
        </div>
      </footer>

      {/* Admin Login PIN Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95">
            <button 
              onClick={() => setIsAdminModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-zinc-950 mb-3 shadow-lg shadow-amber-500/10">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100">Área de Administração</h3>
              <p className="text-zinc-500 text-xs mt-1">Informe o código PIN cadastrado para acessar o painel</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Digite o PIN de acesso"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-center font-mono text-lg tracking-widest placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-zinc-950 font-bold py-3 px-4 rounded-xl text-sm transition-transform active:scale-95 duration-200"
              >
                Acessar Painel
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Inner Component for Cart Form
interface CartFormProps {
  cart: Record<number, CartItem>;
  studentName: string;
  setStudentName: (name: string) => void;
  updateCartQuantity: (product: Product, quantity: number) => void;
  getCartTotal: () => number;
  handleSendOrder: (e: React.FormEvent) => void;
  isSubmittingOrder: boolean;
}

function CartForm({
  cart,
  studentName,
  setStudentName,
  updateCartQuantity,
  getCartTotal,
  handleSendOrder,
  isSubmittingOrder
}: CartFormProps) {
  const items = Object.values(cart);

  if (items.length === 0) {
    return (
      <div className="py-12 text-center flex flex-col items-center">
        <ShoppingBag className="w-10 h-10 text-zinc-700 mb-3 stroke-[1.5]" />
        <p className="text-zinc-500 text-sm">Seu carrinho está vazio.</p>
        <p className="text-zinc-650 text-xs mt-1">Selecione opções ao lado para começar.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSendOrder} className="flex flex-col gap-6">
      <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
        {items.map(item => (
          <div key={item.product.id} className="flex items-center justify-between text-sm py-2 border-b border-zinc-900">
            <div className="pr-2 truncate">
              <span className="font-semibold text-zinc-300 block truncate">{item.product.name}</span>
              <span className="text-[11px] text-zinc-500 font-mono">
                R$ {item.product.price.toFixed(2)} cada
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => updateCartQuantity(item.product, item.quantity - 1)}
                className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-750 flex items-center justify-center hover:bg-zinc-700 text-zinc-300"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-5 text-center font-bold text-zinc-200 font-mono">{item.quantity}</span>
              <button
                type="button"
                onClick={() => updateCartQuantity(item.product, item.quantity + 1)}
                className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center hover:bg-amber-400 text-zinc-950"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-zinc-850 pt-4 space-y-4">
        {/* Total price */}
        <div className="flex justify-between items-center bg-[#0d0d11] p-3.5 rounded-xl border border-zinc-850">
          <span className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Subtotal</span>
          <span className="text-xl font-bold text-amber-500 font-mono">R$ {getCartTotal().toFixed(2)}</span>
        </div>

        {/* Student Name */}
        <div>
          <label className="text-xs text-zinc-400 block mb-1 font-medium flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-zinc-550" />
            Seu Nome (Identificação)
          </label>
          <input
            type="text"
            required
            placeholder="Ex: Heitor, Ana..."
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-700 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-colors"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmittingOrder}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-zinc-950 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all duration-200 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {isSubmittingOrder ? 'Enviando...' : 'Enviar Pedido'}
        </button>
      </div>
    </form>
  );
}
