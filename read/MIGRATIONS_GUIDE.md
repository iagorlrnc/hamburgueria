# 🗄️ Guia de Migrations - Qual Usar?

## 📋 Resumo das Migrations

Existem 3 maneiras diferentes de configurar o banco de dados, dependendo da sua situação:

---

## ✅ OPÇÃO 1: Usar APENAS a Migration Consolidada (RECOMENDADO)

### Arquivo: `20260127000002_complete_multi_role_schema.sql`

**Quando usar:**

- ✅ Você está começando do zero
- ✅ Quer tudo pronto em uma única migration
- ✅ Não quer se preocupar com ordem
- ✅ Quer setup mais simples

**O que inclui:**

- Todas as 4 tabelas (users, menu_items, orders, order_items)
- Suporte a 3 tipos de usuário (cliente, funcionário, admin)
- Todos os índices de performance
- Todas as RLS policies
- 40 itens de menu
- 3 usuários padrão

**Como usar:**

1. Ir para Supabase Dashboard
2. SQL Editor
3. Copiar TODO o conteúdo de `20260127000002_complete_multi_role_schema.sql`
4. Colar no SQL Editor
5. Executar

**Tempo:** 2 minutos
**Resultado:** Sistema 100% pronto para usar

**Recomendado para:** Novos projetos, desenvolvimento local

---

## 📚 OPÇÃO 2: Usar Todas as Migrations em Sequência

### Arquivos em Ordem:

1. `20260124000000_complete_database_schema.sql`
2. `20260125232819_fix_rls_policies.sql`
3. `20260126000000_complete_consolidated_schema.sql`
4. `20260127000000_add_employee_role.sql`
5. `20260127000001_test_data.sql` (opcional)

**Quando usar:**

- ✅ Você quer entender cada passo
- ✅ Está seguindo o histórico de desenvolvimento
- ✅ Quer implementação incremental
- ✅ Já tem migrations antigas e quer atualizar

**O que acontece:**

- Migrations 1-3 criam o schema original
- Migration 4 adiciona suporte a funcionário
- Migration 5 (opcional) adiciona dados de teste

**Como usar:**

1. Executar cada uma na ordem
2. Verificar sucesso após cada uma
3. Prosseguir para a próxima

**Tempo:** 5 minutos
**Resultado:** Sistema 100% pronto para usar

**Recomendado para:** Entender a evolução, projetos com histórico

---

## 🆚 Comparação: Qual Usar?

| Critério          | Opção 1 (Consolidada) | Opção 2 (Sequencial) |
| ----------------- | :-------------------: | :------------------: |
| Tempo setup       |       ✅ 2 min        |       ⚠️ 5 min       |
| Simplicidade      |       ✅ Máxima       |       ⚠️ Média       |
| Compreensão       |   ⚠️ Menos detalhes   |   ✅ Passo a passo   |
| Novo projeto      |        ✅✅✅         |          ⚠️          |
| Projeto existente |          ⚠️           |        ✅✅✅        |
| Dados de teste    | ⚠️ Só usuários padrão |     ✅ Inclusos      |
| Histórico         |    ⚠️ Apenas final    |     ✅ Completo      |

---

## 🎯 Minha Recomendação

### Para Desenvolvimento/Teste: **OPÇÃO 1** ✅✅✅

```
Use: 20260127000002_complete_multi_role_schema.sql
Tempo: 2 minutos
Resultado: Pronto para usar imediatamente
```

### Para Entender o Desenvolvimento: **OPÇÃO 2** ⭐

```
Use: Todas as migrations em ordem (1-5)
Tempo: 5 minutos
Resultado: Entender como o sistema evoluiu
```

---

## 📋 Checklist: O Que Incluir

### Básico (Para começar)

- [x] Tabelas (users, menu_items, orders, order_items)
- [x] RLS policies
- [x] Índices
- [x] Usuários padrão (admin, funcionario, cliente)

### Com Dados (Para testar)

- [x] Menu completo (40 itens)
- [x] Categorias (5 tipos)
- [x] Dados de teste (opcional)

### Multi-Role (Novo)

- [x] Coluna is_employee
- [x] RLS policies para funcionário
- [x] Índices de role
- [x] Usuário "funcionario" padrão

---

## 🔄 Migração de Projeto Existente

Se você já tem um projeto com as migrations antigas:

### Passo 1: Backup

```sql
-- Fazer backup dos dados
SELECT * FROM users;
SELECT * FROM orders;
SELECT * FROM menu_items;
```

### Passo 2: Executar Migration Nova

Execute apenas:

```
20260127000000_add_employee_role.sql
```

Isso adiciona:

- Coluna is_employee
- RLS policies para funcionários
- Índices novos
- Usuário "funcionario" padrão

### Passo 3: Manter Dados Antigos

Todos os dados antigos são mantidos, apenas adicionamos novas funcionalidades.

---

## ✨ Conteúdo de Cada Migration

### Migration 1: complete_database_schema.sql

- Cria tabelas base
- RLS policies básicas
- Usuários padrão (cliente, admin)
- Menu básico

### Migration 2: fix_rls_policies.sql

- Corrige policies existentes
- Muda de current_setting para auth.uid()
- Melhora de segurança

### Migration 3: complete_consolidated_schema.sql

- Consolida migrações anteriores
- Adiciona hidden column
- Adiciona payment_method e observations
- Menu completo (40 itens)

### Migration 4: add_employee_role.sql ✨ NOVO

- Coluna is_employee
- Índices de role
- RLS policies para funcionário
- Usuário "funcionario" padrão

### Migration 5: test_data.sql (Opcional)

- Usuários de teste adicionais
- Pedidos de teste
- Queries úteis
- Não é necessária

### Migration 6: complete_multi_role_schema.sql ✨ NOVO CONSOLIDADA

- TUDO junto em um arquivo
- Perfeita para novos projetos
- 1 arquivo = tudo pronto

---

## 🚀 Como Executar no Supabase

### Via Supabase Dashboard

**1. Ir para SQL Editor**

```
Supabase Dashboard → SQL Editor
```

**2. Criar Nova Query**

```
Click "New Query"
```

**3. Copiar SQL**

```
Copiar todo o conteúdo da migration
Colar no editor
```

**4. Executar**

```
Click "Run"
ou
Ctrl+Enter (ou Cmd+Enter no Mac)
```

**5. Verificar Resultado**

```
Deve exibir: "Success!"
```

---

## ✅ Verificação Após Executar

Para confirmar que tudo funcionou:

```sql
-- Verificar tabelas
SELECT * FROM information_schema.tables
WHERE table_schema = 'public';

-- Verificar usuários
SELECT username, is_admin, is_employee FROM users;

-- Verificar menu
SELECT COUNT(*) as total_items FROM menu_items;

-- Verificar índices
SELECT * FROM pg_indexes WHERE schemaname = 'public';
```

Resultado esperado:

- ✅ 4 tabelas criadas
- ✅ 3 usuários (cliente, funcionario, admin)
- ✅ 40 itens de menu
- ✅ 10+ índices

---

## 🆘 Se Algo Der Errado

### Erro: "Already exists"

```
Significa que você já executou a migration
Prossiga para o próximo passo
```

### Erro: "Permission denied"

```
Seu usuário não tem permissão
Use credenciais de admin do Supabase
```

### Erro: "Foreign key violation"

```
Tabela referenciada não existe
Certifique-se de executar em ordem
```

### Erro de SQL

```
Copie exatamente o arquivo
Não modifique nada
Exclua espaços extras
```

---

## 📱 Estrutura de Pastas

```
supabase/migrations/
│
├── 20260124000000_complete_database_schema.sql
├── 20260125232819_fix_rls_policies.sql
├── 20260126000000_complete_consolidated_schema.sql
│
├── 20260127000000_add_employee_role.sql
├── 20260127000001_test_data.sql
│
└── 20260127000002_complete_multi_role_schema.sql  ← USE ESTA!
    (consolida TUDO)
```

---

## 🎯 Passo a Passo Rápido (RECOMENDADO)

### Para Novo Projeto:

**1. Abrir Arquivo:**

```
supabase/migrations/20260127000002_complete_multi_role_schema.sql
```

**2. Copiar Todo Conteúdo**

```
Ctrl+A (Select All)
Ctrl+C (Copy)
```

**3. Supabase Dashboard**

```
- SQL Editor
- New Query
- Ctrl+V (Paste)
- Ctrl+Enter (Run)
```

**4. Pronto!** ✅

```
Sistema 100% funcional
```

**Tempo total:** 2 minutos

---

## 📊 Dados Criados

### Usuários Padrão

```
cliente / sem senha / Cliente (mesa 1-99)
funcionario / func123 / Funcionário
admin / admin123 / Administrador
```

### Menu

```
- 10 hambúrgueres
- 12 bebidas
- 7 acompanhamentos
- 5 entradas
- 6 sobremesas
Total: 40 itens
```

### Status de Pedido

```
pending ──► preparing ──► ready ──► completed
   ↓
cancelled (a qualquer momento)
```

---

## ✨ Conclusão

**Use a Migration Consolidada (`20260127000002_complete_multi_role_schema.sql`) para:**

- ✅ Novo projeto
- ✅ Setup rápido
- ✅ Sem complicações
- ✅ Tudo pronto para usar

**Tempo:** 2 minutos
**Resultado:** Sistema 100% funcional com 3 tipos de login

---

**Última atualização:** 27 de Janeiro de 2026
**Recomendação:** Use a consolidada! 🚀
