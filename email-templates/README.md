# Templates de E-mail

Este diretório contém os templates HTML para os e-mails transacionais da plataforma.

## 📧 Template: Welcome Email (Boas-Vindas)

**Arquivo:** `welcome-email.html`

### Quando é enviado?
- Quando um novo parceiro é criado no sistema
- Após o admin criar a conta do parceiro

### Variáveis disponíveis:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `{{platform_name}}` | Nome da plataforma | Valida NR1 |
| `{{first_name}}` | Primeiro nome do responsável | João |
| `{{last_name}}` | Sobrenome do responsável | Silva |
| `{{partner_name}}` | Nome da empresa parceira | Empresa XYZ Ltda |
| `{{activation_link}}` | Link para página de ativação | https://app.validanr1.com/partner/ativacao |
| `{{theme_primary}}` | Cor primária do tema (hex) | #667eea |
| `{{theme_secondary}}` | Cor secundária do tema (hex) | #764ba2 |
| `{{logo_url}}` | URL do logo da plataforma | https://... |
| `{{temp_password}}` | Texto sobre senha temporária | (enviada no email de convite) |
| `{{year}}` | Ano atual | 2024 |

### Link de Ativação

O link de ativação (`{{activation_link}}`) aponta para a rota `/partner/ativacao` da aplicação.

**Como funciona:**
1. O parceiro recebe o email de boas-vindas com o link
2. Ao clicar, é direcionado para a página de ativação
3. A página verifica automaticamente o status da conta usando o `user_id` da sessão
4. Quando o admin ativar a conta, o parceiro pode acessar o sistema

**Formato do link:**
```
https://[dominio]/partner/ativacao
```

**Exemplo:**
```
https://app.validanr1.com/partner/ativacao
```

**Nota:** O link não precisa de parâmetros adicionais, pois a autenticação é feita via sessão do Supabase após o parceiro definir sua senha no email de convite.

### Fluxo completo:

1. **Admin cria parceiro** → Sistema envia 2 emails:
   - Email de boas-vindas (este template) com link de ativação
   - Email de convite do Supabase para definir senha

2. **Parceiro define senha** → Clica no link do Supabase e cria sua senha

3. **Parceiro faz login** → Acessa `/partner/ativacao` automaticamente

4. **Admin ativa conta** → Parceiro é redirecionado para o dashboard

### Como usar no admin:

1. Acesse `/admin/configuracoes`
2. Vá na aba "E-mails"
3. Selecione o template "Boas-vindas"
4. Cole o conteúdo de `welcome-email.html`
5. Salve o template

### Testando o template:

No admin, você pode enviar um email de teste para verificar como ficará a renderização final com suas cores e logo personalizados.

---

## 🎨 Personalização

Os templates usam as cores e logo configurados em:
- `/admin/configuracoes` → Aba "Geral" (logo)
- `/admin/configuracoes` → Aba "E-mails" (cores do tema)

### Cores padrão:
- **Primary:** `#667eea` (azul/roxo)
- **Secondary:** `#764ba2` (roxo escuro)

### Responsividade:

Todos os templates são responsivos e se adaptam automaticamente para:
- Desktop (600px+)
- Tablet (600px)
- Mobile (<600px)

---

## 📝 Outros Templates

Você pode criar templates adicionais para:
- **Ativação completa** (`activation_complete`)
- **Suspensão** (`suspension`)
- **Reativação** (`reactivation`)
- **Inativação** (`inactivation`)
- **Lembretes** (`reminder`)

Cada template deve seguir a mesma estrutura e usar as variáveis apropriadas para seu contexto.
