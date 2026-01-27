import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

interface LoginProps {
  onSwitchToRegister: () => void;
  onSwitchToEmployee: () => void;
}

export default function Login({
  onSwitchToRegister,
  onSwitchToEmployee,
}: LoginProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = parseInt(value, 10);

    if (!isNaN(numValue) && numValue >= 1 && numValue <= 9) {
      setUsername(`0${numValue}`);
    } else if (!isNaN(numValue) && numValue >= 10 && numValue <= 99) {
      setUsername(numValue.toString());
    } else if (numValue > 99) {
      setUsername("99");
    } else {
      setUsername(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const success = await login(username);

    if (!success) {
      setError("Usuário não encontrado");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="mb-6 flex flex-col items-center">
            <img
              src="/assets/image.png"
              className="w-16 h-16 object-contain mb-2"
            />
            <h1 className="text-4xl font-bold text-black mb-2 text-center">
              Hamburgueria
            </h1>
          </div>
          <h2 className="text-2xl font-bold text-center mb-6 text-black">
            Cardápio
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Informe sua Mesa
              </label>
              <input
                placeholder="Ex: 01"
                type="number"
                value={username}
                onChange={handleUsernameChange}
                min="1"
                max="99"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onSwitchToEmployee}
              className="block w-full text-sm text-gray-600 hover:text-black transition mb-3"
            >
              Acesso Funcionário{" "}
              <span className="font-semibold">Login Funcionário</span>
            </button>

            <button
              onClick={onSwitchToRegister}
              className="text-sm text-gray-600 hover:text-black transition"
            >
              Acesso Administrador{" "}
              <span className="font-semibold">Login Admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
