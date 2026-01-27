import { useState, useEffect } from "react";
import { LogOut, Clock, CheckCircle, ChefHat, Utensils} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase, Order, OrderItem, MenuItem } from "../lib/supabase";

const formatOrderNumericId = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 1000;
  }
  if (hash < 100) hash += 100;
  return String(hash).padStart(3, "0");
};

export default function EmployeeDashboard() {
  const { logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("hidden", false)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });

    if (data) {
      setOrders(data);
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .eq("active", true);

    if (data) {
      setMenuItems(data);
    }
  };

  const fetchOrderItems = async (orderId: string) => {
    const { data } = await supabase
      .from("order_items")
      .select(
        `
        *,
        menu_items (*)
      `,
      )
      .eq("order_id", orderId);

    if (data) {
      setOrderItems(data);
    }
  };

  useEffect(() => {
    fetchMenuItems();
    fetchOrders();

    const interval = setInterval(() => {
      fetchOrders();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleOrderClick = async (order: Order) => {
    setSelectedOrder(order);
    await fetchOrderItems(order.id);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
    fetchOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "preparing":
        return "bg-blue-100 text-blue-800";
      case "ready":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Aguardando",
      preparing: "Preparando",
      ready: "Pronto",
      completed: "Finalizado",
      cancelled: "Cancelado",
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Carregando pedidos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Painel de Pedidos
          </h1>
          <button
            onClick={logout}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Sair"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h2 className="text-xl font-bold text-black">Pedidos</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Total: {orders.length}
                </p>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                {orders.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Nenhum pedido no momento
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {orders.map((order) => (
                      <button
                        key={order.id}
                        onClick={() => handleOrderClick(order)}
                        className={`w-full text-left p-3 rounded-lg transition ${
                          selectedOrder?.id === order.id
                            ? "bg-black text-white"
                            : "bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">
                              #{formatOrderNumericId(order.id)}
                            </h4>
                            <p
                              className={`text-xs mt-1 ${selectedOrder?.id === order.id ? "text-gray-300" : "text-gray-600"}`}
                            >
                              R$ {order.total.toFixed(2)}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                              order.status,
                            )}`}
                          >
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                        <p
                          className={`text-xs mt-2 ${selectedOrder?.id === order.id ? "text-gray-400" : "text-gray-500"}`}
                        >
                          {new Date(order.created_at).toLocaleTimeString(
                            "pt-BR",
                          )}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="lg:col-span-2">
            {selectedOrder ? (
              <div className="space-y-4">
                {/* Status Card */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-black">
                        Pedido #{formatOrderNumericId(selectedOrder.id)}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {new Date(selectedOrder.created_at).toLocaleString(
                          "pt-BR",
                        )}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded font-semibold ${getStatusColor(
                        selectedOrder.status,
                      )}`}
                    >
                      {getStatusLabel(selectedOrder.status)}
                    </span>
                  </div>

                  {/* Status Display */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
                    {selectedOrder.status === "pending" && (
                      <div className="flex flex-col items-center gap-3">
                        <Clock className="w-12 h-12 text-yellow-600" />
                        <h4 className="text-lg font-bold text-gray-900">
                          Aguardando Confirmação
                        </h4>
                        <button
                          onClick={() =>
                            updateOrderStatus(selectedOrder.id, "preparing")
                          }
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition mt-2"
                        >
                          Iniciar Preparo
                        </button>
                      </div>
                    )}

                    {selectedOrder.status === "preparing" && (
                      <div className="flex flex-col items-center gap-3">
                        <ChefHat className="w-12 h-12 text-blue-600" />
                        <h4 className="text-lg font-bold text-gray-900">
                          Preparando Pedido
                        </h4>
                        <button
                          onClick={() =>
                            updateOrderStatus(selectedOrder.id, "ready")
                          }
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition mt-2"
                        >
                          Marcar como Pronto
                        </button>
                      </div>
                    )}

                    {selectedOrder.status === "ready" && (
                      <div className="flex flex-col items-center gap-3">
                        <Utensils className="w-12 h-12 text-green-600" />
                        <h4 className="text-lg font-bold text-gray-900">
                          Pedido Pronto
                        </h4>
                        <button
                          onClick={() =>
                            updateOrderStatus(selectedOrder.id, "completed")
                          }
                          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition mt-2"
                        >
                          Finalizar Pedido
                        </button>
                      </div>
                    )}

                    {selectedOrder.status === "completed" && (
                      <div className="flex flex-col items-center gap-3">
                        <CheckCircle className="w-12 h-12 text-gray-600" />
                        <h4 className="text-lg font-bold text-gray-900">
                          Pedido Finalizado
                        </h4>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Card */}
                {orderItems.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h4 className="text-lg font-bold text-black mb-4">
                      Itens do Pedido
                    </h4>
                    <div className="space-y-3">
                      {orderItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <h5 className="font-semibold text-gray-900">
                              {
                                menuItems.find(
                                  (m) => m.id === item.menu_item_id,
                                )?.name
                              }
                            </h5>
                            <p className="text-sm text-gray-600">
                              Quantidade: {item.quantity}
                            </p>
                          </div>
                          <p className="font-bold text-gray-900">
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                      <span className="text-lg font-bold">Total:</span>
                      <span className="text-2xl font-bold text-black">
                        R$ {selectedOrder.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-500 text-lg">
                  Selecione um pedido para ver detalhes
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
