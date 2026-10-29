const GENEROS = ['Feminino', 'Masculino', 'Não binário', 'Outro', 'Prefiro não informar']

export function soDigitos(valor = '') {
  return String(valor).replace(/\D/g, '')
}

export function cpfValido(cpf) {
  const d = soDigitos(cpf)
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  const calc = (base) => {
    let soma = 0
    for (let i = 0; i < base; i++) soma += Number(d[i]) * (base + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10])
}

export function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

export function nascimentoValido(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false
  const dt = new Date(`${data}T00:00:00`)
  if (Number.isNaN(dt.getTime())) return false
  const hoje = new Date()
  return dt < hoje && dt.getFullYear() > 1900
}

export function telefoneValido(tel) {
  const d = soDigitos(tel)
  return d.length === 10 || d.length === 11
}

export function nomeCompletoValido(nome) {
  return String(nome || '').trim().split(/\s+/).filter(Boolean).length >= 2
}

export function erro(status, mensagem) {
  const e = new Error(mensagem)
  e.status = status
  return e
}

export function validarCadastro(corpo, { senhaObrigatoria = true } = {}) {
  const nomeCompleto = String(corpo.nomeCompleto || '').trim()
  const usaNomeSocial = Boolean(corpo.usaNomeSocial)
  const nomeSocial = String(corpo.nomeSocial || '').trim()
  const genero = String(corpo.genero || '')
  const nascimento = String(corpo.nascimento || '')
  const cpf = soDigitos(corpo.cpf)
  const email = String(corpo.email || '').trim().toLowerCase()
  const telefone = soDigitos(corpo.telefone)
  const senha = String(corpo.senha || '')
  const senha2 = String(corpo.senha2 || '')
  const aceiteLgpd = Boolean(corpo.aceiteLgpd)

  if (!nomeCompletoValido(nomeCompleto)) throw erro(400, 'Informe o nome completo (pelo menos duas palavras).')
  if (usaNomeSocial && nomeSocial.length < 2) throw erro(400, 'Informe o nome social.')
  if (!GENEROS.includes(genero)) throw erro(400, 'Selecione um gênero.')
  if (!nascimentoValido(nascimento)) throw erro(400, 'Informe uma data de nascimento válida.')
  if (!cpfValido(cpf)) throw erro(400, 'CPF inválido.')
  if (!emailValido(email)) throw erro(400, 'E-mail inválido.')
  if (!telefoneValido(telefone)) throw erro(400, 'Telefone inválido. Use DDD + número.')
  if (senhaObrigatoria) {
    if (senha.length < 8) throw erro(400, 'A senha precisa ter pelo menos 8 caracteres.')
    if (senha !== senha2) throw erro(400, 'As senhas não coincidem.')
    if (!aceiteLgpd) throw erro(400, 'É preciso aceitar a política de privacidade.')
  }

  return {
    nomeCompleto,
    usaNomeSocial,
    nomeSocial: usaNomeSocial ? nomeSocial : null,
    genero,
    nascimento,
    cpf,
    email,
    telefone,
    senha,
  }
}

export function dataValida(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false
  const dt = new Date(`${data}T00:00:00`)
  return !Number.isNaN(dt.getTime()) && dt.toISOString().startsWith(data)
}

export function validarEvento(corpo) {
  const nome = String(corpo.nome || '').trim()
  const chamada = String(corpo.chamada || '').trim()
  const descricao = String(corpo.descricao || '').trim()
  const dataInicio = String(corpo.dataInicio || '')
  const dataFim = String(corpo.dataFim || dataInicio)
  const local = String(corpo.local || '').trim()

  if (nome.length < 3) throw erro(400, 'Informe o nome do evento.')
  if (nome.length > 180) throw erro(400, 'O nome do evento pode ter até 180 caracteres.')
  if (chamada.length > 280) throw erro(400, 'A chamada pode ter até 280 caracteres.')
  if (!dataValida(dataInicio)) throw erro(400, 'Informe uma data de início válida.')
  if (!dataValida(dataFim)) throw erro(400, 'Informe uma data de término válida.')
  if (dataFim < dataInicio) throw erro(400, 'O término não pode ser antes do início.')
  if (local.length > 180) throw erro(400, 'O local pode ter até 180 caracteres.')

  const tipo = corpo.tipo === 'completo' ? 'completo' : 'simples'
  // Evento simples nao tem inscricao, entao a taxa fica zerada.
  const taxa = tipo === 'completo' ? Number(corpo.taxa ?? 0) : 0
  if (Number.isNaN(taxa) || taxa < 0) throw erro(400, 'Taxa de inscrição inválida.')

  return {
    nome,
    chamada,
    descricao,
    dataInicio,
    dataFim,
    local,
    tipo,
    taxa,
    inscricoesAbertas: corpo.inscricoesAbertas !== false,
    publicado: corpo.publicado !== false,
  }
}

export const TIPOS_ATIVIDADE = ['palestra', 'mesa', 'minicurso', 'oficina', 'projetos']

/** Atividade de um evento completo: a data precisa cair dentro do evento. */
export function validarAtividade(corpo, evento) {
  const titulo = String(corpo.titulo || '').trim()
  const data = String(corpo.data || '')
  const horario = String(corpo.horario || '').trim()
  const tipo = String(corpo.tipo || 'palestra')
  const precoExtra = Number(corpo.precoExtra ?? 0)
  const vagas = corpo.vagas === '' || corpo.vagas == null ? null : Number(corpo.vagas)

  if (titulo.length < 3) throw erro(400, 'Informe o título da atividade.')
  if (titulo.length > 255) throw erro(400, 'O título pode ter até 255 caracteres.')
  if (!dataValida(data)) throw erro(400, 'Informe a data da atividade.')
  if (data < evento.data_inicio || data > evento.data_fim) {
    throw erro(400, 'A data da atividade precisa estar dentro do período do evento.')
  }
  if (horario.length > 40) throw erro(400, 'O horário pode ter até 40 caracteres.')
  if (!TIPOS_ATIVIDADE.includes(tipo)) throw erro(400, 'Tipo de atividade inválido.')
  if (Number.isNaN(precoExtra) || precoExtra < 0) throw erro(400, 'Preço extra inválido.')
  if (vagas != null && (!Number.isInteger(vagas) || vagas < 0)) throw erro(400, 'Vagas inválidas.')

  return { titulo, data, horario, tipo, precoExtra, vagas }
}

/** Ids de atividades vindos do front, sem repeticao. */
export function idsAtividades(corpo) {
  const lista = Array.isArray(corpo.atividades) ? corpo.atividades : []
  return [...new Set(lista.map(Number).filter(Number.isInteger))]
}

export function validarNoticia(corpo) {
  const titulo = String(corpo.titulo || '').trim()
  const resumo = String(corpo.resumo || '').trim()
  const conteudo = String(corpo.conteudo || '').trim()
  const publicadaEm = String(corpo.publicadaEm || '')
  const eventoId = corpo.eventoId === '' || corpo.eventoId == null ? null : Number(corpo.eventoId)

  if (titulo.length < 3) throw erro(400, 'Informe o título da notícia.')
  if (titulo.length > 180) throw erro(400, 'O título pode ter até 180 caracteres.')
  if (resumo.length > 280) throw erro(400, 'O resumo pode ter até 280 caracteres.')
  if (!resumo && !conteudo) throw erro(400, 'Escreva um resumo ou o texto da notícia.')
  if (!dataValida(publicadaEm)) throw erro(400, 'Informe uma data de publicação válida.')
  if (eventoId != null && !Number.isInteger(eventoId)) throw erro(400, 'Evento inválido.')

  return { titulo, resumo, conteudo, publicadaEm, eventoId, publicada: corpo.publicada !== false }
}

export { GENEROS }
