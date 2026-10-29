import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = dirname(fileURLToPath(import.meta.url))
const OUTBOX = join(RAIZ, '..', 'outbox')

function escapar(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function htmlComprovante({ nome, numero, valor, atividades, email, evento }) {
  const lista = atividades.length
    ? atividades.map((a) => `<li>${escapar(a)}</li>`).join('')
    : '<li>Nenhuma atividade selecionada</li>'
  const pagamento = Number(valor) > 0
    ? `Pix · R$ ${Number(valor).toFixed(2).replace('.', ',')} · confirmado`
    : 'Sem custo'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;background:#F7FAFC;font-family:'IBM Plex Sans',Segoe UI,sans-serif;color:#0E2740">
  <div style="max-width:560px;margin:24px auto;background:#fff;border:1px solid #d5e2ee">
    <div style="background:#173C5E;color:#fff;padding:18px 22px;font-weight:700">PET Saúde Digital · UEPA</div>
    <div style="padding:22px">
      <h1 style="font-size:20px;margin:0 0 8px">Inscrição confirmada</h1>
      <p style="margin:0 0 16px;color:#173C5E">Olá, ${escapar(nome)}. Enviamos este comprovante para ${escapar(email)}.</p>
      <p><b>Evento</b> ${escapar(evento.nome)}<br>
         ${evento.local ? `<b>Local</b> ${escapar(evento.local)}<br>` : ''}
         <b>Participante nº</b> ${escapar(numero)}<br>
         <b>Nome</b> ${escapar(nome)}<br>
         <b>Pagamento</b> ${pagamento}<br>
         <b>Atividades</b> ${atividades.length} selecionadas</p>
      <ul>${lista}</ul>
      <div style="background:#173C5E;color:#fff;padding:10px 12px;font-weight:700">Leve um documento oficial com foto</div>
      <div style="border:1px solid #173C5E;padding:12px;margin-bottom:16px">
        Sem ele não é possível fazer o credenciamento. Vale qualquer documento oficial com foto, por exemplo: RG ou CIN, CNH, passaporte, carteira de conselho ou identidade funcional.
      </div>
      <p style="font-size:12px;color:#5a7186">PET Saúde Digital · UEPA — conteúdo fictício para trabalho acadêmico.</p>
    </div>
  </div>
</body>
</html>`
}

export async function enviarComprovante(dados) {
  const html = htmlComprovante(dados)
  const assunto = `Inscrição confirmada — ${dados.evento.nome}`
  const chave = process.env.RESEND_API_KEY || ''
  const de = process.env.RESEND_FROM || 'PET Saúde Digital <noreply@arenahub.app.br>'

  await mkdir(OUTBOX, { recursive: true })
  const arquivo = join(OUTBOX, `${dados.numero}-${Date.now()}.html`)
  await writeFile(arquivo, html, 'utf8')

  if (!chave) {
    console.log(`[resend] sem chave — comprovante em ${arquivo}`)
    return { ok: true, via: 'outbox' }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${chave}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: de,
      to: [dados.email],
      subject: assunto,
      html,
    }),
  })

  if (!res.ok) {
    const corpo = await res.text()
    console.error('[resend] falhou', res.status, corpo)
    return { ok: false, via: 'outbox' }
  }
  return { ok: true, via: 'resend' }
}
