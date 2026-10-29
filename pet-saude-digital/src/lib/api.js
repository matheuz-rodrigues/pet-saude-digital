export async function api(caminho, { method = 'GET', body, ...resto } = {}) {
  const res = await fetch(`/api${caminho}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    ...resto,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.erro || 'Não foi possível concluir.')
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export function mascaraCpf(cpf = '') {
  const d = String(cpf).replace(/\D/g, '').padStart(11, '0').slice(-11)
  return `***.***.***-${d.slice(9)}`
}

export function mascaraTel(valor = '') {
  const d = String(valor).replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim()
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim()
}

export function mascaraCpfInput(valor = '') {
  return String(valor)
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export const rotuloStatus = {
  rascunho: 'Rascunho',
  aguardando_pix: 'Aguardando Pix',
  aguardando_gratuidade: 'Aguardando gratuidade',
  pago: 'Confirmada',
  cancelada: 'Cancelada',
}
