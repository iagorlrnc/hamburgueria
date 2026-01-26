import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';

interface LoginProps {
  onSwitchToRegister: () => void;
}

export default function Login({ onSwitchToRegister }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(username, password);

    if (!success) {
      setError('Usuário ou senha incorretos');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">ALL BLACK</h1>
          <p className="text-gray-400">Hamburgueria Premium</p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="flex items-center justify-center mb-6">
            <LogIn className="w-8 h-8 text-black" />
          </div>

          <h2 className="text-2xl font-bold text-center mb-6 text-black">Login</h2>

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
			  	placeholder='Ex: Mesa01'
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
			  	placeholder='1234'
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onSwitchToRegister}
              className="text-sm text-gray-600 hover:text-black transition"
            >
              Não tem uma conta? <span className="font-semibold">Cadastre-se</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
