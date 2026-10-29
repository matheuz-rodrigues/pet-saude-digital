import { Router } from 'express'
import { config, listarEventos, listarNoticias } from '../db.js'

export const publico = Router()

publico.get('/config', async (_req, res, next) => {
  try {
    const cfg = await config()
    res.json({
      inscricoesAbertas: Boolean(cfg.inscricoes_abertas),
      prazoCancelamentoDias: cfg.prazo_cancelamento_dias,
      percentualReembolso: Number(cfg.percentual_reembolso),
    })
  } catch (err) {
    next(err)
  }
})

// Eventos completos ja vem com as atividades e as vagas de cada uma. A
// chave geral do admin fecha as inscricoes de todos os eventos de uma vez.
publico.get('/eventos', async (_req, res, next) => {
  try {
    const [cfg, eventos] = await Promise.all([config(), listarEventos({ soPublicados: true })])
    const abertas = Boolean(cfg.inscricoes_abertas)
    res.json({ eventos: eventos.map((e) => ({ ...e, inscricoesAbertas: abertas && e.inscricoesAbertas })) })
  } catch (err) {
    next(err)
  }
})

publico.get('/noticias', async (_req, res, next) => {
  try {
    res.json({ noticias: await listarNoticias({ soPublicadas: true }) })
  } catch (err) {
    next(err)
  }
})
