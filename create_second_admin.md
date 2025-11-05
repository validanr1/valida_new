# Criar Segundo Usuário SuperAdmin

## Opção 1: Via API (Recomendado)

Use o Postman, Insomnia ou curl:

```bash
POST https://ymuzggvvslpxaabozmck.supabase.co/functions/v1/create-super-admin
Content-Type: application/json
Authorization: Bearer SEU_TOKEN_ADMIN_ATUAL

{
  "email": "segundo-admin@dominio.com",
  "password": "SenhaSegura123!",
  "firstName": "Nome",
  "lastName": "Sobrenome"
}
```

## Opção 2: Via Console do Navegador (Mais Rápido)

1. Faça login como admin atual
2. Abra o Console (F12)
3. Cole e execute:

```javascript
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch('https://ymuzggvvslpxaabozmck.supabase.co/functions/v1/create-super-admin', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'segundo-admin@dominio.com',  // AJUSTE AQUI
      password: 'SenhaSegura123!',         // AJUSTE AQUI
      firstName: 'Nome',                    // AJUSTE AQUI
      lastName: 'Sobrenome'                 // AJUSTE AQUI
    })
  });
  
  const data = await response.json();
  console.log('Resultado:', data);
})();
```

## Opção 3: Via SQL Direto (Mais Técnico)

Execute no Supabase SQL Editor:

```sql
-- 1. Criar usuário no auth.users (ajuste o email e UUID)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  'segundo-admin@dominio.com',
  crypt('SenhaSegura123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated'
) RETURNING id;

-- 2. Copie o ID retornado e use nos próximos comandos
-- Substitua USER_ID_AQUI pelo ID retornado acima

-- 3. Criar perfil
INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  role_profile_id
) VALUES (
  'USER_ID_AQUI',
  'Nome',
  'Sobrenome',
  (SELECT id FROM role_profiles WHERE name = 'SuperAdmin' LIMIT 1)
);
```

---

## Qual opção prefere?
- **Opção 2** é a mais rápida (Console do navegador)
- **Opção 1** é a mais profissional (API)
- **Opção 3** é a mais técnica (SQL direto)
