# 💻 Guia SQL - Sistema Multi-Role

## Como Usar Este Guia

Este documento contém todos os comandos SQL úteis para gerenciar o sistema multi-role.

---

## 📋 Índice

1. [Verificar Estrutura](#verificar-estrutura)
2. [Queries Úteis](#queries-úteis)
3. [Inserir/Atualizar Usuários](#inserirautualizar-usuários)
4. [Gerenciar Pedidos](#gerenciar-pedidos)
5. [Análise de Dados](#análise-de-dados)
6. [Troubleshooting](#troubleshooting)

---

## Verificar Estrutura

### Listar Colunas da Tabela Users

```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

**Resultado esperado:**

```
id                    | uuid        | false  | gen_random_uuid()
username              | text        | false  | null
email                 | text        | false  | null
phone                 | text        | false  | null
password_hash         | text        | false  | null
is_admin              | boolean     | false  | false
is_employee           | boolean     | false  | false  ← NOVO
created_at            | timestamptz | true   | now()
```

### Verificar Índices

```sql
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'users'
ORDER BY indexname;
```

**Resultado esperado:**

```
idx_users_is_admin     | CREATE INDEX ... ON users(is_admin)
idx_users_is_employee  | CREATE INDEX ... ON users(is_employee)  ← NOVO
idx_users_roles        | CREATE INDEX ... ON users(is_admin, is_employee)  ← NOVO
pk_users               | (constraint principal)
```

---

## Queries Úteis

### 1. Contar Usuários por Tipo

```sql
SELECT
  CASE
    WHEN is_admin THEN 'Admin'
    WHEN is_employee THEN 'Funcionário'
    ELSE 'Cliente'
  END as tipo,
  COUNT(*) as quantidade
FROM users
GROUP BY is_admin, is_employee
ORDER BY tipo;
```

**Resultado esperado:**

```
Admin         | 2
Cliente       | 10
Funcionário   | 3
```

### 2. Listar Todos os Usuários com Tipo

```sql
SELECT
  username,
  email,
  phone,
  CASE
    WHEN is_admin THEN 'Admin'
    WHEN is_employee THEN 'Funcionário'
    ELSE 'Cliente'
  END as tipo,
  created_at
FROM users
ORDER BY created_at DESC;
```

### 3. Verificar Integridade de Roles

```sql
SELECT
  username,
  is_admin,
  is_employee,
  CASE
    WHEN is_admin AND is_employee THEN '❌ ERRO: Admin + Funcionário'
    WHEN is_admin THEN '✅ Admin'
    WHEN is_employee THEN '✅ Funcionário'
    ELSE '✅ Cliente'
  END as status
FROM users
ORDER BY username;
```

### 4. Listar Apenas Funcionários

```sql
SELECT
  username,
  email,
  phone,
  created_at
FROM users
WHERE is_employee = true AND is_admin = false
ORDER BY created_at DESC;
```

### 5. Listar Apenas Admins

```sql
SELECT
  username,
  email,
  phone,
  created_at
FROM users
WHERE is_admin = true
ORDER BY created_at DESC;
```

### 6. Listar Apenas Clientes

```sql
SELECT
  username,
  email,
  phone,
  created_at
FROM users
WHERE is_admin = false AND is_employee = false
ORDER BY created_at DESC;
```

---

## Inserir/Atualizar Usuários

### Criar Novo Cliente

```sql
INSERT INTO users (username, email, phone, password_hash, is_admin, is_employee)
VALUES
  ('mesa06', 'mesa06@allblack.com', '11999999996', '123456', false, false)
ON CONFLICT (username) DO NOTHING;
```

### Criar Novo Funcionário

```sql
INSERT INTO users (username, email, phone, password_hash, is_admin, is_employee)
VALUES
  ('func_new', 'func_new@allblack.com', '11999888888', 'senha123', false, true)
ON CONFLICT (username) DO NOTHING;
```

### Criar Novo Admin

```sql
INSERT INTO users (username, email, phone, password_hash, is_admin, is_employee)
VALUES
  ('admin_new', 'admin_new@allblack.com', '11999777777', 'admin123', true, false)
ON CONFLICT (username) DO NOTHING;
```

### Promover Cliente para Funcionário

```sql
UPDATE users
SET is_employee = true, is_admin = false
WHERE username = 'mesa01';

-- Verificar
SELECT username, is_admin, is_employee FROM users WHERE username = 'mesa01';
```

### Promover Cliente para Admin

```sql
UPDATE users
SET is_admin = true, is_employee = false
WHERE username = 'mesa02';

-- Verificar
SELECT username, is_admin, is_employee FROM users WHERE username = 'mesa02';
```

### Remover Permissão de Funcionário

```sql
UPDATE users
SET is_employee = false
WHERE username = 'func_teste';

-- Verificar
SELECT username, is_admin, is_employee FROM users WHERE username = 'func_teste';
```

### Remover Permissão de Admin

```sql
UPDATE users
SET is_admin = false
WHERE username = 'admin_teste';

-- Verificar
SELECT username, is_admin, is_employee FROM users WHERE username = 'admin_teste';
```

### Atualizar Senha de Usuário

```sql
-- NÃO fazer assim (texto claro):
-- UPDATE users SET password_hash = 'nova_senha' WHERE username = 'xxx';

-- FAZER assim (no código, via função):
-- const hashedPassword = await bcrypt.hash(newPassword, 10);
-- UPDATE users SET password_hash = $1 WHERE username = $2

-- OU usar função Supabase:
SELECT crypt('nova_senha', gen_salt('bf'));
-- Depois copiar hash gerado:
UPDATE users SET password_hash = '$2a$...' WHERE username = 'xxx';
```

### Deletar Usuário

```sql
DELETE FROM users
WHERE username = 'usuario_remover';

-- Verificar
SELECT COUNT(*) FROM users WHERE username = 'usuario_remover';
```

---

## Gerenciar Pedidos

### Listar Pedidos Pendentes

```sql
SELECT
  o.id,
  u.username as cliente,
  o.table_number as mesa,
  o.total,
  o.created_at
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending' AND o.hidden != true
ORDER BY o.created_at DESC;
```

### Listar Pedidos por Status

```sql
SELECT
  o.status,
  COUNT(*) as quantidade,
  SUM(o.total) as total_vendas
FROM orders o
WHERE o.hidden != true
GROUP BY o.status
ORDER BY
  CASE
    WHEN o.status = 'pending' THEN 1
    WHEN o.status = 'preparing' THEN 2
    WHEN o.status = 'ready' THEN 3
    WHEN o.status = 'completed' THEN 4
    WHEN o.status = 'cancelled' THEN 5
  END;
```

### Atualizar Status do Pedido

```sql
-- Mover de pending para preparing
UPDATE orders
SET status = 'preparing'
WHERE id = 'uuid-do-pedido';

-- Mover de preparing para ready
UPDATE orders
SET status = 'ready'
WHERE id = 'uuid-do-pedido';

-- Mover de ready para completed
UPDATE orders
SET status = 'completed'
WHERE id = 'uuid-do-pedido';

-- Cancelar pedido
UPDATE orders
SET status = 'cancelled'
WHERE id = 'uuid-do-pedido';
```

### Listar Pedidos de Cliente Específico

```sql
SELECT
  o.id,
  o.table_number,
  o.status,
  o.total,
  o.created_at
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.username = 'mesa01'
ORDER BY o.created_at DESC;
```

### Ver Detalhes de Pedido

```sql
SELECT
  o.id as order_id,
  u.username as cliente,
  o.table_number as mesa,
  o.status,
  o.total,
  o.payment_method,
  o.observations,
  o.created_at
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.id = 'uuid-do-pedido';

-- Ver itens do pedido
SELECT
  m.name as item,
  oi.quantity,
  oi.price as preco_unitario,
  (oi.quantity * oi.price) as subtotal
FROM order_items oi
JOIN menu_items m ON oi.menu_item_id = m.id
WHERE oi.order_id = 'uuid-do-pedido'
ORDER BY oi.created_at;
```

---

## Análise de Dados

### Receita Total do Dia

```sql
SELECT
  DATE(created_at) as data,
  COUNT(*) as num_pedidos,
  SUM(total) as receita_total,
  ROUND(AVG(total), 2) as ticket_medio
FROM orders
WHERE DATE(created_at) = CURRENT_DATE
  AND status != 'cancelled'
  AND hidden != true
GROUP BY DATE(created_at);
```

### Top 10 Itens Mais Vendidos

```sql
SELECT
  m.name,
  m.category,
  SUM(oi.quantity) as quantidade,
  ROUND(SUM(oi.quantity * oi.price)::numeric, 2) as faturamento
FROM order_items oi
JOIN menu_items m ON oi.menu_item_id = m.id
JOIN orders o ON oi.order_id = o.id
WHERE DATE(o.created_at) = CURRENT_DATE
  AND o.status != 'cancelled'
GROUP BY m.id, m.name, m.category
ORDER BY quantidade DESC
LIMIT 10;
```

### Clientes Mais Frequentes

```sql
SELECT
  u.username,
  COUNT(o.id) as num_pedidos,
  SUM(o.total) as gasto_total,
  ROUND(AVG(o.total)::numeric, 2) as ticket_medio,
  MAX(o.created_at) as ultimo_pedido
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.is_admin = false
  AND u.is_employee = false
  AND o.hidden != true
GROUP BY u.id, u.username
ORDER BY num_pedidos DESC
LIMIT 10;
```

### Receita por Forma de Pagamento

```sql
SELECT
  payment_method,
  COUNT(*) as num_pedidos,
  ROUND(SUM(total)::numeric, 2) as total,
  ROUND(AVG(total)::numeric, 2) as ticket_medio
FROM orders
WHERE status != 'cancelled' AND hidden != true
GROUP BY payment_method
ORDER BY total DESC;
```

### Desempenho de Funcionários (por atualizações)

```sql
-- Nota: Sistema não rastreia qual funcionário atualizou
-- Mas você pode criar um log manualmente:
SELECT
  u.username,
  COUNT(o.id) as pedidos_processados
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.is_employee = true
  AND o.status IN ('preparing', 'ready', 'completed')
  AND DATE(o.created_at) = CURRENT_DATE
GROUP BY u.id, u.username
ORDER BY pedidos_processados DESC;
```

---

## Troubleshooting

### Problema: "Usuário não consegue fazer login como funcionário"

```sql
-- Verificar se é_employee = true e is_admin = false
SELECT username, is_admin, is_employee
FROM users
WHERE username = 'nome_funcionario';

-- Se is_admin = true, remover:
UPDATE users
SET is_admin = false
WHERE username = 'nome_funcionario';
```

### Problema: "Funcionário não vê os pedidos"

```sql
-- Verificar se is_employee = true
SELECT username, is_admin, is_employee
FROM users
WHERE username = 'nome_funcionario';

-- Se is_employee = false, fazer:
UPDATE users
SET is_employee = true, is_admin = false
WHERE username = 'nome_funcionario';
```

### Problema: "Um usuário é admin E funcionário ao mesmo tempo"

```sql
-- Procurar violações
SELECT username, is_admin, is_employee
FROM users
WHERE is_admin = true AND is_employee = true;

-- Corrigir (deixar apenas como admin):
UPDATE users
SET is_employee = false
WHERE is_admin = true AND is_employee = true;
```

### Problema: "Pedido sumiu do sistema"

```sql
-- Verificar se é hidden = true
SELECT id, status, hidden FROM orders WHERE id = 'uuid';

-- Se hidden = true, restaurar:
UPDATE orders SET hidden = false WHERE id = 'uuid';
```

### Problema: "Consulta lenta de usuários"

```sql
-- Verificar índices
SELECT * FROM pg_stat_user_indexes
WHERE relname = 'users';

-- Se não tiver índices, criar:
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_is_employee ON users(is_employee);
CREATE INDEX IF NOT EXISTS idx_users_roles ON users(is_admin, is_employee);
```

---

## Dicas de Performance

### Usar EXPLAIN para análise

```sql
EXPLAIN ANALYZE
SELECT * FROM users
WHERE is_employee = true
ORDER BY created_at DESC;
```

### Monitorar queries lentas

```sql
SELECT
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Otimizar queries com limite

```sql
-- ❌ Lento
SELECT * FROM orders
WHERE status = 'pending';

-- ✅ Rápido
SELECT * FROM orders
WHERE status = 'pending'
LIMIT 100;
```

---

## Scripts de Manutenção

### Backup de Dados

```bash
# Via CLI Supabase
supabase db pull

# Via pg_dump (se tiver acesso ao servidor)
pg_dump postgresql://user:password@host:5432/database > backup.sql
```

### Limpeza de Pedidos Antigos (após 90 dias)

```sql
-- Ver quantos serão deletados
SELECT COUNT(*) FROM orders
WHERE hidden = true
AND created_at < now() - interval '90 days';

-- Deletar
DELETE FROM orders
WHERE hidden = true
AND created_at < now() - interval '90 days';
```

### Sincronizar Roles (certificar exclusividade)

```sql
-- Remover admin de quem tem ambos os papéis
UPDATE users
SET is_admin = false
WHERE is_admin = true AND is_employee = true;

-- Remover funcionário de admins que precisam ser só admin
UPDATE users
SET is_employee = false
WHERE is_admin = true AND is_employee = true;
```

---

## Estrutura de Dados em JSON

### Exemplo de Usuário Cliente

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "01",
  "email": "mesa01@allblack.com",
  "phone": "11999999991",
  "password_hash": "$2a$10$...",
  "is_admin": false,
  "is_employee": false,
  "created_at": "2026-01-27T10:00:00Z"
}
```

### Exemplo de Usuário Funcionário

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "username": "funcionario",
  "email": "funcionario@allblack.com",
  "phone": "11988888888",
  "password_hash": "$2a$10$...",
  "is_admin": false,
  "is_employee": true,
  "created_at": "2026-01-27T10:00:00Z"
}
```

### Exemplo de Usuário Admin

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "username": "admin",
  "email": "admin@allblack.com",
  "phone": "11977777777",
  "password_hash": "$2a$10$...",
  "is_admin": true,
  "is_employee": false,
  "created_at": "2026-01-27T10:00:00Z"
}
```

---

**Última atualização:** 27 de Janeiro de 2026
**Versão:** 1.0
