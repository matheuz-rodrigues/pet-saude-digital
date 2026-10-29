import { Router } from 'express'
import bcrypt from 'bcryptjs'
import {
  atividadesComVagas,
  buscarEvento,
  config,
  dadosComprovante,
  montarConta,
  montarInscricao,
  nomeExibicao,
  q,
} from '../db.js'
import { cancelarCobranca, criarCobrancaPix, garantirCliente } from '../lib/asaas.js'
import { enviarComprovante } from '../lib/email.js'
import { erro, idsAtividades, validarCadastro } from '../lib/validar.js'

export const participante = Router()

function exigeLogin(req, _res, next) {
  if (!req.session?.participanteId) return next(erro(401, 'Entre na sua conta.'))
  next()
}

function hojeIso() {
  const d = new Date()
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-')
}

/** So evento completo, publicado, aberto e que ainda nao terminou aceita inscricao. */
async function eventoAceitaInscricao(eventoId) {
  const evento = await buscarEvento(Number(eventoId))
  if (!evento || !evento.publicado) throw erro(404, 'Evento não encontrado.')
  if (evento.tipo !== 'completo') throw erro(400, 'Este evento não tem inscrição pelo site.')
  const cfg = await config()
  if (!cfg.inscricoes_abertas || !evento.inscricoes_abertas) throw erro(403, 'Inscrições encerradas para este evento.')
  if (evento.data_fim < hojeIso()) throw erro(403, 'Este evento já terminou.')
  return evento
}

async function calcularValor(evento, ids, inscricaoId = null) {
  const lista = await atividadesComVagas(evento.id)
  const proprias = new Set()
  if (inscricaoId) {
    const rows = await q('SELECT atividade_id FROM inscricao_atividades WHERE inscricao_id = ?', [inscricaoId])
    for (const r of rows) proprias.add(r.atividade_id)
  }
  let extra = 0
  for (const id of ids) {
    const a = lista.find((x) => x.id === id)
    if (!a) throw erro(400, 'Atividade inválida para este evento.')
    if (a.esgotada && !proprias.has(id)) throw erro(409, `Sem vagas: ${a.titulo}`)
    extra += a.precoExtra
  }
  return Number(evento.taxa) + extra
}

async function vincularAtividades(inscricaoId, ids) {
  await q('DELETE FROM inscricao_atividades WHERE inscricao_id = ?', [inscricaoId])
  for (const id of ids) {
    await q('INSERT INTO inscricao_atividades (inscricao_id, atividade_id) VALUES (?, ?)', [inscricaoId, id])
  }
}

async function gerarNumero() {
  const [row] = await q('SELECT IFNULL(MAX(CAST(numero AS UNSIGNED)), 0) + 1 AS prox FROM participantes')
  return String(row.prox).padStart(6, '0')
}

/**
 * Inscreve o participante no evento. Uma inscricao cancelada no mesmo evento
 * e reaproveitada (ha uma linha por participante e evento). Evento gratuito
 * e sem extras ja nasce confirmado: nao ha Pix de R$ 0,00.
 */
async function inscreverNoEvento(participanteId, eventoId, ids) {
  const evento = await eventoAceitaInscricao(eventoId)
  const [anterior] = await q('SELECT id, status FROM inscricoes WHERE participante_id = ? AND evento_id = ?', [
    participanteId,
    evento.id,
  ])
  if (anterior && anterior.status !== 'cancelada') throw erro(409, 'Você já está inscrito neste evento.')

  const valor = await calcularValor(evento, ids)
  const status = valor > 0 ? 'aguardando_pix' : 'pago'
  let inscricaoId
  if (anterior) {
    inscricaoId = anterior.id
    await q(
      `UPDATE inscricoes
       SET status=?, valor=?, asaas_payment_id=NULL, pix_payload=NULL, pix_qrcode=NULL, pix_expira_em=NULL,
           gratuidade_motivo=NULL, credenciado_em=NULL, cancelada_em=NULL, cancelada_por=NULL,
           status_antes_cancelar=NULL, created_at=NOW()
       WHERE id=?`,
      [status, valor, inscricaoId],
    )
  } else {
    const r = await q('INSERT INTO inscricoes (participante_id, evento_id, status, valor) VALUES (?, ?, ?, ?)', [
      participanteId,
      evento.id,
      status,
      valor,
    ])
    inscricaoId = r.insertId
  }
  await vincularAtividades(inscricaoId, ids)
  if (status === 'pago') await enviarComprovante(await dadosComprovante(inscricaoId))
  return inscricaoId
}

/** Inscricao do participante logado, ou 404 se for de outra pessoa. */
async function minhaInscricao(req) {
  const insc = await montarInscricao(Number(req.params.id))
  if (!insc || insc.participanteId !== req.session.participanteId) throw erro(404, 'Inscrição não encontrada.')
  return insc
}

async function resposta(req, inscricaoId) {
  return {
    conta: await montarConta(req.session.participanteId),
    inscricao: inscricaoId ? await montarInscricao(inscricaoId) : null,
  }
}

participante.get('/email', async (req, res, next) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase()
    if (!email) return res.json({ existe: false })
    const [row] = await q('SELECT id FROM participantes WHERE email = ?', [email])
    res.json({ existe: Boolean(row) })
  } catch (err) {
    next(err)
  }
})

/** Primeira inscricao: cria a conta e ja inscreve no evento escolhido. */
participante.post('/', async (req, res, next) => {
  try {
    await eventoAceitaInscricao(req.body.eventoId)
    const dados = validarCadastro(req.body)
    const [jaEmail] = await q('SELECT id FROM participantes WHERE email = ?', [dados.email])
    if (jaEmail) throw erro(409, 'Este e-mail já tem cadastro. Entre na sua conta para se inscrever.')
    const [jaCpf] = await q('SELECT id FROM participantes WHERE cpf = ?', [dados.cpf])
    if (jaCpf) throw erro(409, 'Este CPF já tem cadastro. Entre na sua conta para se inscrever.')

    const hash = await bcrypt.hash(dados.senha, 10)
    const numero = await gerarNumero()
    const result = await q(
      `INSERT INTO participantes
        (numero, nome_completo, usa_nome_social, nome_social, genero, nascimento, cpf, email, telefone, senha_hash, aceite_lgpd)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        numero,
        dados.nomeCompleto,
        dados.usaNomeSocial ? 1 : 0,
        dados.nomeSocial,
        dados.genero,
        dados.nascimento,
        dados.cpf,
        dados.email,
        dados.telefone,
        hash,
      ],
    )
    req.session.participanteId = result.insertId
    const inscricaoId = await inscreverNoEvento(result.insertId, req.body.eventoId, idsAtividades(req.body))
    res.status(201).json(await resposta(req, inscricaoId))
  } catch (err) {
    next(err)
  }
})

/** Quem ja tem conta se inscreve em outro evento sem repetir o cadastro. */
participante.post('/eventos', exigeLogin, async (req, res, next) => {
  try {
    const inscricaoId = await inscreverNoEvento(req.session.participanteId, req.body.eventoId, idsAtividades(req.body))
    res.status(201).json(await resposta(req, inscricaoId))
  } catch (err) {
    next(err)
  }
})

participante.post('/entrar', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    const senha = String(req.body.senha || '')
    const [p] = await q('SELECT id, senha_hash FROM participantes WHERE email = ?', [email])
    if (!p || !(await bcrypt.compare(senha, p.senha_hash))) throw erro(401, 'E-mail ou senha incorretos.')
    req.session.participanteId = p.id
    delete req.session.admin
    res.json(await montarConta(p.id))
  } catch (err) {
    next(err)
  }
})

participante.post('/sair', (req, res) => {
  delete req.session.participanteId
  res.json({ ok: true })
})

participante.get('/eu', exigeLogin, async (req, res, next) => {
  try {
    const conta = await montarConta(req.session.participanteId)
    if (!conta) throw erro(401, 'Entre na sua conta.')
    res.json(conta)
  } catch (err) {
    next(err)
  }
})

/** Dados pessoais da conta. As atividades mudam por inscricao, em outra rota. */
participante.patch('/eu', exigeLogin, async (req, res, next) => {
  try {
    const dados = validarCadastro(
      { ...req.body, aceiteLgpd: true, senha: 'xxxxxxxx', senha2: 'xxxxxxxx' },
      { senhaObrigatoria: false },
    )
    const atual = await montarConta(req.session.participanteId)
    if (dados.email !== atual.email || dados.cpf !== atual.cpf) {
      throw erro(400, 'E-mail e CPF não podem ser alterados. Fale com a organização.')
    }
    await q(
      `UPDATE participantes SET nome_completo=?, usa_nome_social=?, nome_social=?, genero=?, nascimento=?, telefone=?
       WHERE id=?`,
      [
        dados.nomeCompleto,
        dados.usaNomeSocial ? 1 : 0,
        dados.nomeSocial,
        dados.genero,
        dados.nascimento,
        dados.telefone,
        req.session.participanteId,
      ],
    )
    res.json(await montarConta(req.session.participanteId))
  } catch (err) {
    next(err)
  }
})

participante.patch('/:id/atividades', exigeLogin, async (req, res, next) => {
  try {
    const atual = await minhaInscricao(req)
    if (atual.status === 'cancelada') throw erro(400, 'Inscrição cancelada não pode ser editada.')
    if (atual.status === 'pago') throw erro(400, 'Inscrição confirmada: as atividades ficam como estão.')
    const ids = idsAtividades(req.body)
    const evento = await buscarEvento(atual.evento.id)
    const valor = await calcularValor(evento, ids, atual.id)
    await q('UPDATE inscricoes SET valor=? WHERE id=?', [valor, atual.id])
    await vincularAtividades(atual.id, ids)
    // Pix ja emitido com outro valor deixa de valer.
    if (atual.status === 'aguardando_pix' && atual.pix && valor !== atual.valor) await gerarPixPara(atual.id)
    res.json(await resposta(req, atual.id))
  } catch (err) {
    next(err)
  }
})

async function gerarPixPara(inscricaoId) {
  const insc = await montarInscricao(inscricaoId)
  if (!insc) throw erro(404, 'Inscrição não encontrada.')
  if (insc.status === 'pago') return insc
  if (insc.status === 'cancelada') throw erro(400, 'Inscrição cancelada.')

  const [p] = await q('SELECT * FROM participantes WHERE id = ?', [insc.participanteId])
  const customerId = await garantirCliente({
    nome: nomeExibicao(p),
    email: p.email,
    cpf: p.cpf,
    telefone: p.telefone,
    asaasCustomerId: p.asaas_customer_id,
  })
  if (customerId && customerId !== p.asaas_customer_id) {
    await q('UPDATE participantes SET asaas_customer_id=? WHERE id=?', [customerId, p.id])
  }

  const [cobranca] = await q('SELECT asaas_payment_id FROM inscricoes WHERE id=?', [insc.id])
  if (cobranca?.asaas_payment_id) await cancelarCobranca(cobranca.asaas_payment_id)

  const vencimento = new Date()
  vencimento.setDate(vencimento.getDate() + 2)
  const pix = await criarCobrancaPix({
    customerId,
    valor: insc.valor,
    inscricaoId: insc.id,
    evento: insc.evento.nome,
    vencimento: vencimento.toISOString().slice(0, 10),
  })

  await q(
    `UPDATE inscricoes
     SET status='aguardando_pix', asaas_payment_id=?, pix_payload=?, pix_qrcode=?, pix_expira_em=?, gratuidade_motivo=NULL
     WHERE id=?`,
    [pix.paymentId, pix.payload, pix.qrcode, pix.expiraEm, insc.id],
  )
  return montarInscricao(insc.id)
}

participante.post('/:id/pix', exigeLogin, async (req, res, next) => {
  try {
    const insc = await minhaInscricao(req)
    await gerarPixPara(insc.id)
    res.json(await resposta(req, insc.id))
  } catch (err) {
    next(err)
  }
})

participante.post('/:id/gratuidade', exigeLogin, async (req, res, next) => {
  try {
    const motivo = String(req.body.motivo || '').trim()
    if (motivo.length < 8) throw erro(400, 'Explique o pedido de gratuidade (mínimo 8 caracteres).')
    const insc = await minhaInscricao(req)
    if (insc.status === 'pago') throw erro(400, 'Inscrição já está paga.')
    if (insc.status === 'cancelada') throw erro(400, 'Inscrição cancelada.')
    const [row] = await q('SELECT asaas_payment_id FROM inscricoes WHERE id=?', [insc.id])
    if (row?.asaas_payment_id) await cancelarCobranca(row.asaas_payment_id)
    await q(
      `UPDATE inscricoes SET status='aguardando_gratuidade', gratuidade_motivo=?, asaas_payment_id=NULL, pix_payload=NULL, pix_qrcode=NULL
       WHERE id=?`,
      [motivo, insc.id],
    )
    res.json(await resposta(req, insc.id))
  } catch (err) {
    next(err)
  }
})

participante.post('/:id/cancelar', exigeLogin, async (req, res, next) => {
  try {
    const insc = await minhaInscricao(req)
    if (insc.status === 'cancelada') return res.json(await resposta(req, insc.id))
    if (!insc.podeCancelar) {
      const cfg = await config()
      throw erro(403, `O prazo de ${cfg.prazo_cancelamento_dias} dias para cancelar já passou. Fale com a organização.`)
    }
    const [row] = await q('SELECT asaas_payment_id FROM inscricoes WHERE id=?', [insc.id])
    if (row?.asaas_payment_id) await cancelarCobranca(row.asaas_payment_id)
    await q(
      `UPDATE inscricoes
       SET status='cancelada', cancelada_em=NOW(), cancelada_por='participante', status_antes_cancelar=?
       WHERE id=?`,
      [insc.status, insc.id],
    )
    res.json(await resposta(req, insc.id))
  } catch (err) {
    next(err)
  }
})

participante.post('/:id/reenviar', exigeLogin, async (req, res, next) => {
  try {
    const insc = await minhaInscricao(req)
    if (insc.status !== 'pago') throw erro(400, 'Só reenviamos comprovante de inscrição confirmada.')
    await enviarComprovante(await dadosComprovante(insc.id))
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export { gerarPixPara }
