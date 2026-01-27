# 🔧 Documentação Técnica - Sistema Multi-Role

## Resumo das Alterações

Este documento detalha todas as mudanças técnicas implementadas para suportar o sistema de autenticação de três papéis (Cliente, Funcionário, Admin).

---

## 1. Banco de Dados

### Migration: `20260127000000_add_employee_role.sql`

**Mudanças principais:**

```sql
-- Novo campo na tabela users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_employee boolean DEFAULT false;

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_is_employee ON users(is_employee);
CREATE INDEX IF NOT EXISTS idx_users_roles ON users(is_admin, is_employee);
```

**Novos usuários padrão:**

```sql
INSERT INTO users (username, email, phone, password_hash, is_admin, is_employee)
VALUES ('funcionario', 'funcionario@allblack.com', '0000000000', 'func123', false, true)
```

**Novas políticas RLS:**

```sql
-- Funcionários podem ver todos os pedidos
CREATE POLICY "Employees can view all orders"
  ON orders FOR SELECT
  USING ((SELECT is_employee FROM users WHERE id = auth.uid()) = true);

-- Funcionários podem atualizar status dos pedidos
CREATE POLICY "Employees can update order status"
  ON orders FOR UPDATE
  USING ((SELECT is_employee FROM users WHERE id = auth.uid()) = true);
```

---

## 2. Contexto de Autenticação

### Arquivo: `src/contexts/AuthContext.tsx`

**Interface User atualizada:**

```typescript
interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  is_admin?: boolean;
  is_employee?: boolean; // NOVO
}
```

**Função login atualizada:**

```typescript
async function login(
  username: string,
  password?: string,
  isEmployee: boolean = false, // NOVO parâmetro
): Promise<{ success: boolean; error?: string }> {
  // Query diferentes baseado no tipo de login:

  // Cliente (sem senha)
  if (!password && !isEmployee) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("is_admin", false)
      .eq("is_employee", false)
      .single();
  }

  // Funcionário (com senha + flag)
  if (password && isEmployee) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("is_employee", true)
      .eq("is_admin", false)
      .single();
    // Verificar senha
  }

  // Admin (com senha)
  if (password && !isEmployee) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("is_admin", true)
      .single();
    // Verificar senha
  }
}
```

---

## 3. Telas de Login

### Cliente: `src/pages/Login.tsx`

**Formatação de número de mesa:**

```typescript
const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;

  if (value === "") {
    setUsername("");
  } else {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= 99) {
      setUsername(num.toString().padStart(2, "0"));
    }
  }
};
```

**Botões de navegação:**

```tsx
<button onClick={onSwitchToEmployee}>
  Acesso Funcionário
</button>
<button onClick={onSwitchToAdmin}>
  Acesso Admin
</button>
```

### Funcionário: `src/pages/EmployeeLogin.tsx` (NOVO)

```typescript
const handleLogin = async () => {
  const { success, error } = await login(username, password, true);
  //                                                        ↑ isEmployee = true
  if (success) {
    navigate("/dashboard"); // Redireciona para EmployeeDashboard
  }
};
```

### Admin: `src/pages/AdminLogin.tsx`

**Dois modos de operação:**

**Modo Login (admin existente):**

```typescript
const handleLogin = async () => {
  const { success } = await login(adminUsername, adminPassword, false);
  if (success) {
    setIsLogin(false); // Muda para modo register
  }
};
```

**Modo Registro (novo admin):**

```typescript
const handleRegisterAdmin = async () => {
  // 1. Valida admin existente
  const { success } = await login(
    existingAdminUsername,
    existingAdminPassword,
    false,
  );

  if (success) {
    // 2. Cria novo admin
    const { error } = await supabase.from("users").insert({
      username: newAdmin.username,
      email: newAdmin.email,
      phone: newAdmin.phone,
      password_hash: newAdmin.password,
      is_admin: true, // Novo admin
      is_employee: false, // Nunca é funcionário
    });
  }
};
```

---

## 4. Dashboards

### Cliente: `src/pages/CustomerOrder.tsx`

**Sem mudanças principais** (já funciona com autenticação de cliente)

**Recurso existente - Agrupamento por categoria:**

```typescript
const groupedItems = filteredItems.reduce((acc, item) => {
  if (!acc[item.category]) {
    acc[item.category] = [];
  }
  acc[item.category].push(item);
  return acc;
}, {} as Record<string, MenuItem[]>);

// Renderizar categorias
Object.entries(groupedItems).map(([category, items]) => (
  <div key={category}>
    <h3>{category.replace(/\b\w/g, l => l.toUpperCase())}</h3>
    {/* renderizar itens */}
  </div>
))
```

### Funcionário: `src/pages/EmployeeDashboard.tsx` (NOVO)

**Query de pedidos:**

```typescript
const fetchOrders = async () => {
  const { data } = await supabase
    .from("orders")
    .select(
      `
      *,
      users(username),
      order_items(
        *,
        menu_items(*)
      )
    `,
    )
    .neq("status", "cancelled") // Filtra pedidos cancelados
    .order("created_at", { ascending: false });
};
```

**Atualizar status:**

```typescript
const handleUpdateStatus = async (orderId: string, newStatus: string) => {
  await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);

  fetchOrders(); // Recarrega lista
};
```

**Polling em tempo real:**

```typescript
useEffect(() => {
  fetchOrders();
  const interval = setInterval(fetchOrders, 3000); // A cada 3 segundos
  return () => clearInterval(interval);
}, []);
```

### Admin: `src/pages/AdminDashboard.tsx`

**Nova função - Toggle Employee:**

```typescript
const handleToggleEmployee = async (
  userId: string,
  currentEmployee: boolean,
) => {
  if (
    confirm(
      `Deseja ${currentEmployee ? "remover" : "conceder"} permissão de funcionário?`,
    )
  ) {
    await supabase
      .from("users")
      .update({
        is_employee: !currentEmployee,
        is_admin: false, // Força exclusividade
      })
      .eq("id", userId);

    fetchUsers();
  }
};
```

**Novo campo no formulário:**

```typescript
const [userFormData, setUserFormData] = useState({
  username: "",
  phone: "",
  password: "",
  is_admin: false,
  is_employee: false, // NOVO
});
```

**Salvar novo usuário:**

```typescript
const handleSaveUser = async (e: React.FormEvent) => {
  await supabase.from("users").insert({
    username: userFormData.username,
    email: generateEmail(userFormData.username),
    phone: userFormData.phone,
    password_hash: userFormData.password,
    is_admin: userFormData.is_admin,
    is_employee: userFormData.is_employee, // NOVO
  });
};
```

**Select de tipo de usuário:**

```tsx
<select
  value={
    userFormData.is_admin
      ? "admin"
      : userFormData.is_employee
        ? "employee"
        : "cliente"
  }
  onChange={(e) => {
    if (e.target.value === "admin") {
      setUserFormData({ ...userFormData, is_admin: true, is_employee: false });
    } else if (e.target.value === "employee") {
      setUserFormData({ ...userFormData, is_admin: false, is_employee: true });
    } else {
      setUserFormData({ ...userFormData, is_admin: false, is_employee: false });
    }
  }}
>
  <option value="cliente">Cliente</option>
  <option value="employee">Funcionário</option>
  <option value="admin">Administrador</option>
</select>
```

**Coluna de funcionário na tabela:**

```tsx
<td className="px-4 py-3">
  <span
    className={`px-2 py-1 rounded text-xs font-semibold ${
      user.is_employee
        ? "bg-blue-100 text-blue-800"
        : "bg-gray-100 text-gray-800"
    }`}
  >
    {user.is_employee ? "Sim" : "Não"}
  </span>
</td>
```

**Botão "Tornar Func":**

```tsx
<button
  onClick={() => handleToggleEmployee(user.id, user.is_employee)}
  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm"
>
  {user.is_employee ? "Remover Func" : "Tornar Func"}
</button>
```

---

## 5. Roteamento Principal

### Arquivo: `src/App.tsx`

**Lógica de navegação:**

```typescript
return (
  <>
    {!user ? (
      <Login
        onSwitchToEmployee={() => setShowEmployeeLogin(true)}
        onSwitchToAdmin={() => setShowAdminLogin(true)}
      />
    ) : showEmployeeLogin ? (
      <EmployeeLogin />
    ) : showAdminLogin ? (
      <AdminLogin />
    ) : user.is_admin ? (
      <AdminDashboard />
    ) : user.is_employee ? (
      <EmployeeDashboard />
    ) : (
      <CustomerOrder />
    )}
  </>
);
```

**Prioridade de roteamento:**

1. Admin > Funcionário > Cliente
2. Se `is_admin = true` → vai para AdminDashboard
3. Senão se `is_employee = true` → vai para EmployeeDashboard
4. Senão → vai para CustomerOrder (Cliente)

---

## 6. Tipos TypeScript

### Arquivo: `src/lib/supabase.ts`

```typescript
interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  is_admin?: boolean;
  is_employee?: boolean; // NOVO
  created_at?: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  active: boolean;
  created_at: string;
}

interface Order {
  id: string;
  user_id: string;
  table_number: number;
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  total: number;
  payment_method?: string;
  observations?: string;
  hidden?: boolean;
  created_at: string;
  order_items?: OrderItem[];
}

interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  menu_items?: MenuItem;
}
```

---

## 7. Fluxo de Dados

### Quando cliente faz login:

```
Usuario digita mesa (ex: 1)
        ↓
Padding: 1 → "01"
        ↓
Query: SELECT * FROM users WHERE username = "01" AND is_admin = false AND is_employee = false
        ↓
Se encontra → seta user no context
        ↓
App.tsx vê is_admin=false e is_employee=false
        ↓
Renderiza <CustomerOrder />
```

### Quando funcionário faz login:

```
Usuario digita username e password
        ↓
Clica "Acesso Funcionário"
        ↓
Query: SELECT * FROM users WHERE username = X AND is_employee = true AND is_admin = false
        ↓
Valida password
        ↓
Se válido → seta user no context com is_employee=true
        ↓
App.tsx vê is_employee=true
        ↓
Renderiza <EmployeeDashboard />
```

### Quando admin faz login:

```
Usuario digita username e password
        ↓
Clica "Acesso Admin"
        ↓
Query: SELECT * FROM users WHERE username = X AND is_admin = true
        ↓
Valida password
        ↓
Se válido → seta user no context com is_admin=true
        ↓
App.tsx vê is_admin=true
        ↓
Renderiza <AdminDashboard />
```

---

## 8. Tratamento de Erros

### Login com falha:

```typescript
try {
  const { success, error } = await login(username, password, isEmployee);

  if (!success) {
    toast.error(error || "Credenciais inválidas");
  }
} catch (error) {
  toast.error("Erro ao fazer login");
}
```

### Criar usuário duplicado:

```typescript
// Supabase retorna erro de unique constraint
if (error?.code === "23505") {
  // Unique violation
  toast.error("Usuário já existe");
}
```

### Sem permissão:

```typescript
// RLS bloqueia query
if (error?.code === "42501") {
  // Permission denied
  toast.error("Você não tem permissão para isso");
}
```

---

## 9. Performance

### Índices criados:

```sql
CREATE INDEX idx_users_is_admin ON users(is_admin);
CREATE INDEX idx_users_is_employee ON users(is_employee);
CREATE INDEX idx_users_roles ON users(is_admin, is_employee);
```

### Benefícios:

- ✅ Queries de login mais rápidas
- ✅ Filtros por role otimizados
- ✅ RLS policies executam faster

### Polling otimizado:

```typescript
// Em vez de WebSocket (caro), usa polling a cada 3s
useEffect(() => {
  const interval = setInterval(fetchOrders, 3000);
  return () => clearInterval(interval);
}, []);
```

---

## 10. Segurança

### Validação de entrada:

```typescript
// Cliente: apenas números 1-99
if (!/^\d{1,2}$/.test(username) || parseInt(username) > 99) {
  toast.error("Número de mesa inválido");
}

// Admin/Funcionário: required fields
if (!username || !password) {
  toast.error("Preencha todos os campos");
}
```

### Exclusividade de roles:

```typescript
// Quando torna funcionário, remove admin
is_employee: !currentEmployee,
is_admin: false  // ← Garante exclusividade

// Quando torna admin, remove funcionário
is_admin: !currentAdmin,
is_employee: false  // ← Garante exclusividade
```

### RLS policies:

```sql
-- Funcionários só veem orders, nunca usuários
CREATE POLICY "Employees can view all orders"
  ON orders FOR SELECT
  USING ((SELECT is_employee FROM users WHERE id = auth.uid()) = true);

-- Clientes só veem orders próprios
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (user_id = auth.uid());
```

---

## 11. Testes Recomendados

### Unit Tests:

```typescript
test("login cliente com mesa 1 → padroniza para 01", async () => {
  const { success } = await login("1", undefined, false);
  expect(success).toBe(true);
});

test("login funcionário com is_employee=true", async () => {
  const { success } = await login("funcionario", "func123", true);
  expect(success).toBe(true);
});

test("não permite admin + funcionário simultâneos", async () => {
  // Tenta criar user com ambos os flags
  // Deve falhar ou corrigir automaticamente
});
```

### Integration Tests:

```typescript
test("Cliente faz pedido → Funcionário vê → Atualiza status", async () => {
  // 1. Login cliente
  // 2. Fazer pedido
  // 3. Login funcionário
  // 4. Ver pedido
  // 5. Atualizar status
  // 6. Verificar mudança
});
```

---

## 12. Troubleshooting

| Problema                         | Causa                                      | Solução                               |
| -------------------------------- | ------------------------------------------ | ------------------------------------- |
| Login cliente não funciona       | Número não é 1-99 ou username não existe   | Verificar formatação e dados no DB    |
| Funcionário não vê pedidos       | RLS policy bloqueando ou is_employee=false | Verificar is_employee na DB e RLS     |
| Admin não consegue criar usuário | Falta permissão ou unique violation        | Verificar RLS e se username já existe |
| Pedidos duplicados               | is_admin=true E is_employee=true           | Corrigir constraint ou lógica         |
| Polling muito lento              | Interval de 3s grande demais               | Reduzir para 1s (cuidado com quota)   |

---

**Última atualização:** 27 de Janeiro de 2026
