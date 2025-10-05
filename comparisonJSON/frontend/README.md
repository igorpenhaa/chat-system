# Forum Chat Frontend

Frontend moderno para o sistema de chat distribuído com gRPC e microserviços.

## 🚀 Tecnologias Utilizadas

- **React 18** com TypeScript
- **Vite** para build e desenvolvimento
- **Tailwind CSS** para estilização
- **Hooks customizados** para gerenciamento de estado
- **Sistema de tempo real** com polling/WebSocket
- **Notificações do navegador**

## 📁 Estrutura do Projeto

```
src/
├── components/           # Componentes React
│   ├── LoginForm.tsx    # Tela de login/registro
│   ├── ChatRoom.tsx     # Sala de chat principal
│   ├── MessageBubble.tsx # Componente de mensagem
│   ├── MessageInput.tsx # Input para enviar mensagens
│   └── LoadingSpinner.tsx # Componente de loading
├── hooks/               # Hooks customizados
│   ├── useMessages.ts   # Gerenciamento de mensagens
│   └── useRealTimeConnection.ts # Conexão em tempo real
├── services/            # Serviços de API
│   └── api.ts          # Cliente HTTP para comunicação com backend
├── types/              # Definições TypeScript
│   └── index.ts        # Interfaces e tipos
├── App.tsx             # Componente principal
├── main.tsx            # Ponto de entrada
└── index.css           # Estilos globais com Tailwind
```

## 🛠️ Instalação

1. **Pré-requisitos**:
   ```bash
   # Instalar Node.js 20+ (recomendado usar nvm)
   nvm use 20
   ```

2. **Instalar dependências**:
   ```bash
   npm install
   ```

3. **Iniciar servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

4. **Build para produção**:
   ```bash
   npm run build
   ```

## 🌐 Funcionalidades

### ✅ Implementadas

- **Tela de Login**: Interface para inserir nome de usuário e código do fórum
- **Chat em Tempo Real**: Interface moderna para troca de mensagens
- **Sistema de Notificações**: Notificações do navegador para novas mensagens
- **Status de Conexão**: Indicador visual de conectividade
- **Verificação de Mensagens**: Sistema de aprovação de conteúdo
- **Design Responsivo**: Interface adaptável para diferentes dispositivos
- **Animações Suaves**: Transições e efeitos visuais modernos

### 🔧 Configuração de API

O frontend está preparado para integração com o backend gRPC. No arquivo `src/services/api.ts`, configure a URL base:

```typescript
const API_BASE_URL = 'http://localhost:8080/api';
```

### 📡 Comunicação em Tempo Real

O sistema implementa:
- **Polling HTTP** para simulação (desenvolvimento)
- **WebSocket ready** para produção (comentado no código)
- **Notificações push** do navegador
- **Indicadores visuais** de status de mensagem

### 🎨 Personalização

O design utiliza Tailwind CSS com:
- **Gradientes modernos** para backgrounds e botões
- **Cores personalizadas** configuradas em `tailwind.config.js`
- **Componentes reutilizáveis** com design system consistente
- **Suporte a dark/light mode** (pode ser implementado)

## 🔗 Integração com Backend

O frontend está preparado para se comunicar com:

1. **gRPC Stub (P)** - Servidor central em C++
2. **gRPC Server (A)** - Servidor de mensagens em JavaScript
3. **gRPC Server (B)** - Servidor de verificação em Python

### Endpoints Esperados

```
POST /api/forum/join        # Entrar no fórum
POST /api/messages/send     # Enviar mensagem
GET  /api/messages          # Buscar mensagens
GET  /api/forum/:code       # Informações do fórum
```

## 🚀 Deploy

Para deploy em produção:

1. Configure as variáveis de ambiente
2. Ajuste a URL da API no arquivo `api.ts`
3. Execute `npm run build`
4. Sirva os arquivos da pasta `dist/`

## 📱 Responsividade

A interface é totalmente responsiva com:
- **Mobile-first design**
- **Breakpoints otimizados** para tablet e desktop
- **Touch-friendly** para dispositivos móveis
- **Keyboard navigation** para acessibilidade

---

**Desenvolvido para o projeto PSPD - Sistemas Distribuídos com gRPC**
