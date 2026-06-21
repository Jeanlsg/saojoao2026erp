# Checklist de Validação — Favorito Supermercado

> Documento de homologação do app. Marque cada item com `[x]` à medida que validar em produção.
> Última atualização: 01/05/2026

---

## I. Visão do Cliente (Aplicativo / Loja)

### 1. Catálogo Digital e Navegação
- [x] A interface do catálogo exibe corretamente o portfólio de produtos
  <!-- src/pages/Index.tsx + src/components/store/ProductCard.tsx (grid agrupado por categoria) -->
- [x] A navegação e amostragem dos produtos funcionam de forma interativa (busca, filtro por categoria, scroll de combos)
  <!-- SearchBar (src/components/store/SearchBar.tsx), CategoryBar (CategoryBar.tsx), ComboSection (ComboSection.tsx) -->

### 2. Autenticação e Perfil do Comprador
- [x] Login Social via conta Google funcionando corretamente
  <!-- AuthContext.signInWithGoogle (src/contexts/AuthContext.tsx:80) usando supabase.auth.signInWithOAuth({provider:"google"}) -->
- [x] Banco de dados salva nome, e-mail, telefone e endereço de entrega
  <!-- Tabela profiles (full_name, phone, address, cpf_cnpj, avatar_url) — src/pages/Profile.tsx grava via supabase -->
- [x] Sistema armazena o histórico de compras do usuário
  <!-- src/pages/MyOrders.tsx lê orders por user_id; pedidos persistem o user_id no insert (CartDrawer) -->
- [x] Preenchimento automático (auto-fill) de dados e endereços ativo em compras futuras
  <!-- CartDrawer pré-preenche customerName/customerPhone a partir de profile (CartDrawer.tsx:46-48) -->

### 3. Checkout e Intenção de Pagamento
- [x] Usuário consegue selecionar o método de pagamento ao final do pedido
  <!-- CartDrawer paymentMethod: dinheiro / pix / crédito / débito (CartDrawer.tsx:285-304) -->
- [x] **Regra Crítica:** o app NÃO possui gateway/processador de pagamento interno (sem cobrança real de cartão/PIX dentro do app)
  <!-- handleFinalize só faz INSERT em orders + abre WhatsApp; não há integração de gateway -->
- [x] Fluxo de checkout funciona como "balcão de escolha" e registro de intenção de compra
  <!-- Pedido entra com status="pendente" e dispara mensagem WhatsApp para a loja -->

### 4. Acompanhamento de Entregas (Tracking)
- [x] Painel do cliente exibe o status atual do pedido
  <!-- MyOrders.tsx StatusTimeline (Pendente -> Preparando -> Entregue) -->
- [x] Mudança de status (ex.: Pendente ➔ Preparando ➔ Entregue) reflete em tempo real conforme ação do admin
  <!-- Canal supabase channel("my-orders-{userId}") com filter user_id=eq.{user.id} (MyOrders.tsx:83-98) -->

### 5. Cálculo de Frete
- [x] App calcula o valor do frete com base no endereço do cliente
  <!-- supabase function calculate-route (Google Distance Matrix) + AdminContext.calculateFreight via freight_ranges -->
- [x] Valor do frete é somado corretamente ao total do pedido/romaneio
  <!-- CartDrawer grandTotal = priceAfterUserDiscount + freightValue (CartDrawer.tsx:117) -->

---

## II. Visão Sistêmica e Administrativa (Painel do Lojista)

### 6. Controle de Estoque e Baixa Automática
- [x] Módulo de inventário restrito apenas a administradores/lojistas
  <!-- Rota /admin protegida via ProtectedRoute requireAdmin (App.tsx:54-60) + checkAdmin via tabela user_roles -->
- [x] Painel permite visualizar e gerenciar todos os itens do estoque
  <!-- src/pages/admin/Inventory.tsx (busca, ajuste +/-, status crítico/baixo/normal) -->
- [x] Estoque é reduzido automaticamente assim que o cliente finaliza a compra
  <!-- Trigger trg_orders_stock + função handle_order_stock (migration 20260501182842) baixa em INSERT -->
- [x] Catálogo na visão do cliente é atualizado imediatamente após a baixa
  <!-- ALTER PUBLICATION supabase_realtime ADD TABLE products + AdminContext escuta UPDATE em products -->

### 7. Gerenciamento de Pedidos
- [x] Dashboard recebe novos pedidos corretamente
  <!-- src/pages/admin/Orders.tsx + canal "orders-realtime" no AdminContext + som/toast/auto-print -->
- [x] Lojista consegue configurar aceite automático de pedidos
  <!-- src/pages/admin/Settings.tsx — flag store_settings.auto_accept_orders; AdminContext promove pendente->preparando -->
- [x] Lojista consegue gerenciar e aceitar pedidos 100% manualmente
  <!-- Select de status em Orders.tsx por pedido (pendente/preparando/entregue/cancelado) -->

### 8. Gerador de Encartes Promocionais
- [x] Módulo de criação de jornais de ofertas virtuais funcional
  <!-- src/pages/admin/Flyers.tsx (CRUD) + FlyerCard.tsx (renderização) + FlyerSection na home -->
- [x] Gabaritos nativos respeitam a identidade visual definida
  <!-- FlyerCard usa paleta fixa: fundo #1a3a6e, destaque #ffd700, preço #cc0000 -->
- [ ] Logomarca do "Favorito" aplicada é a versão congelada/validada (data-base 10/04/2026)
  <!-- PENDENTE: hoje só há texto "Favorito Supermercado" hard-coded; não foi localizado asset de logomarca versionado/congelado em /public ou /src/assets. Validar com design e incluir o arquivo oficial. -->

---

## III. Infraestrutura Técnica e Integrações

### 9. Arquitetura e Banco de Dados
- [x] Backend configurado na infraestrutura Supabase (BaaS)
  <!-- src/integrations/supabase/client.ts + supabase/config.toml + 13 migrations -->
- [x] Banco de dados relacional operando corretamente
  <!-- Tabelas: profiles, user_roles, products, categories, combos, orders, freight_ranges, discount_rules, flyers, store_settings -->
- [x] Eventos e atualizações em tempo real (status de pedido, baixa de estoque) funcionando
  <!-- Realtime publication adiciona orders, products e store_settings; canais ativos em AdminContext e MyOrders -->

### 10. Integração de APIs do Google
- [x] Google Auth integrado sem erros de permissão
  <!-- supabase.auth.signInWithOAuth({provider:"google"}) — AuthContext.tsx:86 -->
- [x] Google Maps Platform integrado (geolocalização e rotas)
  <!-- supabase/functions/calculate-route/index.ts: Google Geocoding + Distance Matrix com GOOGLE_MAPS_API_KEY -->
- [x] Cálculo de frete consumindo distância/rota do Google Maps adequadamente
  <!-- distanceKm/durationMin retornados pelo Distance Matrix alimentam calculateFreight no AdminContext -->

---

## Resumo de Progresso

| Seção | Itens | Concluídos |
|-------|-------|------------|
| I. Visão do Cliente | 13 | 13 |
| II. Visão Administrativa | 10 | 9 |
| III. Infraestrutura | 6 | 6 |
| **Total** | **29** | **28** |

---

## Observações / Pendências

- **Item 8.3 — Logomarca congelada (10/04/2026):** o app referencia "Favorito Supermercado" apenas como texto em StoreHeader, FlyerCard, OrderReceipt, DeliverySlip, etc. Não há um asset de logomarca versionado em `public/` ou `src/assets/`. É necessário receber e commitar a versão validada (PNG/SVG) e usá-la nesses pontos para fechar o item.
- Itens das pastas `android/` e `ios/` (build nativo Capacitor) **não foram auditados** nesta revisão — verificar splash, ícones, permissions e config nativa em validação dedicada.
- Aceite automático: ao ativar a flag, o pedido entra como `pendente` e em ~500ms é promovido para `preparando` (AdminContext); a baixa de estoque acontece já no INSERT (trigger), independente da flag — comportamento esperado e documentado em `Settings.tsx`.
- Pagamento: confirmar com o cliente se o conjunto atual (dinheiro/pix/crédito/débito) cobre 100% das opções operacionais antes da homologação final.
