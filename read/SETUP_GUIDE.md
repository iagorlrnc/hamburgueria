# 🚀 Guia de Instalação Rápida

## Pré-requisitos

- Node.js 16+ instalado
- Conta Supabase (https://supabase.com)
- Git instalado

## Passo 1: Clonar/Preparar Projeto

```bash
cd /home/igor/Documents/allblacklast/project
npm install
```

## Passo 2: Configurar Variáveis de Ambiente

Criar arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

**Como obter as chaves:**

1. Ir para https://app.supabase.com
2. Selecionar seu projeto
3. Ir para Settings → API
4. Copiar URL e anon key

## Passo 3: Configurar Banco de Dados

### Via Supabase Dashboard

1. Ir para SQL Editor
2. Executar migrations na ordem:

```sql
-- 1. Executar:
-- supabase/migrations/20260124000000_complete_database_schema.sql

-- 2. Executar:
-- supabase/migrations/20260125232819_fix_rls_policies.sql

-- 3. Executar:
-- supabase/migrations/20260126000000_complete_consolidated_schema.sql

-- 4. Executar (NOVO):
-- supabase/migrations/20260127000000_add_employee_role.sql

-- 5. (Opcional) Executar dados de teste:
-- supabase/migrations/20260127000001_test_data.sql
```

### Via CLI Supabase (se tiver instalado)

```bash
supabase migration up
```

## Passo 4: Iniciar Servidor

```bash
npm run dev
```

Será exibido:

```
  ➜  Local:   http://localhost:5175/
```

## Passo 5: Testar Logins

### Teste 1: Cliente (Mesa)

- URL: http://localhost:5175
- Digite: `1` (será convertido para `01`)
- Clique: "Entrar"
- ✅ Deve ver menu categorizado

### Teste 2: Funcionário

- URL: http://localhost:5175
- Clique: "Acesso Funcionário"
- Username: `funcionario`
- Password: `func123`
- ✅ Deve ver dashboard com pedidos

### Teste 3: Admin

- URL: http://localhost:5175
- Clique: "Acesso Admin"
- Username: `admin`
- Password: `admin123`
- ✅ Deve ver painel admin completo

## Passo 6: Testar Criar Novo Usuário

1. Login como admin (veja Teste 3 acima)
2. Ir para aba "Usuários"
3. Clicar "Adicionar Usuário"
4. Preencher:
   - Nome: `novo_func`
   - Telefone: `11999999999`
   - Senha: `senha123`
   - Tipo: Selecionar "Funcionário"
5. Clicar "Adicionar Usuário"
6. ✅ Deve aparecer na lista como funcionário
7. Fazer logout e testar login com novo usuário

## Estrutura de Pastas

```
.
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx              # Sistema de autenticação
│   ├── lib/
│   │   └── supabase.ts                  # Cliente e tipos
│   ├── pages/
│   │   ├── Login.tsx                    # Cliente
│   │   ├── EmployeeLogin.tsx            # Funcionário
│   │   ├── AdminLogin.tsx               # Admin
│   │   ├── CustomerOrder.tsx            # Dashboard cliente
│   │   ├── EmployeeDashboard.tsx        # Dashboard funcionário
│   │   └── AdminDashboard.tsx           # Dashboard admin
│   ├── App.tsx                          # Roteamento
│   └── main.tsx                         # Entrada
│
├── supabase/
│   └── migrations/                      # SQL migrations
│       ├── 20260124000000_...
│       ├── 20260125232819_...
│       ├── 20260126000000_...
│       ├── 20260127000000_... (NOVO)
│       └── 20260127000001_... (Teste)
│
├── AUTHENTICATION_SYSTEM.md             # Documentação principal (NOVO)
├── TECHNICAL_DOCUMENTATION.md           # Documentação técnica (NOVO)
├── SETUP_GUIDE.md                       # Este arquivo
├── package.json
├── vite.config.ts
├── tsconfig.json
└── .env.local                           # Variáveis de ambiente
```

## Dados Padrão

Após executar as migrations, estes usuários estarão disponíveis:

| Username    | Senha    | Tipo        | Uso                 |
| ----------- | -------- | ----------- | ------------------- |
| cliente     | (sem)    | Cliente     | Login com mesa 1-99 |
| funcionario | func123  | Funcionário | Gerenciar pedidos   |
| admin       | admin123 | Admin       | Gerenciar tudo      |
| func_teste  | teste123 | Funcionário | Dados de teste      |
| admin_teste | admin123 | Admin       | Dados de teste      |

## Troubleshooting Comum

### ❌ "Cannot read property 'from' of undefined"

- **Causa:** Supabase não está configurado
- **Solução:** Verificar `.env.local` e variáveis SUPABASE_URL/KEY

### ❌ "users table not found"

- **Causa:** Migrations não foram executadas
- **Solução:** Ir para Supabase SQL Editor e executar migrations

### ❌ "Username already exists"

- **Causa:** Tentando criar user que já existe
- **Solução:** Usar outro nome ou deletar o user anterior

### ❌ "Invalid login credentials"

- **Causa:** Username ou password incorretos
- **Solução:** Verificar credenciais na tabela users

### ❌ "RLS policy violation"

- **Causa:** Usuário sem permissão para acessar recurso
- **Solução:** Verificar is_admin/is_employee no banco

## Comandos Úteis

```bash
# Instalar dependências
npm install

# Iniciar servidor dev
npm run dev

# Build para produção
npm run build

# Verificar tipos TypeScript
npx tsc --noEmit

# Ver logs do Supabase
supabase logs
```

## Próximos Passos

1. ✅ Sistema funcionando
2. Customizar menu para sua hamburgueria
3. Adicionar mais funcionários
4. Configurar Supabase com domínio próprio
5. Fazer deploy (Vercel, Netlify, etc)

## Contato/Suporte

Consulte os arquivos de documentação:

- **AUTHENTICATION_SYSTEM.md** - Sistema de autenticação e papéis
- **TECHNICAL_DOCUMENTATION.md** - Detalhes técnicos de código

---

**Última atualização:** 27 de Janeiro de 2026
