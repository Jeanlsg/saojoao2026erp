// Gerador de PIX BR Code (Copia e Cola) seguindo o padrão do Banco Central.
// Baseado na especificação: https://www.bcb.gov.br/content/estabilidadefinanceira/spi/QR-Code-Padrao-Brasileiro.pdf
//
// IMPORTANTE: este código gera um PIX estático (sem txid dinâmico de banco).
// Para uso real em evento, configure sua chave PIX e o recebedor (nome + cidade).

export interface PixConfig {
  /** Chave PIX do recebedor (CPF, CNPJ, email, telefone ou chave aleatória) */
  pixKey: string;
  /** Nome do recebedor (até 25 caracteres) */
  merchantName: string;
  /** Cidade do recebedor (até 15 caracteres) */
  merchantCity: string;
  /** CEP opcional — usado para formar o GUI */
  cep?: string;
}

export interface PixPayload {
  /** Código PIX copia-e-cola (EMV BR Code) */
  brCode: string;
  /** URL para gerar imagem do QR Code via api.qrserver.com */
  qrCodeUrl: string;
}

/**
 * Calcula o CRC16-CCITT (polinômio 0x1021) usado no PIX.
 */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Monta um campo EMV no formato padrão PIX:
 *   [id do campo (2 dígitos)][tamanho (2 dígitos)][valor]
 */
function emvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

/**
 * Trunca e normaliza strings para o padrão PIX (sem acentos, sem caracteres especiais).
 */
function normalize(value: string, maxLength: number): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacríticos
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .substring(0, maxLength);
}

/**
 * Normaliza a chave PIX para o formato aceito pelo padrão EMV.
 * - CPF/CNPJ: apenas dígitos
 * - Email: lowercase
 * - Telefone: +55 + DDD + número
 * - Chave aleatória: UUID
 */
function normalizePixKey(key: string): string {
  const digits = key.replace(/\D/g, "");

  // Telefone: 10 ou 11 dígitos (DDD + número) → prefixa +55
  if (digits.length === 10 || digits.length === 11) {
    // Se já começa com 55, mantém
    if (digits.startsWith("55") && digits.length === 12) {
      return `+${digits}`;
    }
    return `+55${digits}`;
  }

  // Email: lowercase
  if (key.includes("@")) {
    return key.toLowerCase();
  }

  // UUID/chave aleatória: mantém como está
  return key;
}

/**
 * Gera o BR Code PIX dinâmico (com valor) para uma transação.
 *
 * @param amount Valor em reais (ex: 42.50)
 * @param txid Identificador da transação (até 25 caracteres)
 * @param config Configuração do recebedor (chave, nome, cidade)
 */
export function generatePixPayload(
  amount: number,
  txid: string,
  config: PixConfig
): PixPayload {
  // Monta payload base
  const gui = emvField("00", "br.gov.bcb.pix");
  const key = emvField("01", normalizePixKey(config.pixKey));

  // 26 = Merchant Account Information (obrigatório)
  const merchantAccount = emvField("26", gui + key);

  // 52 = Merchant Category Code (0000 = genérico)
  const mcc = emvField("52", "0000");

  // 53 = Transaction Currency (986 = BRL)
  const currency = emvField("53", "986");

  // 54 = Transaction Amount
  const amountStr = amount.toFixed(2);
  const amountField = emvField("54", amountStr);

  // 58 = Country Code (BR)
  const country = emvField("58", "BR");

  // 59 = Merchant Name
  const name = emvField("59", normalize(config.merchantName, 25));

  // 60 = Merchant City
  const city = emvField("60", normalize(config.merchantCity, 15));

  // 62 = Additional Data Field Template (txid)
  const txidClean = txid.replace(/[^A-Za-z0-9]/g, "").substring(0, 25);
  const txidField = emvField("62", emvField("05", txidClean));

  // Payload sem CRC: juntar todos os campos
  const payloadNoCrc =
    "000201" + // Payload Format Indicator
    merchantAccount +
    mcc +
    currency +
    amountField +
    country +
    name +
    city +
    txidField +
    "6304"; // ID do CRC + tamanho (4 caracteres)

  // Calcula e anexa CRC
  const fullPayload = payloadNoCrc + crc16(payloadNoCrc);

  // Gera URL para imagem do QR Code
  const qrUrl =
    "https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=" +
    encodeURIComponent(fullPayload);

  return {
    brCode: fullPayload,
    qrCodeUrl: qrUrl,
  };
}
