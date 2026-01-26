import { useState, useEffect, useCallback, useRef } from "react";
import {
  ShoppingCart,
  LogOut,
  Plus,
  Minus,
  Trash2,
  X,
  Search,
  Clock,
  CheckCircle,
  ChefHat,
  Utensils,
  History,
  Home,
  Filter,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase, MenuItem, CartItem, Order } from "../lib/supabase";

const formatOrderNumericId = (id: string) => {
  // deterministic hash to 3-digit numeric id (100-999)
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 1000;
  }
  if (hash < 100) hash += 100;
  return String(hash).padStart(3, "0");
};

export default function CustomerOrder() {
  const { user, logout } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string>("");
  const [showToast, setShowToast] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"menu" | "orders">("menu");
  const [showItemDetails, setShowItemDetails] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [observations, setObservations] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const toastTimeoutRef = useRef<number | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const fetchMenuItems = async () => {
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .eq("active", true)
      .order("name");

    if (data) {
      setMenuItems(data);
      setCategories(["todos", ...new Set(data.map((item) => item.category))]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    };

    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen]);

  const handleCategorySelect = (category: string) => {
    if (category === "Todos") {
      setSelectedCategories([]);
    } else {
      setSelectedCategories((prev) => {
        const newSelection = prev.includes(category)
          ? prev.filter((c) => c !== category)
          : [...prev, category];

        // Verifica se todas as categorias (exceto "todos") foram selecionadas
        const allCategoriesExceptTodos = categories.filter(
          (cat) => cat !== "todos",
        );
        const allSelected = allCategoriesExceptTodos.every((cat) =>
          newSelection.includes(cat),
        );

        // Se todas foram selecionadas, marca como "Todos" (array vazia)
        return allSelected ? [] : newSelection;
      });
    }
  };

  const removeCategory = (category: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c !== category));
  };

  const checkExistingOrder = useCallback(async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("hidden", false)
      .in("status", ["pending", "preparing", "ready", "completed", "cancelled"])
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      setUserOrders(data);
      // Define o pedido mais recente como o atual se não houver um sendo visualizado
      if (!viewingOrderId) {
        setCurrentOrder(data[0]);
        setViewingOrderId(data[0].id);
        setActiveTab("orders");
      } else {
        // Se já está visualizando um pedido específico, mantém ele
        const viewingOrder = data.find((order) => order.id === viewingOrderId);
        setCurrentOrder(viewingOrder || data[0]);
      }
    } else {
      setUserOrders([]);
      setCurrentOrder(null);
      setViewingOrderId(null);
      setActiveTab("menu");
    }
  }, [user?.id, viewingOrderId]);

  const fetchOrderStatus = useCallback(async () => {
    if (!currentOrder) return;

    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("id", currentOrder.id)
      .single();

    if (data && !data.hidden) {
      setUserOrders((prevOrders) =>
        prevOrders.map((order) => (order.id === data.id ? data : order)),
      );
      setCurrentOrder(data);
    } else {
      // Pedido foi ocultado ou não existe mais, verificar se há outros pedidos
      checkExistingOrder();
    }
  }, [currentOrder, checkExistingOrder]);

  useEffect(() => {
    fetchMenuItems();
    checkExistingOrder();
  }, [checkExistingOrder]);

  useEffect(() => {
    if (currentOrder) {
      const interval = setInterval(() => {
        fetchOrderStatus();
      }, 2000); // Verificar status a cada 2 segundos

      return () => clearInterval(interval);
    }
  }, [currentOrder, fetchOrderStatus]);

  const addToCart = (item: MenuItem) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });

    // Mostrar toast de confirmação
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(`${item.name} adicionado ao carrinho`);
    setShowToast(true);
    toastTimeoutRef.current = window.setTimeout(() => {
      setShowToast(false);
      toastTimeoutRef.current = null;
    }, 2500);
  };

  const openItemDetails = (item: MenuItem) => {
    setSelectedItem(item);
    setShowItemDetails(true);
  };

  const cancelOrder = async (orderId: string) => {
    if (confirm("Deseja realmente cancelar este pedido?")) {
      try {
        await supabase
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", orderId);

        setToastMessage("Pedido cancelado com sucesso");
        setShowToast(true);
        toastTimeoutRef.current = window.setTimeout(() => {
          setShowToast(false);
          toastTimeoutRef.current = null;
        }, 2500);

        // Atualizar o pedido localmente
        setCurrentOrder((prev) =>
          prev ? { ...prev, status: "cancelled" } : null,
        );
      } catch (error) {
        console.error("Erro ao cancelar pedido:", error);
        setToastMessage("Erro ao cancelar pedido");
        setShowToast(true);
        toastTimeoutRef.current = window.setTimeout(() => {
          setShowToast(false);
          toastTimeoutRef.current = null;
        }, 2500);
      }
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item,
        )
        .filter((item) => item.quantity > 0);
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleNewOrder = () => {
    setCurrentOrder(null);
    setViewingOrderId(null);
    setActiveTab("menu");
  };

  const handleViewOrder = (order: Order) => {
    setCurrentOrder(order);
    setViewingOrderId(order.id);
    setActiveTab("orders");
  };

  const handleFinishOrder = async () => {
    // Verificações de validação
    if (!user?.id) {
      console.error("User ID não encontrado:", user);
      setToastMessage("Você precisa estar logado para fazer um pedido.");
      setShowToast(true);
      toastTimeoutRef.current = window.setTimeout(() => {
        setShowToast(false);
        toastTimeoutRef.current = null;
      }, 3000);
      return;
    }

    if (cart.length === 0) {
      setToastMessage("Adicione pelo menos um item ao carrinho.");
      setShowToast(true);
      toastTimeoutRef.current = window.setTimeout(() => {
        setShowToast(false);
        toastTimeoutRef.current = null;
      }, 3000);
      return;
    }

    if (!paymentMethod) {
      setToastMessage("Selecione a forma de pagamento.");
      setShowToast(true);
      toastTimeoutRef.current = window.setTimeout(() => {
        setShowToast(false);
        toastTimeoutRef.current = null;
      }, 3000);
      return;
    }

    setLoading(true);

    try {
      const total = getTotal();

      console.log("Iniciando finalização de pedido");
      console.log("User ID:", user.id);
      console.log("Cart:", cart);
      console.log("Total:", total);
      console.log("Payment method:", paymentMethod);
      console.log("Observations:", observations);

      // Preparar dados do pedido - tentar apenas campos básicos primeiro
      const basicOrderData = {
        user_id: user.id,
        table_number: 0,
        status: "pending",
        total,
      };

      console.log("Basic order data:", basicOrderData);

      const { data: insertedOrder, error: orderError } = await supabase
        .from("orders")
        .insert(basicOrderData)
        .select()
        .single();

      console.log("Basic insert result:", { insertedOrder, orderError });

      if (orderError || !insertedOrder) {
        throw new Error(
          `Erro ao criar pedido: ${orderError?.message || "Erro desconhecido"}`,
        );
      }

      // Tentar atualizar com campos adicionais se fornecidos
      if (paymentMethod || observations) {
        const updateData: any = {};
        if (paymentMethod) updateData.payment_method = paymentMethod;
        if (observations) updateData.observations = observations;

        console.log("Update data:", updateData);

        const { error: updateError } = await supabase
          .from("orders")
          .update(updateData)
          .eq("id", insertedOrder.id);

        console.log("Update result:", updateError);

        if (updateError) {
          console.warn(
            "Não foi possível salvar campos adicionais:",
            updateError,
          );
          // Não lançar erro, pois o pedido básico foi criado
        }
      }

      // Inserir os itens do pedido
      const orderItems = cart.map((item) => ({
        order_id: insertedOrder.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        throw new Error(
          `Erro ao adicionar itens ao pedido: ${itemsError.message}`,
        );
      }

      setToastMessage("Pedido realizado com sucesso!");
      setShowToast(true);
      toastTimeoutRef.current = window.setTimeout(() => {
        setShowToast(false);
        toastTimeoutRef.current = null;
      }, 3000);

      setCart([]);
      setPaymentMethod("");
      setObservations("");

      // Adiciona o novo pedido à lista e define como atual
      setUserOrders((prevOrders) => [insertedOrder, ...prevOrders]);
      setCurrentOrder(insertedOrder);
      setViewingOrderId(insertedOrder.id);
      setActiveTab("orders");
      setShowCart(false);
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      setToastMessage("Erro ao finalizar pedido. Tente novamente.");
      setShowToast(true);
      toastTimeoutRef.current = window.setTimeout(() => {
        setShowToast(false);
        toastTimeoutRef.current = null;
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("menu")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                activeTab === "menu"
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="hidden sm:inline">Cardápio</span>
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                activeTab === "orders"
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <History className="w-5 h-5" />
              <span className="hidden sm:inline">Meus Pedidos</span>
            </button>
          </div>

          <h1 className="text-xl font-bold text-gray-900">Restaurante</h1>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ShoppingCart className="w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
            <button
              onClick={logout}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Sair"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {activeTab === "menu" ? (
          <div className="grid grid-cols-1 gap-6">
            {/* Menu Section */}
            <div>
              {/* Search and Filters */}
              <div
                ref={filterRef}
                className="bg-white rounded-lg shadow-sm p-6 mb-6"
              >
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Buscar pratos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* Desktop: Botão de filtro ao lado da pesquisa */}
                  <div className="hidden md:block relative w-64">
                    <button
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                      className="w-full bg-black text-white px-6 py-2 rounded-lg font-semibold transition-all flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Filter size={20} />
                        <span>
                          Filtrar:{" "}
                          {selectedCategories.length > 0
                            ? selectedCategories.length
                            : "Todos"}
                        </span>
                      </div>
                      <ChevronDown
                        size={20}
                        className={`transition-transform ${
                          isFilterOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isFilterOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                        {[
                          "Todos",
                          ...categories.filter((cat) => cat !== "todos"),
                        ].map((category) => (
                          <button
                            key={category}
                            onClick={() => handleCategorySelect(category)}
                            className={`w-full text-left px-6 py-3 border-b border-gray-100 last:border-0 font-semibold transition-all flex items-center cursor-pointer ${
                              (category === "Todos" &&
                                selectedCategories.length === 0) ||
                              selectedCategories.includes(category)
                                ? "bg-black text-white"
                                : "text-gray-700"
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags dos filtros selecionados - Desktop (centralizadas abaixo) */}
                {selectedCategories.length > 0 && (
                  <div className="hidden md:flex justify-center mb-6">
                    <div className="flex flex-wrap justify-center gap-2">
                      {selectedCategories.map((category) => (
                        <span
                          key={category}
                          className="bg-black text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"
                        >
                          {category}
                          <button
                            onClick={() => removeCategory(category)}
                            className="cursor-pointer transition-opacity"
                          >
                            <X size={16} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-6 md:hidden">
                    {/* Mobile: Botão menor centralizado, tags abaixo */}
                    <div className="flex justify-center mb-4">
                      <div className="relative w-full max-w-xs">
                        <button
                          onClick={() => setIsFilterOpen(!isFilterOpen)}
                          className="w-full bg-black text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-between gap-2 cursor-pointer text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Filter size={18} />
                            <span>
                              Filtrar:{" "}
                              {selectedCategories.length > 0
                                ? selectedCategories.length
                                : "Todos"}
                            </span>
                          </div>
                          <ChevronDown
                            size={18}
                            className={`transition-transform ${
                              isFilterOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {isFilterOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                            {[
                              "Todos",
                              ...categories.filter((cat) => cat !== "todos"),
                            ].map((category) => (
                              <button
                                key={category}
                                onClick={() => handleCategorySelect(category)}
                                className={`w-full text-left px-4 py-2 border-b border-gray-100 last:border-0 font-semibold transition-all flex items-center cursor-pointer text-sm ${
                                  (category === "Todos" &&
                                    selectedCategories.length === 0) ||
                                  selectedCategories.includes(category)
                                    ? "bg-black text-white"
                                    : "text-gray-700"
                                }`}
                              >
                                {category}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tags dos filtros selecionados - Mobile */}
                    {selectedCategories.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2">
                        {selectedCategories.map((category) => (
                          <span
                            key={category}
                            className="bg-black text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"
                          >
                            {category}
                            <button
                              onClick={() => removeCategory(category)}
                              className="cursor-pointer transition-opacity"
                            >
                              <X size={16} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {menuItems
                  .filter(
                    (item) =>
                      (selectedCategories.length === 0 ||
                        selectedCategories.includes(item.category)) &&
                      (searchQuery === "" ||
                        item.name
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                        item.description
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase())),
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg mb-1">
                            {item.name}
                          </h3>
                          <button
                            onClick={() => openItemDetails(item)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-3 block"
                          >
                            ver detalhes
                          </button>
                          <span className="text-xl font-bold text-gray-900 block">
                            R$ {item.price.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <button
                            onClick={() => addToCart(item)}
                            className="bg-black text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition flex items-center gap-2"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          /* Orders Tab */
          <div>
            {currentOrder ? (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-2">
                      Status do Pedido
                    </h2>
                    <p className="text-gray-600">
                      Pedido #{formatOrderNumericId(currentOrder.id)}
                    </p>
                  </div>

                  <div className="space-y-6 h-64 flex items-center justify-center">
                    {currentOrder.status === "pending" && (
                      <div className="text-center">
                        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Clock className="w-10 h-10 text-yellow-600" />
                        </div>
                        <h3 className="text-xl font-bold text-yellow-700 mb-2">
                          Aguardando confirmação
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Seu pedido foi enviado e está aguardando aprovação do
                          restaurante.
                        </p>
                        <button
                          onClick={() => cancelOrder(currentOrder.id)}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition flex items-center gap-2 mx-auto"
                        >
                          <X className="w-4 h-4" />
                          Cancelar Pedido
                        </button>
                      </div>
                    )}

                    {currentOrder.status === "preparing" && (
                      <div className="text-center">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <ChefHat className="w-10 h-10 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-blue-700 mb-2">
                          Preparando seu pedido
                        </h3>
                        <p className="text-gray-600">
                          Os chefs estão preparando seu pedido com todo cuidado.
                        </p>
                      </div>
                    )}

                    {currentOrder.status === "ready" && (
                      <div className="text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Utensils className="w-10 h-10 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-green-700 mb-2">
                          Pedido pronto!
                        </h3>
                        <p className="text-gray-600">
                          Seu pedido está pronto. Aguarde que levaremos à sua
                          mesa em breve.
                        </p>
                      </div>
                    )}

                    {currentOrder.status === "completed" && (
                      <div className="text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-green-700 mb-2">
                          Pedido finalizado
                        </h3>
                        <p className="text-green-600 mb-4">
                          Seu pedido foi finalizado. Aguarde — vamos levá-lo à
                          sua mesa em breve.
                        </p>
                      </div>
                    )}

                    {currentOrder.status === "cancelled" && (
                      <div className="text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <X className="w-10 h-10 text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-red-700 mb-2">
                          Pedido cancelado
                        </h3>
                        <p className="text-red-600">
                          Seu pedido foi cancelado.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <History className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg mb-4">
                  Você ainda não fez nenhum pedido.
                </p>
                <button
                  onClick={handleNewOrder}
                  className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
                >
                  Fazer Primeiro Pedido
                </button>
              </div>
            )}

            {userOrders.length > 1 && (
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">Histórico de Pedidos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer transition hover:shadow-md ${
                        order.id === currentOrder?.id ? "ring-2 ring-black" : ""
                      }`}
                      onClick={() => handleViewOrder(order)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">
                          Pedido #{formatOrderNumericId(order.id)}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            order.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : order.status === "preparing"
                                ? "bg-blue-100 text-blue-800"
                                : order.status === "ready"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {order.status === "pending"
                            ? "Aguardando"
                            : order.status === "preparing"
                              ? "Preparando"
                              : order.status === "ready"
                                ? "Pronto"
                                : "Finalizado"}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-1">
                        R$ {order.total.toFixed(2)}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {new Date(order.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Cart Modal */}
      {showCart && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCart(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Carrinho
              </h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Carrinho vazio</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg"
                      >
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {item.name}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            R$ {item.price.toFixed(2)} cada
                          </p>
                          <p className="text-gray-800 font-semibold text-sm">
                            Total: R$ {(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold w-6 text-center text-sm">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 hover:bg-red-100 text-red-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total:</span>
                      <span>R$ {getTotal().toFixed(2)}</span>
                    </div>

                    {/* Payment Method Select */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Forma de Pagamento *
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                      >
                        <option value="">Selecione...</option>
                        <option value="pix">PIX</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="cartao_credito">
                          Cartão de Crédito
                        </option>
                        <option value="cartao_debito">Cartão de Débito</option>
                      </select>
                    </div>

                    {/* Observations Textarea */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Observações (opcional)
                      </label>
                      <textarea
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Ex: remover cebola, sem molho, etc."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none resize-none"
                        rows={3}
                      />
                    </div>

                    <button
                      onClick={handleFinishOrder}
                      disabled={!paymentMethod || loading}
                      className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Finalizando..." : "Finalizar Pedido"}
                    </button>

                    {!paymentMethod && (
                      <p className="text-red-500 text-xs text-center">
                        Selecione a forma de pagamento
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Item Details Modal */}
      {showItemDetails && selectedItem && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowItemDetails(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">{selectedItem.name}</h2>
              <button
                onClick={() => setShowItemDetails(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <img
                src={selectedItem.image_url}
                alt={selectedItem.name}
                className="w-48 h-48 object-cover rounded-lg mb-4 mx-auto"
              />

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Detalhes</h3>
                  <p className="text-gray-600">{selectedItem.description}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-2xl font-bold text-gray-900">
                    R$ {selectedItem.price.toFixed(2)}
                  </span>
                  <button
                    onClick={() => {
                      addToCart(selectedItem);
                      setShowItemDetails(false);
                    }}
                    className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition flex items-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Adicionar ao Carrinho
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-600 bg-opacity-90 text-white px-4 py-3 rounded-lg shadow-md max-w-lg w-full text-center">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
