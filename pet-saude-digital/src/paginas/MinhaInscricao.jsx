import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, mascaraCpf, mascaraTel, rotuloStatus } from '../lib/api'
import { useSessao } from '../contexto/Sessao'
import { useInscricao } from '../contexto/Inscricao'
import { aceitaInscricao } from '../hooks/useEventosComInscricao'
import { dataCurta, formatarPeriodo } from '../lib/datas'
import { reais } from '../lib/dinheiro'
import AvisoDocumento from '../components/inscricao/AvisoDocumento'
import Campo, { classeInput } from '../components/inscricao/Campo'

const GENEROS = ['Feminino', 'Masculino', 'Não binário', 'Outro', 'Prefiro não informar']

/** Conta do participante: dados pessoais e uma inscricao por evento. */
export default function MinhaInscricao() {
  const nav = useNavigate()
  const { participante, setParticipante, pronto } = useSessao()
  const { abrir } = useInscricao()
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState(null)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [config, setConfig] = useState(null)
  const [eventos, setEventos] = useState([])

  useEffect(() => {
    if (pronto && !participante) nav('/entrar')
  }, [pronto, participante, nav])

  useEffect(() => {
    api('/config').then(setConfig).catch(() => {})
    api('/eventos').then((d) => setEventos(d.eventos)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!participante) return
    setForm({
      nomeCompleto: participante.nomeCompleto,
      usaNomeSocial: participante.usaNomeSocial,
      nomeSocial: participante.nomeSocial || '',
      genero: participante.genero,
      nascimento: String(participante.nascimento).slice(0, 10),
      cpf: participante.cpf,
      email: participante.email,
      telefone: mascaraTel(participante.telefone),
    })
  }, [participante])

  if (!participante || !form) return null

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    try {
      setParticipante(await api('/inscricoes/eu', { method: 'PATCH', body: form }))
      setEditando(false)
      setOk('Dados atualizados.')
    } catch (err) {
      setErro(err.message)
    }
  }

  async function sair() {
    await api('/inscricoes/sair', { method: 'POST' })
    setParticipante(null)
    nav('/')
  }

  /** Executa uma acao numa inscricao e atualiza a conta com a resposta. */
  async function agir(caminho, body, mensagem, method = 'POST') {
    setErro('')
    setOk('')
    try {
      const r = await api(caminho, { method, body })
      if (r.conta) setParticipante(r.conta)
      else setParticipante(await api('/inscricoes/eu'))
      // Vagas das atividades mudam a cada inscricao, cancelamento ou troca.
      api('/eventos').then((d) => setEventos(d.eventos)).catch(() => {})
      if (mensagem) setOk(mensagem)
      return true
    } catch (err) {
      setErro(err.message)
      return false
    }
  }

  const ativas = new Set(participante.inscricoes.filter((i) => i.status !== 'cancelada').map((i) => i.evento.id))
  const outrosAbertos = eventos.filter((e) => aceitaInscricao(e) && !ativas.has(e.id))

  return (
    <div className="min-h-full bg-pet-paper">
      <header className="flex items-center justify-between bg-pet-navy px-4 py-3 text-white">
        <Link to="/" className="text-[14px] font-semibold">PET Saúde Digital</Link>
        <button type="button" onClick={sair} className="text-[13px] text-white/70">Sair</button>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-display text-pet-deep">Minhas inscrições</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase">
          <span className="border border-pet-navy/20 px-2 py-0.5 text-pet-navy">Participante nº {participante.numero}</span>
        </div>
        {ok && <p className="mt-3 text-[13px] text-pet-navy">{ok}</p>}
        {erro && <p className="mt-3 text-[13px] text-pet-orange">{erro}</p>}

        {!editando ? (
          <section className="mt-5 border border-pet-navy/15 bg-white p-4 text-[13.5px] text-pet-navy">
            <div className="flex items-baseline justify-between">
              <p className="label text-pet-navy/40">Meus dados</p>
              <button type="button" onClick={() => setEditando(true)} className="text-[12px] text-pet-navy/60 underline">
                Corrigir dados
              </button>
            </div>
            <p className="mt-2 font-semibold text-pet-deep">{participante.nome}</p>
            <p>{participante.email}</p>
            <p>{mascaraTel(participante.telefone)} · CPF {mascaraCpf(participante.cpf)}</p>
          </section>
        ) : (
          <form onSubmit={salvar} className="mt-5 border border-pet-navy bg-white p-4">
            <p className="label mb-2 text-pet-navy/45">Corrigir dados</p>
            <Campo rotulo="Nome completo">
              <input className={classeInput} value={form.nomeCompleto} onChange={(e) => setForm({ ...form, nomeCompleto: e.target.value })} />
            </Campo>
            <label className="mb-3 flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={form.usaNomeSocial} onChange={(e) => setForm({ ...form, usaNomeSocial: e.target.checked })} />
              Quero usar nome social
            </label>
            {form.usaNomeSocial && (
              <Campo rotulo="Nome social">
                <input className={classeInput} value={form.nomeSocial} onChange={(e) => setForm({ ...form, nomeSocial: e.target.value })} />
              </Campo>
            )}
            <Campo rotulo="Gênero">
              <select className={classeInput} value={form.genero} onChange={(e) => setForm({ ...form, genero: e.target.value })}>
                {GENEROS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Telefone">
              <input className={classeInput} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: mascaraTel(e.target.value) })} />
            </Campo>
            <Campo rotulo="E-mail" hint="Para mudar, fale com a organização">
              <input className={`${classeInput} bg-pet-ice`} value={form.email} disabled />
            </Campo>
            <Campo rotulo="CPF" hint="Para mudar, fale com a organização">
              <input className={`${classeInput} bg-pet-ice`} value={mascaraCpf(form.cpf)} disabled />
            </Campo>
            <button className="mt-2 w-full bg-pet-orange py-2.5 text-[13px] font-semibold text-white">Salvar alterações</button>
            <button type="button" onClick={() => setEditando(false)} className="mt-2 w-full py-2 text-[13px] text-pet-navy/60">
              Voltar
            </button>
          </form>
        )}

        {outrosAbertos.length > 0 && (
          <button
            type="button"
            onClick={() => abrir(outrosAbertos.length === 1 ? outrosAbertos[0].id : null)}
            className="mt-3 w-full bg-pet-orange py-2.5 text-[13px] font-semibold text-white"
          >
            {outrosAbertos.length === 1 ? `Inscrever-se em ${outrosAbertos[0].nome}` : 'Inscrever-se em outro evento'}
          </button>
        )}

        <div className="mt-5 space-y-3">
          {participante.inscricoes.length === 0 && (
            <p className="text-[13px] text-pet-navy/60">Você ainda não tem inscrições.</p>
          )}
          {participante.inscricoes.map((i) => (
            <CartaoInscricao
              key={i.id}
              insc={i}
              evento={eventos.find((e) => e.id === i.evento.id)}
              reembolso={config ? Number(config.percentualReembolso) : 100}
              agir={agir}
            />
          ))}
        </div>

        <div className="mt-4">
          <AvisoDocumento />
        </div>
      </main>
    </div>
  )
}

function CartaoInscricao({ insc, evento, reembolso, agir }) {
  const [alterando, setAlterando] = useState(false)
  const [escolhidas, setEscolhidas] = useState([])
  const [confirmar, setConfirmar] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [pedindo, setPedindo] = useState(false)

  const pendente = insc.status === 'aguardando_pix' || insc.status === 'aguardando_gratuidade'
  const podeAlterar = pendente && evento?.atividades.length > 0
  const base = `/inscricoes/${insc.id}`

  function comecarAlteracao() {
    setEscolhidas(insc.atividades.map((a) => a.id))
    setAlterando(true)
  }

  async function salvarAtividades() {
    const r = await agir(`${base}/atividades`, { atividades: escolhidas }, 'Atividades atualizadas.', 'PATCH')
    if (r) setAlterando(false)
  }

  return (
    <section className="border border-pet-navy/15 bg-white p-4 text-[13.5px] text-pet-navy">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-pet-deep">{insc.evento.nome}</p>
          <p className="text-[12px] text-pet-navy/60">{formatarPeriodo(insc.evento.dataInicio, insc.evento.dataFim)}</p>
        </div>
        <span
          className={`flex-none px-2 py-0.5 text-[10.5px] font-semibold uppercase ${insc.status === 'pago' ? 'bg-pet-navy text-white' : 'border border-pet-navy/30 text-pet-navy'}`}
        >
          {rotuloStatus[insc.status]}
        </span>
      </div>

      {!alterando ? (
        <>
          <p className="label mt-3 text-pet-navy/40">Atividades ({insc.atividades.length})</p>
          <ul className="mt-1 space-y-0.5 text-[13px]">
            {insc.atividades.map((a) => (
              <li key={a.id}>
                <span className="label mr-1.5 text-pet-navy/45">{dataCurta(a.data)}</span>
                {a.titulo}
              </li>
            ))}
            {!insc.atividades.length && <li className="text-pet-navy/60">Nenhuma atividade escolhida</li>}
          </ul>
        </>
      ) : (
        <div className="mt-3">
          <p className="label mb-1 text-pet-navy/40">Escolha as atividades</p>
          {evento.atividades.map((a) => {
            const jaTem = escolhidas.includes(a.id)
            const bloqueada = a.esgotada && !insc.atividades.some((x) => x.id === a.id)
            return (
              <label key={a.id} className={`mb-1 flex gap-2 text-[13px] ${bloqueada ? 'text-pet-navy/40' : ''}`}>
                <input
                  type="checkbox"
                  disabled={bloqueada}
                  checked={jaTem}
                  onChange={(e) =>
                    setEscolhidas(e.target.checked ? [...escolhidas, a.id] : escolhidas.filter((id) => id !== a.id))
                  }
                />
                <span>
                  <span className="label mr-1.5 text-pet-navy/45">{dataCurta(a.data)}</span>
                  {a.titulo}
                  {a.precoExtra > 0 && <span className="ml-1 text-pet-orange">+ {reais(a.precoExtra)}</span>}
                  {bloqueada && <span className="ml-1 uppercase">esgotada</span>}
                </span>
              </label>
            )
          })}
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={salvarAtividades} className="bg-pet-navy px-3 py-1.5 text-[12px] font-semibold text-white">
              Salvar
            </button>
            <button type="button" onClick={() => setAlterando(false)} className="border border-pet-navy/20 px-3 py-1.5 text-[12px] font-semibold">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <p className="mt-3 text-[12.5px] text-pet-navy/70">Valor: {insc.valor > 0 ? reais(insc.valor) : 'sem custo'}</p>

      {insc.status === 'aguardando_pix' && (
        <div className="mt-3 border-t border-pet-navy/10 pt-3">
          {insc.pix ? (
            <>
              <p className="label text-pet-navy/40">Código Pix</p>
              <p className="mt-1 break-all border border-pet-navy/15 bg-pet-paper px-2 py-2 text-[11px] text-pet-navy/70">
                {insc.pix.payload}
              </p>
              <button
                type="button"
                className="mt-2 w-full border border-pet-navy/20 py-2 text-[13px] font-semibold text-pet-navy"
                onClick={() => navigator.clipboard.writeText(insc.pix.payload)}
              >
                Copiar código Pix
              </button>
              <button
                type="button"
                className="mt-1 text-[11px] text-pet-navy/40 underline"
                onClick={() => agir('/webhooks/dev/simular-pix', { inscricaoId: insc.id }, 'Pagamento simulado.')}
              >
                Simular pagamento (sem chave Asaas)
              </button>
            </>
          ) : (
            <button
              type="button"
              className="w-full bg-pet-orange py-2.5 text-[13px] font-semibold text-white"
              onClick={() => agir(`${base}/pix`)}
            >
              Gerar Pix · {reais(insc.valor)}
            </button>
          )}
          {!pedindo ? (
            <button type="button" className="mt-2 block text-[12px] text-pet-navy/60 underline" onClick={() => setPedindo(true)}>
              Não posso pagar — pedir gratuidade
            </button>
          ) : (
            <div className="mt-2">
              <textarea
                className={`${classeInput} h-20 py-2`}
                placeholder="Conte por que pede isenção da taxa"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
              <button
                type="button"
                onClick={() => agir(`${base}/gratuidade`, { motivo }, 'Pedido de gratuidade enviado.')}
                className="mt-2 w-full bg-pet-navy py-2 text-[13px] font-semibold text-white"
              >
                Enviar pedido
              </button>
            </div>
          )}
        </div>
      )}

      {!alterando && (
        <div className="mt-3 flex flex-wrap gap-2">
          {podeAlterar && (
            <button type="button" onClick={comecarAlteracao} className="bg-pet-navy px-3 py-1.5 text-[12px] font-semibold text-white">
              Alterar atividades
            </button>
          )}
          {insc.status === 'pago' && (
            <button
              type="button"
              className="border border-pet-navy/20 px-3 py-1.5 text-[12px] font-semibold text-pet-navy"
              onClick={() => agir(`${base}/reenviar`, undefined, 'Comprovante reenviado (ou gravado em outbox).')}
            >
              Reenviar comprovante
            </button>
          )}
          {insc.status !== 'cancelada' && (
            <button
              type="button"
              onClick={() => setConfirmar(true)}
              className="border border-pet-orange px-3 py-1.5 text-[12px] font-semibold text-pet-orange"
            >
              Cancelar inscrição
            </button>
          )}
        </div>
      )}

      {confirmar && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-pet-ink/50 p-4">
          <div className="w-full max-w-sm bg-white p-5">
            <p className="font-semibold text-pet-deep">Cancelar a inscrição em {insc.evento.nome}?</p>
            <p className="mt-2 text-[13px] text-pet-navy/70">
              {insc.podeCancelar === false
                ? 'O prazo de cancelamento configurado pela organização já passou. Fale com a organização.'
                : insc.status === 'pago' && insc.valor > 0
                  ? `A vaga será liberada. O percentual de reembolso configurado é ${reembolso}%, mas a devolução do Pix não é automática.`
                  : 'A vaga será liberada e a cobrança Pix em aberto, se houver, será cancelada.'}
            </p>
            {insc.podeCancelar !== false && (
              <button
                type="button"
                onClick={async () => {
                  await agir(`${base}/cancelar`)
                  setConfirmar(false)
                }}
                className="mt-4 w-full bg-pet-orange py-2.5 text-[13px] font-semibold text-white"
              >
                Sim, cancelar
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmar(false)}
              className="mt-2 w-full border border-pet-navy/20 py-2 text-[13px] font-semibold text-pet-navy"
            >
              Manter inscrição
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
