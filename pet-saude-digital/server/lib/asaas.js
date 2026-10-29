const BASE = process.env.ASAAS_BASE_URL || 'https://api-sandbox.asaas.com/v3'
const KEY = process.env.ASAAS_API_KEY || ''

function headers() {
  return {
    'Content-Type': 'application/json',
    access_token: KEY,
  }
}

export function asaasAtivo() {
  return Boolean(KEY)
}

async function pedir(caminho, opcoes = {}) {
  const res = await fetch(`${BASE}${caminho}`, {
    ...opcoes,
    headers: { ...headers(), ...(opcoes.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.errors?.[0]?.description || data?.message || `Asaas ${res.status}`
    const e = new Error(msg)
    e.status = 502
    throw e
  }
  return data
}

export async function garantirCliente({ nome, email, cpf, telefone, asaasCustomerId }) {
  if (!asaasAtivo()) return asaasCustomerId || `mock_${cpf}`
  if (asaasCustomerId) return asaasCustomerId
  const criado = await pedir('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: nome,
      email,
      cpfCnpj: cpf,
      mobilePhone: telefone,
    }),
  })
  return criado.id
}

export async function criarCobrancaPix({ customerId, valor, inscricaoId, evento, vencimento }) {
  if (!asaasAtivo()) {
    return {
      paymentId: `mock_pay_${inscricaoId}_${Date.now()}`,
      payload: `00020126580014br.gov.bcb.pix0136inscricao-${inscricaoId}520400005303986540${Number(valor).toFixed(2)}5802BR5925PET SAUDE DIGITAL UEPA6009ANANINDEUA62070503***6304ABCD`,
      qrcode: null,
      expiraEm: new Date(Date.now() + 30 * 60 * 1000),
    }
  }

  const pagamento = await pedir('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: customerId,
      billingType: 'PIX',
      value: Number(valor),
      dueDate: vencimento,
      externalReference: String(inscricaoId),
      description: `Inscrição nº ${inscricaoId} — ${evento || 'PET Saúde Digital'}`,
    }),
  })

  const qr = await pedir(`/payments/${pagamento.id}/pixQrCode`)
  return {
    paymentId: pagamento.id,
    payload: qr.payload,
    qrcode: qr.encodedImage ? `data:image/png;base64,${qr.encodedImage}` : null,
    expiraEm: qr.expirationDate ? new Date(qr.expirationDate) : new Date(Date.now() + 30 * 60 * 1000),
  }
}

export async function cancelarCobranca(paymentId) {
  if (!paymentId || !asaasAtivo() || String(paymentId).startsWith('mock_')) return
  await pedir(`/payments/${paymentId}`, { method: 'DELETE' }).catch(() => {})
}

export function tokenWebhookValido(req) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN || ''
  if (!esperado) return true
  const recebido = req.get('asaas-access-token') || req.query.token
  return recebido === esperado
}
