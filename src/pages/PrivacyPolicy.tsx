import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

const privacyContent = `
# POLÍTICA DE PRIVACIDADE — Arraiá da Escola Raul Pompéia

**Versão:** 1.0.0 | **Última atualização:** 27 de maio de 2025

---

## 1. Introdução

Respeitamos sua privacidade. Esta política explica quais dados coletamos, como os usamos e seus direitos, em conformidade com a LGPD (Lei nº 13.709/2018).

---

## 2. Dados que Coletamos

### 2.1 Você fornece:
- Nome, CPF, e-mail, telefone
- Endereço de entrega
- Dados de login (Google)

### 2.2 Coletamos automaticamente:
- Dados de pedido (produtos, valores)
- Endereço IP
- Identificador do dispositivo (para notificações)
- Dados de navegação

### 2.3 Pagamentos:
- Não armazenamos dados de cartão
- Processamos via gateways terceiros

---

## 3. Como Usamos seus Dados

Usamos para:
- Processar e entregar pedidos
- Enviar notificações sobre status
- Comunicar promoções (com consentimento)
- Melhorar o serviço
- Prevenir fraudes

---

## 4. Compartilhamento

**Não vendemos seus dados.** Compartilhamos apenas com:
- Entregadores (nome, telefone, endereço)
- Processadores de pagamento
- Fornecedores de infraestrutura

---

## 5. Armazenamento

Seus dados são armazenados na plataforma Supabase com:
- Criptografia em trânsito e repouso
- Backups regulares

Mantemos:
- Dados de conta: enquanto ativa
- Histórico de pedidos: 5 anos (obrigação fiscal)

---

## 6. Seus Direitos (LGPD)

Você tem direito a:
- **Acesso** aos seus dados
- **Correção** de dados incorretos
- **Exclusão** (sujeito a obrigações legais)
- **Portabilidade** em formato estruturado
- **Revogação** de consentimento

**Como exercer:** Envie e-mail para privacidade@arraiaraul.pompeia com "Solicitação de Direitos LGPD" no assunto.

Respondemos em até 15 dias.

---

## 7. Segurança

Implementamos:
- ✅ Criptografia HTTPS
- ✅ Criptografia de senhas
- ✅ Autenticação JWT
- ✅ Controle de acesso
- ✅ Backups automáticos

---

## 8. Cookies

Usamos cookies para:
- Manter você logado
- Lembrar preferências
- Analytics (Google Analytics)

Você pode desativar nas configurações do navegador.

---

## 9. Crianças

Nosso app **não é direcionado a menores de 18 anos**. Não coletamos dados de crianças intencionalmente.

---

## 10. Alterações

Podemos atualizar esta política. Notificaremos sobre mudanças significativas. Ao continuar usando o app, você aceita a política atualizada.

---

## 11. Contato

**E-mail:** privacidade@arraiaraul.pompeia
**Prazo de resposta:** 15 dias úteis

Você também pode reclamar à ANPD: www.gov.br/anpd
`;

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-40 bg-card shadow-sm border-b border-border">
        <div className="container flex items-center gap-2 pt-1 pb-3">
          <BackButton to="/perfil" />
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Shield className="h-5 w-5" /> Política de Privacidade
          </h1>
        </div>
      </header>

      <main className="container py-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Arraiá da Escola Raul Pompéia</CardTitle>
            <p className="text-sm text-muted-foreground">Versão 1.0.0 • 27 de maio de 2025</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <div className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {privacyContent}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
