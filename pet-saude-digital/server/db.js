import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const RAIZ = dirname(fileURLToPath(import.meta.url))

export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'petsaude',
  password: process.env.MYSQL_PASSWORD || 'petsaude',
  database: process.env.MYSQL_DATABASE || 'petsaude',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  charset: 'utf8mb4',
})

export async function q(sql, params) {
  const [rows] = await pool.query(sql, params)
  return rows
}

export async function esperarMysql(tentativas = 40) {
  for (let i = 1; i <= tentativas; i++) {
    try {
      await pool.query('SELECT 1')
      return
    } catch (err) {
      console.log(`[mysql] tentativa ${i}/${tentativas}: ${err.message}`)
      await new Promise((r) => setTimeout(r, 1500))
    }
  }
  throw new Error('MySQL indisponível')
}

/**
 * Ate o incremento 2 as atividades eram uma lista fixa do simposio, sem
 * evento, e cada participante tinha uma unica inscricao. Essas tabelas nao
 * cabem no modelo novo: se o banco ainda estiver nesse formato, elas sao
 * descartadas antes do schema recria-las. As contas dos participantes ficam.
 */
async function descartarTabelasAntigas() {
  const legado = (await tabelaSemColuna('atividades', 'evento_id')) || (await tabelaSemColuna('inscricoes', 'evento_id'))
  if (!legado) return
  console.log('[mysql] descartando atividades e inscricoes do formato antigo (sem evento)')
  await pool.query('DROP TABLE IF EXISTS inscricao_atividades, inscricoes, atividades')
}

async function tabelaSemColuna(tabela, coluna) {
  const [tabelaExiste] = await q(
    'SELECT 1 AS sim FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    [tabela],
  )
  return Boolean(tabelaExiste) && !(await temColuna(tabela, coluna))
}

async function temColuna(tabela, coluna) {
  const [existe] = await q(
    `SELECT 1 AS sim FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [tabela, coluna],
  )
  return Boolean(existe)
}

// MySQL 8 nao tem ADD COLUMN IF NOT EXISTS.
async function garantirColuna(tabela, coluna, definicao) {
  if (!(await temColuna(tabela, coluna))) await pool.query(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicao}`)
}

export async function iniciarBanco() {
  await esperarMysql()
  await descartarTabelasAntigas()
  const schema = await readFile(join(RAIZ, 'sql', '001_schema.sql'), 'utf8')
  // Sem as linhas de comentario, um ponto e virgula escrito num comentario
  // nao quebra a divisao em instrucoes.
  const semComentarios = schema
    .split('\n')
    .filter((linha) => !linha.trim().startsWith('--'))
    .join('\n')
  for (const trecho of semComentarios.split(';').map((s) => s.trim()).filter(Boolean)) {
    await pool.query(trecho)
  }
  // Bancos criados no incremento 1 ja tem a tabela eventos sem estas colunas.
  await garantirColuna('eventos', 'tipo', "VARCHAR(16) NOT NULL DEFAULT 'simples' AFTER local")
  await garantirColuna('eventos', 'taxa', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER tipo')
  await garantirColuna('eventos', 'inscricoes_abertas', 'TINYINT NOT NULL DEFAULT 1 AFTER taxa')

  await pool.query(
    `INSERT IGNORE INTO config (id, conta_pix, prazo_cancelamento_dias, percentual_reembolso, inscricoes_abertas)
     VALUES (1, 'Pix gerado pelo Asaas', 7, 100.00, 1)`,
  )

  // So semeia com a tabela vazia: um evento apagado no admin nao pode
  // reaparecer a cada reinicio da API.
  await pool.query(
    `INSERT INTO eventos (nome, chamada, descricao, data_inicio, data_fim, local)
     SELECT ?, ?, ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM eventos)`,
    [
      'I Simpósio PET Saúde Digital',
      'Uma semana sobre tecnologia, dados e cuidado em saúde na Amazônia.',
      'Palestras, mesas-redondas, minicursos práticos de Python e apresentação dos projetos do PET Saúde Digital. Certificado de 40 horas.',
      '2026-10-19',
      '2026-10-23',
      'Campus XXII da UEPA — Ananindeua',
    ],
  )
  await pool.query(
    `INSERT INTO noticias (titulo, resumo, conteudo, publicada_em)
     SELECT ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM noticias)`,
    [
      'Novo site do PET Saúde Digital',
      'O site agora reúne todos os eventos e as notícias do programa.',
      'Os eventos do PET Saúde Digital passam a ser publicados aqui, na aba Eventos, e os avisos e resultados saem na aba Notícias. A inscrição continua sendo feita pelo próprio site, com pagamento por Pix.',
      '2026-10-28',
    ],
  )
}

export async function config() {
  const [row] = await q('SELECT * FROM config WHERE id = 1')
  return row
}

export function nomeExibicao(p) {
  return p.usa_nome_social && p.nome_social ? p.nome_social : p.nome_completo
}

export function dentroDoPrazo(inscritoEm, dias) {
  const limite = new Date(inscritoEm)
  if (Number.isNaN(limite.getTime())) return true
  limite.setDate(limite.getDate() + Number(dias || 0))
  return new Date() <= limite
}

const STATUS_OCUPA = `('aguardando_pix','aguardando_gratuidade','pago')`

export async function ocupacaoAtividades() {
  const rows = await q(
    `SELECT ia.atividade_id AS id, COUNT(*) AS ocupadas
     FROM inscricao_atividades ia
     JOIN inscricoes i ON i.id = ia.inscricao_id
     WHERE i.status IN ${STATUS_OCUPA}
     GROUP BY ia.atividade_id`,
  )
  return Object.fromEntries(rows.map((r) => [r.id, Number(r.ocupadas)]))
}

/** Atividades com vagas, de um evento ou de varios (lista de ids). */
export async function atividadesComVagas(eventoIds) {
  const ids = [].concat(eventoIds)
  if (!ids.length) return []
  const [lista, ocup] = await Promise.all([
    q(
      `SELECT id, evento_id, horario, tipo, titulo, preco_extra, vagas, DATE_FORMAT(data, '%Y-%m-%d') AS data
       FROM atividades
       WHERE evento_id IN (${ids.map(() => '?').join(',')})
       ORDER BY data, ordem, id`,
      ids,
    ),
    ocupacaoAtividades(),
  ])
  return lista.map((a) => {
    const ocupadas = ocup[a.id] || 0
    const vagas = a.vagas == null ? null : Number(a.vagas)
    return {
      id: a.id,
      eventoId: a.evento_id,
      data: a.data,
      horario: a.horario,
      tipo: a.tipo,
      titulo: a.titulo,
      precoExtra: Number(a.preco_extra),
      vagas,
      ocupadas,
      esgotada: vagas != null && ocupadas >= vagas,
    }
  })
}

/** Uma inscricao (de um participante em um evento), pronta para o front. */
export async function montarInscricao(inscricaoId) {
  const [i] = await q(
    `SELECT i.*, e.nome AS evento_nome, e.local AS evento_local,
            DATE_FORMAT(e.data_inicio, '%Y-%m-%d') AS evento_inicio,
            DATE_FORMAT(e.data_fim, '%Y-%m-%d') AS evento_fim
     FROM inscricoes i
     JOIN eventos e ON e.id = i.evento_id
     WHERE i.id = ?`,
    [inscricaoId],
  )
  if (!i) return null
  const cfg = await config()
  const ats = await q(
    `SELECT a.id, a.titulo, a.tipo, a.horario, a.preco_extra, DATE_FORMAT(a.data, '%Y-%m-%d') AS data
     FROM inscricao_atividades ia
     JOIN atividades a ON a.id = ia.atividade_id
     WHERE ia.inscricao_id = ?
     ORDER BY a.data, a.ordem, a.id`,
    [i.id],
  )
  return {
    id: i.id,
    participanteId: i.participante_id,
    status: i.status,
    valor: Number(i.valor),
    evento: {
      id: i.evento_id,
      nome: i.evento_nome,
      local: i.evento_local,
      dataInicio: i.evento_inicio,
      dataFim: i.evento_fim,
    },
    pix: i.pix_payload ? { payload: i.pix_payload, qrcode: i.pix_qrcode, expiraEm: i.pix_expira_em } : null,
    gratuidadeMotivo: i.gratuidade_motivo,
    credenciadoEm: i.credenciado_em,
    canceladaEm: i.cancelada_em,
    inscritoEm: i.created_at,
    podeCancelar: i.status !== 'cancelada' && dentroDoPrazo(i.created_at, cfg.prazo_cancelamento_dias),
    atividades: ats.map((a) => ({
      id: a.id,
      titulo: a.titulo,
      tipo: a.tipo,
      data: a.data,
      horario: a.horario,
      precoExtra: Number(a.preco_extra),
    })),
  }
}

/** Conta do participante com todas as inscricoes dele, da mais recente. */
export async function montarConta(participanteId) {
  const [p] = await q('SELECT * FROM participantes WHERE id = ?', [participanteId])
  if (!p) return null
  const ids = await q('SELECT id FROM inscricoes WHERE participante_id = ? ORDER BY id DESC', [p.id])
  return {
    id: p.id,
    numero: p.numero,
    nomeCompleto: p.nome_completo,
    usaNomeSocial: Boolean(p.usa_nome_social),
    nomeSocial: p.nome_social,
    nome: nomeExibicao(p),
    genero: p.genero,
    nascimento: p.nascimento,
    cpf: p.cpf,
    email: p.email,
    telefone: p.telefone,
    inscricoes: await Promise.all(ids.map((r) => montarInscricao(r.id))),
  }
}

// DATE_FORMAT evita que o driver converta DATE em Date com fuso e a data
// "volte um dia" ao virar JSON.
export async function listarEventos({ soPublicados = false } = {}) {
  const rows = await q(
    `SELECT id, nome, chamada, descricao, local, tipo, taxa, inscricoes_abertas, publicado,
            DATE_FORMAT(data_inicio, '%Y-%m-%d') AS data_inicio,
            DATE_FORMAT(data_fim, '%Y-%m-%d') AS data_fim
     FROM eventos
     ${soPublicados ? 'WHERE publicado = 1' : ''}
     ORDER BY data_inicio DESC, id DESC`,
  )
  const completos = rows.filter((e) => e.tipo === 'completo').map((e) => e.id)
  const atividades = await atividadesComVagas(completos)
  return rows.map((e) => ({
    id: e.id,
    nome: e.nome,
    chamada: e.chamada,
    descricao: e.descricao || '',
    dataInicio: e.data_inicio,
    dataFim: e.data_fim,
    local: e.local,
    tipo: e.tipo,
    taxa: Number(e.taxa),
    inscricoesAbertas: Boolean(e.inscricoes_abertas),
    publicado: Boolean(e.publicado),
    atividades: e.tipo === 'completo' ? atividades.filter((a) => a.eventoId === e.id) : [],
  }))
}

export async function buscarEvento(id) {
  const [e] = await q(
    `SELECT id, nome, tipo, taxa, inscricoes_abertas, publicado,
            DATE_FORMAT(data_inicio, '%Y-%m-%d') AS data_inicio,
            DATE_FORMAT(data_fim, '%Y-%m-%d') AS data_fim
     FROM eventos WHERE id = ?`,
    [id],
  )
  return e || null
}

export async function listarNoticias({ soPublicadas = false } = {}) {
  const rows = await q(
    `SELECT n.id, n.titulo, n.resumo, n.conteudo, n.evento_id, n.publicada,
            DATE_FORMAT(n.publicada_em, '%Y-%m-%d') AS publicada_em, e.nome AS evento_nome
     FROM noticias n
     LEFT JOIN eventos e ON e.id = n.evento_id
     ${soPublicadas ? 'WHERE n.publicada = 1' : ''}
     ORDER BY n.publicada_em DESC, n.id DESC`,
  )
  return rows.map((n) => ({
    id: n.id,
    titulo: n.titulo,
    resumo: n.resumo,
    conteudo: n.conteudo || '',
    eventoId: n.evento_id,
    eventoNome: n.evento_nome,
    publicada: Boolean(n.publicada),
    publicadaEm: n.publicada_em,
  }))
}

/** Dados que o e-mail de comprovante precisa, a partir de uma inscricao. */
export async function dadosComprovante(inscricaoId) {
  const insc = await montarInscricao(inscricaoId)
  if (!insc) return null
  const [p] = await q('SELECT * FROM participantes WHERE id = ?', [insc.participanteId])
  return {
    nome: nomeExibicao(p),
    numero: p.numero,
    email: p.email,
    evento: insc.evento,
    valor: insc.valor,
    status: insc.status,
    atividades: insc.atividades.map((a) => a.titulo),
  }
}
