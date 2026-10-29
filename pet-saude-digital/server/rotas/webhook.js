import { Router } from 'express'
import { dadosComprovante, montarInscricao, q } from '../db.js'
import { asaasAtivo, tokenWebhookValido } from '../lib/asaas.js'
import { enviarComprovante } from '../lib/email.js'

export const webhook = Router()

webhook.post('/asaas', async (req, res, next) => {
  try {
    if (!tokenWebhookValido(req)) return res.status(401).json({ erro: 'Token inválido.' })

    const evento = req.body || {}
    const tipo = evento.event || evento.type || ''
    const payment = evento.payment || evento
    const eventId = String(evento.id || `${tipo}-${payment.id || Date.now()}`)

    const [ja] = await q('SELECT id FROM webhook_eventos WHERE id=?', [eventId])
    if (ja) return res.json({ ok: true, idempotente: true })

    await q('INSERT INTO webhook_eventos (id, payment_id, tipo) VALUES (?, ?, ?)', [
      eventId,
      payment.id || null,
      tipo,
    ])

    const confirmado = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(tipo)
    if (confirmado && payment.id) {
      const [insc] = await q('SELECT * FROM inscricoes WHERE asaas_payment_id=?', [payment.id])
      if (insc && insc.status !== 'pago' && insc.status !== 'cancelada') {
        await q('UPDATE inscricoes SET status="pago" WHERE id=?', [insc.id])
        await enviarComprovante(await dadosComprovante(insc.id))
      }
    }

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

/** Só existe sem chave Asaas: o trabalho precisa demonstrar o fluxo pago. */
webhook.post('/dev/simular-pix', async (req, res, next) => {
  try {
    if (asaasAtivo()) return res.status(403).json({ erro: 'Desligado quando o Asaas está configurado.' })
    if (!req.session?.participanteId) return res.status(401).json({ erro: 'Entre na sua conta.' })
    const insc = await montarInscricao(Number(req.body.inscricaoId))
    if (!insc || insc.participanteId !== req.session.participanteId) {
      return res.status(404).json({ erro: 'Inscrição não encontrada.' })
    }
    if (insc.status !== 'aguardando_pix') return res.status(400).json({ erro: 'Esta inscrição não espera Pix.' })
    await q('UPDATE inscricoes SET status="pago" WHERE id=?', [insc.id])
    await enviarComprovante(await dadosComprovante(insc.id))
    res.json(await montarInscricao(insc.id))
  } catch (err) {
    next(err)
  }
})
