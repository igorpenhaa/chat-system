import React, { useState } from 'react';
import { User } from '../types';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [forumCode, setForumCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !forumCode.trim()) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Em produção, aqui seria feita a chamada real para a API
      // const response = await apiService.joinForum({
      //   username: name.trim(),
      //   forumCode: forumCode.trim()
      // });
      //
      // if (!response.success) {
      //   setError(response.message || 'Erro ao entrar no fórum');
      //   return;
      // }

      // Simulação para desenvolvimento
      await new Promise(resolve => setTimeout(resolve, 1000));
      onLogin({ name: name.trim(), forumCode: forumCode.trim() });
    } catch (err) {
      setError('Erro ao entrar no fórum. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-8 py-10">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Chat Fórum</h2>
              <p className="text-gray-600">Entre no fórum e comece a conversar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Seu Nome
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                  placeholder="Digite seu nome"
                  required
                />
              </div>

              <div>
                <label htmlFor="forumCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Código do Fórum
                </label>
                <input
                  type="text"
                  id="forumCode"
                  value={forumCode}
                  onChange={(e) => setForumCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800"
                  placeholder="Digite o código do fórum"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Entrando...
                  </div>
                ) : (
                  'Entrar no Fórum'
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Sistema de Chat com gRPC e Microserviços
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;