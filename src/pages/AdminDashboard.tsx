import { useState, useEffect } from "react";
import {
  LogOut,
  Users,
  ShoppingBag,
  Plus,
  Edit2,
  Trash2,
  X,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase, MenuItem, Order, OrderItem, User } from "../lib/supabase";
import { toast } from "react-toastify";

type TabType = "dashboard" | "menu" | "orders" | "users";

const getPaymentMethodLabel = (paymentMethod: string) => {
  switch (paymentMethod) {
    case "pix":
      return "PIX";
    case "dinheiro":
      return "Dinheiro";
    case "cartao_credito":
      return "Cartão de Crédito";
    case "cartao_debito":
      return "Cartão de Débito";
    default:
      return paymentMethod;
  }
};

const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatOrderNumericId = (id: string) => {
  // deterministic hash to 3-digit numeric id (100-999)
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 1000;
  }
  if (hash < 100) hash += 100;
  return String(hash).padStart(3, "0");
};

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<
    (Order & { order_items?: OrderItem[]; users?: { username: string } })[]
  >([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
    category: "hamburguer",
    newCategory: "",
  });
  const [showUserModal, setShowUserModal] = useState(false);
  const [userFormData, setUserFormData] = useState({
    username: "",
    phone: "",
    password: "",
    is_admin: false,
  });
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMenuItems();
    fetchOrders();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeTab === "orders" || activeTab === "dashboard") {
      const interval = setInterval(() => {
        fetchOrders();
      }, 3000); // Atualizar pedidos a cada 3 segundos

      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const fetchMenuItems = async () => {
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setMenuItems(data);
      setCategories([...new Set(data.map((item) => item.category))]);
    }
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select(
        `
        *,
        users (
          username
        ),
        order_items (
          *,
          menu_items (*)
        )
      `,
      )
      .order("created_at", { ascending: false });
    if (data) setOrders(data);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setUsers(data);
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      image_url: formData.image_url,
      category: formData.newCategory || formData.category,
      active: true,
    };

    if (editingItem) {
      await supabase
        .from("menu_items")
        .update(itemData)
        .eq("id", editingItem.id);
    } else {
      await supabase.from("menu_items").insert(itemData);
    }

    // Adicionar nova categoria ao array categories imediatamente
    if (formData.newCategory && !categories.includes(formData.newCategory)) {
      setCategories((prev) => [...new Set([...prev, formData.newCategory])]);
    }

    setShowMenuModal(false);
    setEditingItem(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      image_url: "",
      category: "hamburguer",
      newCategory: "",
    });
    fetchMenuItems();
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from("users").insert({
        username: userFormData.username,
        phone: userFormData.phone,
        password_hash: userFormData.password,
        is_admin: userFormData.is_admin,
      });

      if (error) {
        toast.error("Erro ao criar usuário: " + error.message);
        return;
      }

      setShowUserModal(false);
      setUserFormData({
        username: "",
        phone: "",
        password: "",
        is_admin: false,
      });
      fetchUsers();
      toast.success("Usuário criado com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar usuário: " + (error as Error).message);
    }
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      image_url: item.image_url,
      category: item.category,
    });
    setShowMenuModal(true);
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm("Deseja realmente excluir este item?")) {
      try {
        // Verificar se o item está em algum pedido
        const { data: orderItems, error: checkError } = await supabase
          .from("order_items")
          .select("id")
          .eq("menu_item_id", id);

        if (checkError) {
          toast.error("Erro ao verificar pedidos: " + checkError.message);
          return;
        }

        if (orderItems && orderItems.length > 0) {
          toast.warning(
            "Não é possível excluir este item porque ele está associado a pedidos existentes. Desative o item em vez de excluí-lo.",
          );
          return;
        }

        // Se não há pedidos, pode deletar
        const { error } = await supabase
          .from("menu_items")
          .delete()
          .eq("id", id);
        if (error) {
          toast.error("Erro ao excluir item: " + error.message);
          return;
        }
        toast.success("Item excluído com sucesso!");
        fetchMenuItems();
      } catch (error) {
        toast.error("Erro ao excluir item: " + (error as Error).message);
      }
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await supabase
      .from("menu_items")
      .update({ active: !currentActive })
      .eq("id", id);
    fetchMenuItems();
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", orderId);
    fetchOrders();
  };

  const handleDeleteOrder = async (orderId: string) => {
    await supabase.from("orders").update({ hidden: true }).eq("id", orderId);
    toast.error("Pedido removido da lista!");
    fetchOrders();
  };

  const handleClearData = async () => {
    if (
      confirm(
        "⚠️ ATENÇÃO: Esta ação irá APAGAR TODOS os pedidos permanentemente do banco de dados. Esta ação não pode ser desfeita. Deseja continuar?",
      )
    ) {
      try {
        await supabase
          .from("orders")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
        toast.success("Todos os pedidos foram apagados permanentemente!");
        fetchOrders();
      } catch (error) {
        toast.error("Erro ao limpar dados: " + (error as Error).message);
      }
    }
  };

  const handleToggleAdmin = async (userId: string, currentAdmin: boolean) => {
    if (
      confirm(
        `Deseja ${currentAdmin ? "remover" : "conceder"} permissão de administrador?`,
      )
    ) {
      await supabase
        .from("users")
        .update({ is_admin: !currentAdmin })
        .eq("id", userId);
      fetchUsers();
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    try {
      await supabase.from("users").delete().eq("id", userId);
      fetchUsers();
      toast.error("Usuário removido com sucesso!");
    } catch (error) {
      toast.error("Erro ao remover usuário: " + (error as Error).message);
    }
  };

  const toggleUserAccordion = (username: string) => {
    setExpandedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(username)) {
        newSet.delete(username);
      } else {
        newSet.add(username);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-black">
      <header className="bg-white text-black shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin</h1>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition ${
                  activeTab === "dashboard"
                    ? "bg-black text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="max-[480px]:hidden">Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab("menu")}
                className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition ${
                  activeTab === "menu"
                    ? "bg-black text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Edit2 className="w-5 h-5" />
                <span className="max-[480px]:hidden">Editar</span>
              </button>
              <button
                onClick={() => setActiveTab("deactivated")}
                className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition ${
                  activeTab === "deactivated"
                    ? "bg-black text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                <X className="w-5 h-5" />
                <span className="max-[480px]:hidden">Desativados</span>
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition ${
                  activeTab === "orders"
                    ? "bg-black text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                <span className="max-[480px]:hidden">Pedidos</span>
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition ${
                  activeTab === "users"
                    ? "bg-black text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="max-[480px]:hidden">Usuários</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === "deactivated" && (
              <div>
                <h2 className="text-2xl font-bold text-black mb-6">
                  Itens Desativados
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {menuItems.filter((item) => !item.active).length === 0 ? (
                    <p className="text-gray-500 col-span-full">
                      Nenhum item desativado.
                    </p>
                  ) : (
                    menuItems
                      .filter((item) => !item.active)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="border rounded-lg overflow-hidden opacity-50 bg-gray-100"
                        >
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full aspect-square object-cover"
                          />
                          <div className="p-3">
                            <h3 className="font-bold text-base mb-1 text-black">
                              {item.name}
                            </h3>
                            <p className="text-xs text-gray-500 mb-1 uppercase font-semibold">
                              {item.category}
                            </p>
                            <p
                              className="text-gray-600 text-sm mb-2"
                              style={{
                                minHeight: "5.5em",
                                lineHeight: "1.375em",
                                overflow: "hidden",
                                display: "block",
                              }}
                            >
                              {item.description}
                            </p>
                            <p className="text-lg font-bold text-black mb-3">
                              R$ {item.price.toFixed(2)}
                            </p>
                            <button
                              onClick={() =>
                                handleToggleActive(item.id, item.active)
                              }
                              className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-base font-bold"
                            >
                              Ativar Item
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
            {activeTab === "dashboard" && (
              <div>
                <h2 className="text-2xl font-bold text-black mb-6">
                  Dashboard
                </h2>

                {/* Cards de estatísticas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-gray-50 p-6 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Pedidos Hoje
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {
                            orders.filter((order) => {
                              const today = new Date().toDateString();
                              const orderDate = new Date(
                                order.created_at,
                              ).toDateString();
                              return (
                                orderDate === today &&
                                order.status !== "cancelled"
                              );
                            }).length
                          }
                        </p>
                      </div>
                      <ShoppingBag className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Receita Hoje
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          R${" "}
                          {orders
                            .filter((order) => {
                              const today = new Date().toDateString();
                              const orderDate = new Date(
                                order.created_at,
                              ).toDateString();
                              return (
                                orderDate === today &&
                                order.status !== "cancelled"
                              );
                            })
                            .reduce((sum, order) => sum + order.total, 0)
                            .toFixed(2)}
                        </p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-green-600" />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Usuários
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {users.length}
                        </p>
                      </div>
                      <Users className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Itens no Cardápio
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {menuItems.length}
                        </p>
                      </div>
                      <Edit2 className="w-8 h-8 text-orange-600" />
                    </div>
                  </div>
                </div>

                {/* Status dos pedidos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 p-6 rounded-lg border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Status dos Pedidos
                    </h3>
                    <div className="space-y-4">
                      {/* Pipeline de pedidos */}
                      <div className="border-l-4 border-yellow-400 pl-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            Em Fila
                          </span>
                          <span className="text-lg font-bold text-yellow-600">
                            {
                              orders
                                .filter((order) => !order.hidden)
                                .filter((order) => order.status === "pending")
                                .length
                            }
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Aguardando aprovação
                        </p>
                      </div>

                      <div className="border-l-4 border-blue-400 pl-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            Em Preparo
                          </span>
                          <span className="text-lg font-bold text-blue-600">
                            {
                              orders
                                .filter((order) => !order.hidden)
                                .filter((order) => order.status === "preparing")
                                .length
                            }
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Sendo preparado</p>
                      </div>

                      <div className="border-l-4 border-green-400 pl-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            Pronto
                          </span>
                          <span className="text-lg font-bold text-green-600">
                            {
                              orders
                                .filter((order) => !order.hidden)
                                .filter((order) => order.status === "ready")
                                .length
                            }
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Aguardando retirada
                        </p>
                      </div>

                      <div className="border-l-4 border-gray-400 pl-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            Finalizado
                          </span>
                          <span className="text-lg font-bold text-gray-600">
                            {
                              orders.filter(
                                (order) => order.status === "completed",
                              ).length
                            }
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Pedido concluído
                        </p>
                      </div>

                      <div className="border-l-4 border-red-400 pl-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            Cancelado
                          </span>
                          <span className="text-lg font-bold text-red-600">
                            {
                              orders.filter(
                                (order) => order.status === "cancelled",
                              ).length
                            }
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Pedido cancelado
                        </p>
                      </div>

                      {/* Resumo do pipeline */}
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm font-medium text-gray-700">
                            Total em Andamento
                          </span>
                          <span className="text-lg font-bold text-purple-600">
                            {
                              orders
                                .filter((order) => !order.hidden)
                                .filter((order) =>
                                  ["pending", "preparing", "ready"].includes(
                                    order.status,
                                  ),
                                ).length
                            }
                          </span>
                        </div>

                        <p className="text-xs text-gray-500 mt-1">
                          Pedidos ativos no sistema
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Itens Mais Vendidos (Hoje)
                    </h3>
                    <div className="space-y-3">
                      {(() => {
                        const today = new Date().toDateString();
                        const todayOrders = orders.filter(
                          (order) =>
                            new Date(order.created_at).toDateString() ===
                              today && order.status !== "cancelled",
                        );

                        const itemCounts: {
                          [key: string]: { name: string; count: number };
                        } = {};

                        todayOrders.forEach((order) => {
                          order.order_items?.forEach((item) => {
                            if (item.menu_items) {
                              const itemName = item.menu_items.name;
                              if (itemCounts[itemName]) {
                                itemCounts[itemName].count += item.quantity;
                              } else {
                                itemCounts[itemName] = {
                                  name: itemName,
                                  count: item.quantity,
                                };
                              }
                            }
                          });
                        });

                        const sortedItems = Object.values(itemCounts)
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 5);

                        return sortedItems.length > 0 ? (
                          sortedItems.map((item) => (
                            <div
                              key={item.name}
                              className="flex justify-between items-center"
                            >
                              <span className="text-sm text-gray-600">
                                {item.name}
                              </span>
                              <span className="font-semibold text-gray-900">
                                {item.count}x
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">
                            Nenhum pedido hoje
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Pedidos recentes */}
                <div className="bg-gray-50 p-6 rounded-lg border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Pedidos Recentes
                  </h3>
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            Pedido da {order.users?.username || "Cliente"} •{" "}
                            {new Date(order.created_at).toLocaleString("pt-BR")}
                          </p>
                          <p className="text-sm text-gray-600">
                            Pedido #{formatOrderNumericId(order.id)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            R$ {order.total.toFixed(2)}
                          </p>
                          <p
                            className={`text-xs px-2 py-1 rounded-full ${
                              order.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : order.status === "preparing"
                                  ? "bg-blue-100 text-blue-800"
                                  : order.status === "ready"
                                    ? "bg-green-100 text-green-800"
                                    : order.status === "cancelled"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {order.status === "pending"
                              ? "Aguardando"
                              : order.status === "preparing"
                                ? "Preparando"
                                : order.status === "ready"
                                  ? "Pronto"
                                  : order.status === "cancelled"
                                    ? "Cancelado"
                                    : "Finalizado"}
                          </p>
                        </div>
                      </div>
                    ))}
                    {orders.length === 0 && (
                      <p className="text-sm text-gray-500">
                        Nenhum pedido recente.
                      </p>
                    )}
                  </div>
                </div>

                {/* Botão de limpar dados */}
                <div className="bg-red-50 p-6 rounded-lg border border-red-200 mt-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-red-900 mb-2">
                        ⚠️ Limpar Dados
                      </h3>
                      <p className="text-sm text-red-700">
                        Apaga permanentemente todos os pedidos do banco de
                        dados. Esta ação não pode ser desfeita.
                      </p>
                    </div>
                    <button
                      onClick={handleClearData}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                    >
                      Limpar Todos os Dados
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "menu" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-black">
                    Gerenciar Cardápio
                  </h2>
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setFormData({
                        name: "",
                        description: "",
                        price: "",
                        image_url: "",
                        category: "",
                      });
                      setShowMenuModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Item
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {menuItems
                    .filter((item) => item.active)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="p-3">
                          <h3 className="font-bold text-base mb-1 text-black">
                            {item.name}
                          </h3>
                          <p className="text-xs text-gray-500 mb-1 uppercase font-semibold">
                            {item.category}
                          </p>
                          <p className="text-gray-600 text-sm mb-2">
                            {item.description}
                          </p>
                          <p className="text-lg font-bold text-black mb-3">
                            R$ {item.price.toFixed(2)}
                          </p>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-gray-100 text-black rounded hover:bg-gray-200 transition text-sm"
                            >
                              <Edit2 className="w-3 h-3" />
                              Editar
                            </button>
                            <button
                              onClick={() =>
                                handleToggleActive(item.id, item.active)
                              }
                              className="flex-1 px-2 py-1 bg-gray-100 text-black rounded hover:bg-gray-200 transition text-xs"
                            >
                              Desativar
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {activeTab === "orders" && (
              <div>
                <h2 className="text-2xl font-bold text-black mb-6">Pedidos</h2>
                <div className="space-y-4">
                  {(() => {
                    const ordersByUser = orders
                      .filter((order) => !order.hidden)
                      .reduce(
                        (acc, order) => {
                          const username = order.users?.username || "Cliente";
                          if (!acc[username]) acc[username] = [];
                          acc[username].push(order);
                          return acc;
                        },
                        {} as Record<string, typeof orders>,
                      );

                    return Object.keys(ordersByUser).length === 0 ? (
                      <p className="text-sm text-gray-500">
                        Não há pedidos no momento
                      </p>
                    ) : (
                      Object.entries(ordersByUser).map(
                        ([username, userOrders]) => (
                          <div
                            key={username}
                            className="border rounded-lg bg-gray-50"
                          >
                            <button
                              onClick={() => toggleUserAccordion(username)}
                              className="w-full text-left p-4 font-bold text-lg text-black hover:bg-gray-100 transition flex items-center justify-between"
                            >
                              <span>Pedidos da {username}</span>
                              <ChevronDown
                                className={`w-5 h-5 transition-transform ${expandedUsers.has(username) ? "rotate-180" : ""}`}
                              />
                            </button>
                            {expandedUsers.has(username) && (
                              <div className="p-4 space-y-4">
                                {userOrders.map((order) => (
                                  <div
                                    key={order.id}
                                    className="border rounded-lg p-4 bg-white"
                                  >
                                    <div className="flex justify-between items-start mb-4">
                                      <div>
                                        <h3 className="font-bold text-lg text-black">
                                          Pedido da{" "}
                                          {order.users?.username || "Cliente"}
                                        </h3>
                                        <p className="text-gray-600">
                                          Pedido #
                                          {formatOrderNumericId(order.id)}
                                        </p>
                                        <p className="text-gray-600">
                                          {new Date(
                                            order.created_at,
                                          ).toLocaleString("pt-BR")}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-2xl font-bold text-black">
                                          R$ {order.total.toFixed(2)}
                                        </p>
                                        {order.status === "pending" && (
                                          <div className="mt-2 flex gap-2">
                                            <button
                                              onClick={() =>
                                                handleUpdateOrderStatus(
                                                  order.id,
                                                  "preparing",
                                                )
                                              }
                                              className="px-3 py-1 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition"
                                            >
                                              Aceitar
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleUpdateOrderStatus(
                                                  order.id,
                                                  "cancelled",
                                                )
                                              }
                                              className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition"
                                            >
                                              Cancelar
                                            </button>
                                          </div>
                                        )}
                                        {order.status === "preparing" && (
                                          <button
                                            onClick={() =>
                                              handleUpdateOrderStatus(
                                                order.id,
                                                "ready",
                                              )
                                            }
                                            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition"
                                          >
                                            Preparando
                                          </button>
                                        )}
                                        {order.status === "ready" && (
                                          <button
                                            onClick={() =>
                                              handleUpdateOrderStatus(
                                                order.id,
                                                "completed",
                                              )
                                            }
                                            className="mt-2 px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition"
                                          >
                                            Concluído
                                          </button>
                                        )}
                                        {order.status === "completed" && (
                                          <div className="mt-2 flex items-center gap-2">
                                            <span className="px-3 py-1 bg-gray-500 text-white rounded-lg text-sm">
                                              Finalizado
                                            </span>
                                            <button
                                              onClick={() =>
                                                handleDeleteOrder(order.id)
                                              }
                                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                                              title="Ocultar pedido"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        )}
                                        {order.status === "cancelled" && (
                                          <div className="mt-2 flex items-center gap-2">
                                            <span className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm">
                                              Cancelado
                                            </span>
                                            <button
                                              onClick={() =>
                                                handleDeleteOrder(order.id)
                                              }
                                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                                              title="Ocultar pedido"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      {order.order_items?.map((item) => (
                                        <div
                                          key={item.id}
                                          className="text-sm text-gray-700"
                                        >
                                          <div className="flex justify-between">
                                            <span>
                                              {item.quantity}x{" "}
                                              {item.menu_items?.name}
                                            </span>
                                            <span>
                                              R${" "}
                                              {(
                                                item.price * item.quantity
                                              ).toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Informações adicionais do pedido */}
                                    {(order.payment_method ||
                                      order.observations) && (
                                      <div className="mt-4 space-y-2">
                                        {order.payment_method && (
                                          <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                                            <p className="text-sm text-gray-700">
                                              <strong className="text-gray-900">
                                                Forma de Pagamento:
                                              </strong>{" "}
                                              {getPaymentMethodLabel(
                                                order.payment_method,
                                              )}
                                            </p>
                                          </div>
                                        )}
                                        {order.observations && (
                                          <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                                            <p className="text-sm text-gray-700">
                                              <strong className="text-gray-900">
                                                Observação:
                                              </strong>{" "}
                                              {order.observations}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ),
                      )
                    );
                  })()}
                </div>
              </div>
            )}

            {activeTab === "users" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-black">Usuários</h2>
                  <button
                    onClick={() => setShowUserModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Usuário
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-black">
                          Usuário
                        </th>
                        <th className="px-4 py-3 text-left text-black">
                          Telefone
                        </th>
                        <th className="px-4 py-3 text-left text-black">
                          Admin
                        </th>
                        <th className="px-4 py-3 text-center text-black">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b">
                          <td className="px-4 py-3 text-black">
                            {user.username}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {user.phone}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                user.is_admin
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {user.is_admin ? "Sim" : "Não"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() =>
                                  handleToggleAdmin(user.id, user.is_admin)
                                }
                                className="w-32 px-3 py-1 bg-black text-white rounded hover:bg-gray-800 transition text-sm"
                              >
                                {user.is_admin
                                  ? "Remover Admin"
                                  : "Tornar Admin"}
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteUser(user.id, user.username)
                                }
                                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                Remover
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showMenuModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowMenuModal(false);
            setEditingItem(null);
            setFormData({
              name: "",
              description: "",
              price: "",
              image_url: "",
              category: "hamburguer",
              newCategory: "",
            });
          }}
        >
          <div
            className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="text-2xl font-bold text-black">
                {editingItem ? "Editar Item" : "Adicionar Item"}
              </h2>
              <button
                onClick={() => {
                  setShowMenuModal(false);
                  setEditingItem(null);
                  setFormData({
                    name: "",
                    description: "",
                    price: "",
                    image_url: "",
                    category: "hamburguer",
                    newCategory: "",
                  });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                    disabled={!!formData.newCategory}
                    required={!formData.newCategory}
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {capitalize(cat)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ou criar nova categoria (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.newCategory}
                    onChange={(e) =>
                      setFormData({ ...formData, newCategory: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                    placeholder="Digite o nome da nova categoria"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL da Imagem
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) =>
                      setFormData({ ...formData, image_url: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                    required
                  />
                </div>

                {formData.image_url && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preview
                    </label>
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t flex-shrink-0">
              <button
                type="submit"
                onClick={handleSaveMenuItem}
                className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
              >
                {editingItem ? "Atualizar" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="text-2xl font-bold text-black">
                Adicionar Usuário
              </h2>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setUserFormData({
                    username: "",
                    phone: "",
                    password: "",
                    is_admin: false,
                  });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={userFormData.username}
                    onChange={(e) =>
                      setUserFormData({
                        ...userFormData,
                        username: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={userFormData.phone}
                    onChange={(e) =>
                      setUserFormData({
                        ...userFormData,
                        phone: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={userFormData.password}
                    onChange={(e) =>
                      setUserFormData({
                        ...userFormData,
                        password: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Usuário
                  </label>
                  <select
                    value={userFormData.is_admin ? "admin" : "cliente"}
                    onChange={(e) =>
                      setUserFormData({
                        ...userFormData,
                        is_admin: e.target.value === "admin",
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                    required
                  >
                    <option value="cliente">Cliente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="p-6 border-t flex-shrink-0">
                <button
                  type="submit"
                  className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
                >
                  Adicionar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
