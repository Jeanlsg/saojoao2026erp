import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const termsContent = `
# TERMOS DE USO — Arraiá da Escola Raul Pompéia

**Versão:** 1.0.0 | **Última atualização:** 27 de maio de 2025

---

## 1. Aceitação dos Termos

Ao usar o Arraiá da Escola Raul Pompéia, você concorda com estes Termos de Uso. Se não concordar, não utilize o aplicativo.

---

## 2. Descrição do Serviço

O Arraiá da Escola Raul Pompéia é um aplicativo da Festa Junina da Escola Raul Pompéia (Arraiá), realizado em Petrolina - PE. Permite navegar pelo cardápio típico, fazer pedidos de comidas, bebidas, lanches e brinquedos, e acompanhar a entrega.

**Horário de entregas:** Segunda a sábado, das 7h às 19h.

---

## 3. Cadastro e Conta

Para fazer pedidos, você deve:
- Ter pelo menos 18 anos
- Fornecer informações verdadeiras (nome, CPF, telefone, endereço)
- Manter seus dados atualizados

**Você é responsável** por manter sua senha segura e por todas as atividades em sua conta.

---

## 4. Pedidos e Entrega

### 4.1 Como funciona
1. Selecione os produtos
2. Adicione ao carrinho
3. Escolha forma de pagamento
4. Confirme o pedido
5. Aguarde a confirmação

### 4.2 Tempo de preparo
Pedidos são preparados em até45 minutos após confirmação.

### 4.3 Cancelamento
- **Antes do preparo:** gratuito
- **Após iniciado:** não é possível cancelar

### 4.4 Taxa de entrega
Varre conforme a distância. Consulte no app antes de finalizar.

---

## 5. Preços e Pagamentos

Aceitamos:
- Cartão de crédito/débito
- PIX
- Dinheiro (na entrega)

Parcelamento em até 3x sem juros (valores acima de R$ 50,00).

---

## 6. Devoluções

Você pode solicitar devolução quando:
- Produto diferente do solicitado
- Produto danificado
- Produto fora da validade

**Não aceitamos** devolução de produtos perecíveis fora da validade, abertos ou sem embalagem original.

---

## 7. Uso Proibido

Você concorda **NÃO**:
- Usar dados falsos ou de terceiros
- Fraudar para obter descontos
- Revender produtos comprados
- Comportamento agressivo com funcionários
- Tentar acessar contas de outros usuários
- Usar bots ou scripts automatizados

---

## 8. Propriedade Intelectual

Todo conteúdo do app (textos, logos, design, código) é propriedade da Escola Raul Pompéia / organização do Arraiá. É proibido copiar, reproduzir ou criar derivados.

---

## 9. Limitação de Responsabilidade

O app é fornecido "como está". Não garantimos acesso ininterrupto ou livre de erros.

Não somos responsáveis por:
- Danos indiretos ou consequenciais
- Falhas de fornecedores terceiros
- Atrasos por força maior

---

## 10. Lei Aplicável

Estes termos são regidos pelas leis do Brasil. Controversias serão resolvidas preferencialmente por negociação, depois mediação, e finalmente pelo foro do consumidor.

---

## 11. Contato

**E-mail:** contato@arraiaraul.pompeia
**WhatsApp:** (87) 99999-9999

Para questões de privacidade: **privacidade@arraiaraul.pompeia**
`;

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-40 bg-card shadow-sm border-b border-border">
        <div className="container flex items-center gap-2 pt-1 pb-3">
          <BackButton to="/perfil" />
          <h1 className="text-lg font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" /> Termos de Uso
          </h1>
        </div>
      </header>

      <main className="container py-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Arraiá da Escola Raul Pompéia</CardTitle>
            <p className="text-sm text-muted-foreground">Versão 1.0.0 •27 de maio de 2025</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <div className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {termsContent}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
