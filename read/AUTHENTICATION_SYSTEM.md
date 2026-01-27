# 🍔 All Black Hamburgueria - Sistema de Autenticação Multi-Role

## 📋 Visão Geral

Este projeto implementa um **sistema de autenticação de três papéis (roles)** para uma plataforma de pedidos de hamburgueria:

1. **Cliente (Table)** - Acesso para fazer pedidos
2. **Funcionário (Employee)** - Acesso para gerenciar pedidos
3. **Administrador (Admin)** - Acesso total ao sistema

## 🔐 Sistema de Autenticação

### 1. Login de Cliente

**Rota:** `/`

- **Campo obrigatório:** Número de mesa (1-99)
- **Formatação automática:**
  - Entrada: `1` → Conversão: `01`
  - Entrada: `25` → Mantém: `25`
  - Entrada: `99` → Mantém: `99`
- **Sem senha:** Apenas número de mesa (identifica a mesa de comensais)
- **Acesso:** Dashboard de pedidos com menu categorizado

**Código de autenticação (Login.tsx):**

```tsx
const handleLogin = async () => {
  const paddedUsername = parseInt(username).toString().padStart(2, "0");
  const response = await login(paddedUsername, undefined, false);
};
```

### 2. Login de Funcionário

**Rota:** "Acesso Funcionário" (botão na tela de login de cliente)

- **Campos obrigatórios:**
  - Username (nome/ID do funcionário)
  - Password (senha)
- **Sem conta?** Botão para acessar tela de Admin Login
- **Acesso:** Dashboard de gerenciamento de pedidos

**Código de autenticação (EmployeeLogin.tsx):**

```tsx
const handleLogin = async () => {
  const { success, error } = await login(username, password, true);
  // isEmployee = true
};
```

### 3. Login de Admin

**Rota:** "Acesso Admin" (botão na tela de login de cliente)

- **Dois modos:**
  - **Login:** Username + Password (para admins existentes)
  - **Registro:** Criar nova conta admin com verificação de admin existente

**Código de autenticação (AdminLogin.tsx):**

```tsx
const handleRegisterAdmin = async () => {
  // Verifica se admin existente com sua senha valida o novo admin
  const { success } = await login(adminUsername, adminPassword, false);

  // Depois insere novo admin
  await supabase.from("users").insert({
    username: newAdminData.username,
    email: newAdminData.email,
    phone: newAdminData.phone,
    password_hash: newAdminData.password,
    is_admin: true,
    is_employee: false,
  });
};
```

## 👥 Tipos de Usuário

### Cliente

```
is_admin = false
is_employee = false
```

- ✅ Visualiza menu categorizado
- ✅ Faz pedidos
- ✅ Acompanha status do pedido
- ❌ Não gerencia outros usuários
- ❌ Não acessa painel admin

### Funcionário

```
is_admin = false
is_employee = true
```

- ✅ Visualiza todos os pedidos
- ✅ Atualiza status: pending → preparing → ready → completed
- ✅ Gerencia status dos pedidos em tempo real
- ❌ Não pode criar/editar menu
- ❌ Não pode gerenciar usuários

### Administrador

```
is_admin = true
is_employee = false
```

- ✅ Acesso total ao painel admin
- ✅ Gerencia menu (criar, editar, desativar itens)
- ✅ Visualiza dashboard com estatísticas
- ✅ Gerencia usuários (criar, alterar roles, deletar)
- ✅ Visualiza e gerencia todos os pedidos
- ✅ Pode criar novos admins
- ✅ Pode criar funcionários

**Nota importante:** Roles são **mutuamente exclusivas**. Um usuário **NÃO pode ser admin E funcionário ao mesmo tempo**.

## 🗄️ Estrutura do Banco de Dados

### Tabela `users`

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  password_hash text NOT NULL,
  is_admin boolean DEFAULT false,
  is_employee boolean DEFAULT false,  -- NOVO campo adicionado
  created_at timestamptz DEFAULT now()
);
```

### Usuários Padrão (Criados automaticamente)

| Username    | Email                    | Password | is_admin | is_employee | Tipo        |
| ----------- | ------------------------ | -------- | -------- | ----------- | ----------- |
| cliente     | cliente@allblack.com     | 123456   | false    | false       | Cliente     |
| funcionario | funcionario@allblack.com | func123  | false    | true        | Funcionário |
| admin       | admin@allblack.com       | admin123 | true     | false       | Admin       |

## 🔄 Fluxo de Navegação

```
┌─────────────────┐
│   Tela Inicial  │
│   (Login)       │
└────────┬────────┘
         │
    ┌────┴────┬─────────────┐
    │          │             │
    ▼          ▼             ▼
┌────────┐ ┌──────────┐ ┌─────────┐
│ Cliente│ │Funcionário│ │  Admin  │
└────┬───┘ └────┬─────┘ └────┬────┘
     │          │            │
     ▼          ▼            ▼
┌─────────────────────────────────┐
│   CustomerOrder      │ EmployeeDashboard │ AdminDashboard │
│   (Fazer Pedidos)    │ (Gerenciar Status) │ (Tudo)        │
└─────────────────────────────────┘
```

### Roteamento em App.tsx

```tsx
if (!user) {
  // Não autenticado
  return <Login />;
} else if (user.is_admin) {
  // Administrador
  return <AdminDashboard />;
} else if (user.is_employee) {
  // Funcionário
  return <EmployeeDashboard />;
} else {
  // Cliente
  return <CustomerOrder />;
}
```

## 📊 Painel do Cliente (CustomerOrder)

### Recursos

- ✅ Menu organizado por categorias
- ✅ Categorias: Hambúrguer, Bebidas, Acompanhamento, Entrada, Sobremesa
- ✅ Filtro por categoria
- ✅ Visualização de preços
- ✅ Carrinho de compras
- ✅ Checkout com múltiplas opções de pagamento

### Categorias de Menu

```javascript
const categories = [
  "hamburguer", // Burgers artesanais (10 itens)
  "bebidas", // Bebidas variadas (12 itens)
  "acompanhamento", // Acompanhamentos (7 itens)
  "entrada", // Entradas/Aperitivos (5 itens)
  "sobremesa", // Sobremesas (6 itens)
];
```

### Fluxo de Pedido

1. Selecionar itens do menu
2. Adicionar ao carrinho
3. Revisar pedido e total
4. Escolher forma de pagamento
5. Adicionar observações (opcional)
6. Confirmar pedido
7. Pedido aparece como "pending" no sistema

## 👨‍💼 Painel do Funcionário (EmployeeDashboard)

### Recursos

- ✅ Lista de todos os pedidos não cancelados
- ✅ Atualização em tempo real (polling a cada 3 segundos)
- ✅ Status progressivo: pending → preparing → ready → completed
- ✅ Visualização detalhada de itens do pedido
- ✅ Total do pedido

### Estados do Pedido

```
pending (Amarelo)
  ↓
preparing (Azul)
  ↓
ready (Verde)
  ↓
completed (Cinza)
```

### Funcionalidades

- Visualizar todos os pedidos
- Clicar em pedido para ver detalhes completos
- Atualizar status clicando em botões de transição
- Filtrar automaticamente pedidos não cancelados

## 🛠️ Painel Admin (AdminDashboard)

### Abas Disponíveis

#### 1. Dashboard

- 📊 Estatísticas do dia (pedidos, receita)
- 📈 Status dos pedidos (pipeline)
- 🍔 Itens mais vendidos
- 📋 Pedidos recentes
- 🧹 Botão para limpar todos os dados

#### 2. Editar Menu

- ➕ Adicionar novos itens
- ✏️ Editar itens existentes
- 🗑️ Deletar itens
- ❌ Desativar/Ativar itens
- 📁 Gerenciar categorias
- Itens organizados por categoria

#### 3. Desativados

- 👀 Visualizar itens desativados
- 🔄 Reativar itens
- Layout em grid com opacidade reduzida

#### 4. Pedidos

- 📦 Todos os pedidos agrupados por cliente
- 🔄 Atualizar status do pedido
- ❌ Cancelar pedidos
- 👁️ Visualizar detalhes completos
- 🧾 Forma de pagamento e observações

#### 5. Usuários (NOVO)

- ➕ Criar novo usuário
- **Tipo de usuário:** Cliente, Funcionário ou Administrador
- 👤 Lista de todos os usuários
- 🔐 Toggle admin (fazer/remover admin)
- 🎯 Toggle funcionário (fazer/remover funcionário) **[NOVO]**
- 🗑️ Deletar usuário

### Criar Novo Usuário

```tsx
{
  username: "string",      // Nome do usuário
  phone: "string",         // Telefone
  password: "string",      // Senha
  is_admin: boolean,       // True = Admin, False = Não admin
  is_employee: boolean     // True = Funcionário, False = Não funcionário
}
```

**Lógica de exclusividade:**

- Se `is_admin = true` → automaticamente `is_employee = false`
- Se `is_employee = true` → automaticamente `is_admin = false`
- Default: `is_admin = false` e `is_employee = false` (Cliente)

## 🔐 Políticas de Row-Level Security (RLS)

Todas as tabelas têm RLS habilitado com políticas específicas por role:

### Clientes

- ✅ Visualizam itens de menu ativos
- ✅ Podem criar seus próprios pedidos
- ✅ Visualizam seus próprios pedidos

### Funcionários

- ✅ Visualizam todos os pedidos
- ✅ Podem atualizar status dos pedidos
- ❌ Não podem deletar dados
- ❌ Não podem ver menu detalhado para edição

### Administradores

- ✅ Acesso total a todas as tabelas
- ✅ Podem ler e modificar usuários
- ✅ Podem gerenciar menu completo
- ✅ Podem gerenciar todos os pedidos

## 📁 Estrutura de Arquivos

```
src/
├── App.tsx                          # Roteamento principal
├── contexts/
│   └── AuthContext.tsx              # Autenticação multi-role
├── lib/
│   └── supabase.ts                  # Cliente Supabase + tipos
└── pages/
    ├── Login.tsx                    # Login de cliente (número de mesa)
    ├── AdminLogin.tsx               # Login/Registro de admin
    ├── EmployeeLogin.tsx            # Login de funcionário
    ├── CustomerOrder.tsx            # Dashboard de cliente
    ├── EmployeeDashboard.tsx        # Dashboard de funcionário
    └── AdminDashboard.tsx           # Painel admin

supabase/
└── migrations/
    ├── 20260124000000_complete_database_schema.sql
    ├── 20260125232819_fix_rls_policies.sql
    ├── 20260126000000_complete_consolidated_schema.sql
    └── 20260127000000_add_employee_role.sql   # NOVO
```

## 🚀 Como Usar

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Supabase

- Criar projeto Supabase
- Copiar URL e Key para arquivo `.env`
- Executar migrations na ordem:
  1. `20260124000000_complete_database_schema.sql`
  2. `20260125232819_fix_rls_policies.sql`
  3. `20260126000000_complete_consolidated_schema.sql`
  4. `20260127000000_add_employee_role.sql` **[NOVO]**

### 3. Iniciar Desenvolvimento

```bash
npm run dev
```

### 4. Acessar Aplicação

- **URL:** http://localhost:5175
- **Cliente:** Username: 1-99 (número de mesa)
- **Funcionário:** Username: `funcionario` | Password: `func123`
- **Admin:** Username: `admin` | Password: `admin123`

## 🧪 Testando o Sistema

### Teste 1: Login de Cliente

1. Ir para http://localhost:5175
2. Digitar mesa: `1` (vira `01`)
3. Clicar em Entrar
4. ✅ Deve ver menu categorizado

### Teste 2: Login de Funcionário

1. Ir para http://localhost:5175
2. Clicar "Acesso Funcionário"
3. Username: `funcionario` | Password: `func123`
4. ✅ Deve ver dashboard com pedidos
5. ✅ Deve conseguir atualizar status

### Teste 3: Login de Admin

1. Ir para http://localhost:5175
2. Clicar "Acesso Admin"
3. Username: `admin` | Password: `admin123`
4. ✅ Deve ver painel admin completo
5. ✅ Deve conseguir gerenciar usuários

### Teste 4: Criar Novo Funcionário

1. Fazer login como admin
2. Ir para aba "Usuários"
3. Clicar "Adicionar Usuário"
4. Preenchir dados e selecionar tipo "Funcionário"
5. ✅ Deve aparecer na lista com badge "Funcionário" azul
6. ✅ Novo funcionário deve conseguir fazer login

### Teste 5: Mudar Role de Usuário

1. No painel de Usuários (Admin)
2. Clicar "Tornar Func" para cliente virar funcionário
3. ✅ Deve mudar is_employee para true
4. ✅ Deve mudar is_admin para false (exclusividade)

## 📝 Variáveis de Ambiente

Criar arquivo `.env.local`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

## 🔄 Fluxos de Negócio

### Fluxo 1: Cliente Faz Pedido

```
1. Cliente acessa com mesa (01-99)
2. Visualiza menu categorizado
3. Seleciona itens
4. Faz checkout
5. Pedido criado com status "pending"
6. Funcionário vê pedido em Dashboard
7. Funcionário atualiza status
8. Cliente vê atualização em tempo real (se tiver em aberto)
```

### Fluxo 2: Admin Cria Funcionário

```
1. Admin faz login
2. Vai para aba "Usuários"
3. Clica "Adicionar Usuário"
4. Seleciona tipo "Funcionário"
5. Funcionário é criado no banco
6. Novo funcionário consegue fazer login
7. Novo funcionário vê dashboard de pedidos
```

### Fluxo 3: Admin Promove Cliente

```
1. Cliente criado como "Cliente" (is_admin=false, is_employee=false)
2. Admin abre aba "Usuários"
3. Admin clica "Tornar Func" no cliente
4. Sistema atualiza: is_employee=true, is_admin=false
5. Cliente consegue fazer login como funcionário
6. Cliente vê agora dashboard de pedidos
```

## 🎯 Regras Importantes

| Ação               | Cliente  | Funcionário | Admin |
| ------------------ | -------- | ----------- | ----- |
| Ver Menu           | ✅       | ❌          | ✅    |
| Fazer Pedido       | ✅       | ❌          | ❌    |
| Ver Pedidos        | Próprios | Todos       | Todos |
| Atualizar Status   | ❌       | ✅          | ✅    |
| Editar Menu        | ❌       | ❌          | ✅    |
| Gerenciar Usuários | ❌       | ❌          | ✅    |
| Criar Admin        | ❌       | ❌          | ✅    |
| Criar Funcionário  | ❌       | ❌          | ✅    |

## 🛡️ Segurança

### Autenticação

- ✅ Senhas hasheadas no banco
- ✅ Validação server-side no Supabase
- ✅ RLS em todas as tabelas
- ✅ Roles exclusivos (não pode ser admin E funcionário)

### Autorização

- ✅ RLS bloqueia acessos não autorizados
- ✅ Funcionários só veem orders (não usuários)
- ✅ Clientes só veem menu ativo
- ✅ Admins têm controle total

### Integridade de Dados

- ✅ Soft delete em pedidos (hidden column)
- ✅ Índices em colunas de role para performance
- ✅ Constraints de unique em username/email
- ✅ Foreign keys com ON DELETE CASCADE

## 📱 Tecnologias Utilizadas

- **Frontend:** React 18 + TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL)
- **Autenticação:** Custom + Supabase RLS
- **UI Components:** Lucide React (ícones)
- **Notificações:** React Toastify
- **State Management:** React Context

## 🤝 Suporte

Para dúvidas sobre o sistema:

1. Verificar README.md
2. Verificar migrations SQL
3. Revisar código de autenticação em `AuthContext.tsx`
4. Checar políticas RLS em migration mais recente

---

**Última atualização:** 27 de Janeiro de 2026
**Versão:** 2.0 (Multi-Role Sistema)
