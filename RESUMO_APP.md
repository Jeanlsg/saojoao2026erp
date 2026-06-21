# Resumo e Checklist de Funcionalidades do Aplicativo

Este documento descreve detalhadamente o funcionamento atual do sistema **Favorito Supermercado**, separando a experiência do cliente final (`Frontend`) dos recursos do administrador (`Backend/Painel`).

## 🏬 1. Visão do Cliente (Loja Virtual)

O aplicativo foi projetado com uma interface *mobile-first*, focado em compras rápidas e navegação fluída.

### 🏠 Acesso e Navegação Principal
- [x] **Página Inicial Dinâmica**: Carrossel de banners de alta conversão, faixas de combos/ofertas em destaque, e navegação clara por categorias.
- [x] **Navegação Inferior (Mobile)**: Botões flutuantes para otimizar navegação em celulares, incluindo acesso unificado à tela Inicial, Categorias, Loja/Rotas, Carrinho e **Jornais/Ofertas**.
- [x] **Cabeçalho com Logo Integrada**: A logo oficial do mercado centralizada, juntamente com o carrinho dinâmico no topo direito.

### 🛍️ Produtos, Categorias e Jornais
- [x] **Busca de Produtos**: Sistema de barra de busca para encontrar itens de maneira responsiva.
- [x] **Filtros por Categoria**: Separação visual com ícones (Bebidas, Hortifruti, Mercearia, Padaria, Frios, etc.).
- [x] **Vitrine de "Jornal" (Ofertas)**: Encartes digitais (`/ofertas`) simulando jornais do mundo físico, com validação de datas, alertas de estoque e lista das ofertas contidas nele.

### 🛒 Carrinho e Fechamento (Checkout)
- [x] **Menu Lateral Interativo**: Ao acionar o carrinho, ele desliza na tela contendo todos os controles do pedido (alterar quantidades e excluir).
- [x] **Autenticação Padrão**: Login ou Cadastro integrado no Checkout. Captura segura de Nome, CPF e Senha.
- [x] **Opções de Recebimento**: Escolha entre retirar no mercado ou entrega a domicílio.
- [x] **Cálculo de Frete**: Embutido com base nos raios ou taxas pré-definidas pelo logista.

---

## ⚙️ 2. Visão do Administrador (Painel Gerencial)

A administração localiza-se na rota `/admin` e está restrita para usuários com cargo de *Admin*.

### 📊 Dashboard e Controle Visual
- [x] **Métricas em Tempo Real**: Contador de Vendas, Resumo Financeiro, Quantidade de Produtos Ativos e monitoramento imediato de Pedidos Novos.
- [x] **Painel Responsivo**: Menu lateral no desktop, redimensionado inteligentemente para resoluções menores.

### 📦 Controle de Estoque e Catálogo
- [x] **Gestão Completa de Produtos**: Cadastrar, excluir e alterar imagens, preços cruciais e nomeclaturas com facilidade.
- [x] **Gestão de Estoques Visível**: Tabela exclusiva de contagem de prateleira ("Estoque Baixo" destacado em cores críticas).
- [x] **Edição de Categorias**: Criação flexível de novos *corredores* da loja, selecionando os próprios emojis/ícones ilustrativos.

### 💸 Promoções e Marketing
- [x] **Novo Gerador de Jornais Mágico**: Permite agrupar blocos de produtos que simulam "encartes físicos". Possui a ferramenta de **Regra de Preço Automática** (ao precificar na formação do encarte, o produto atualiza seu preço promocional em todo o e-commerce ao mesmo tempo).
- [x] **Módulo de Combos**: Criação de Kits ("Cesta Básica", "Churrasco") forçando o cliente a levar múltiplos itens agregados por um desconto específico.
- [x] **Gestão de Cupons (Descontos)**: Cadastros genéricos de cupons alfanuméricos visando oferecer frete grátis ou X% de corte na compra do cliente.

### 🚚 Logística e Recebimentos
- [x] **Controle Central de Entregas (Frete)**: Painel para cadastrar quilometragens/tarifas fixas para que o sistema saiba tributar as devidas taxas na hora do checkout.
- [x] **Monitor de Pedidos**: Painel do operador do caixa/separador, exibindo todas as ordens efetuadas, os dados impressos dos clientes, detalhes das quantias exatas e controle do *status* (Pendente -> Em andamento -> Finalizado).

---

## 🚧 Status das Integrações Tecnológicas
- **Supabase**: Atuando como Banco de Dados e Módulo de Autenticação (cadastro e login integrados perfeitamente).
- **Vite/React TypeScript**: Interface veloz sob demanda contendo os estados e transições de página fluidas.

Este artefato reflete o ecossistema ativo neste presente momento e pode vir a ter novidades conforme novas evoluções foram criadas.
