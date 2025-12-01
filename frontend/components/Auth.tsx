import React, { useState, useEffect } from 'react';
import { User } from '../types';
import api, { setAuthToken } from '../services/api';
import { LogIn, UserPlus, Wallet, Lock } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
      api.get('/auth/users/me')
        .then(response => {
          onLogin(response.data);
        })
        .catch(() => {
          localStorage.removeItem('authToken');
          setAuthToken(null);
        });
    }
  }, [onLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        const { data } = await api.post('/auth/login', formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const token = data.access_token;
        setAuthToken(token);
        localStorage.setItem('authToken', token);

        const { data: user } = await api.get('/auth/users/me');
        onLogin(user);

      } else {
        await api.post('/auth/register', { username, email, password });
        
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        const { data: loginData } = await api.post('/auth/login', formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        
        const token = loginData.access_token;
        setAuthToken(token);
        localStorage.setItem('authToken', token);
        
        const { data: user } = await api.get('/auth/users/me');
        onLogin(user);
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-600 p-3 rounded-full mb-4">
                <Wallet className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">Kanak</h2>
            <p className="text-gray-500 mt-2 text-center">Manage group expenses easily.</p>
        </div>

        <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setIsLogin(true)}
          >
            Log In
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <div className="relative">
                 <UserPlus className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                 <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors placeholder-gray-400"
                    placeholder="John Doe"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
             <div className="relative">
                 <LogIn className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors placeholder-gray-400"
                    placeholder="name@example.com"
                    required
                />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
             <div className="relative">
                 <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors placeholder-gray-400"
                    placeholder="••••••••"
                    required
                />
            </div>
          </div>

          {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-100">{error}</div>}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-lg shadow-indigo-200"
            disabled={loading}
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
};