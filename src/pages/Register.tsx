import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { UserPlus } from "lucide-react";
import { toast } from "react-toastify";

interface RegisterProps {
  onSwitchToLogin: () => void;
}

export default function Register({ onSwitchToLogin }: RegisterProps) {
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (!adminUsername || !adminPassword) {
      setError("Nome de usuário e senha do administrador são obrigatórios");
      return;
    }

    setLoading(true);

    const success = await register(
      username,
      phone,
      password,
      adminUsername,
      adminPassword,
    );

    if (success) {
      toast.success(
        "Cadastro realizado com sucesso! Faça login para continuar.",
      );
      onSwitchToLogin();
    } else {
      setError(
        "Nome de usuário já existe, administrador não encontrado ou senha incorreta",
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">ALL BLACK</h1>
          <p className="text-gray-400">Hamburgueria Premium</p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="flex items-center justify-center mb-6">
            <UserPlus className="w-8 h-8 text-black" />
          </div>

          <h2 className="text-2xl font-bold text-center mb-6 text-black">
            Cadastro
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome de Usuário
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmação de Senha
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                required
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Autorização do Administrador
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Para criar uma conta, é necessário fornecer as credenciais de um
                administrador.
              </p>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome de Usuário do Admin
                </label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha do Admin
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Cadastrando..." : "Cadastrar"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onSwitchToLogin}
              className="text-sm text-gray-600 hover:text-black transition"
            >
              Já tem uma conta?{" "}
              <span className="font-semibold">Faça login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
