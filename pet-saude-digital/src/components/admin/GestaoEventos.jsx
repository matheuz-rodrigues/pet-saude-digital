import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { formatarPeriodo, rotuloSituacao, situacaoEvento } from '../../lib/datas'
import { rotuloTaxa } from '../../lib/dinheiro'
import Campo, { classeInput } from '../inscricao/Campo'
import GestaoAtividades from './GestaoAtividades'

const VAZIO = {
  nome: '',
  chamada: '',
  descricao: '',
  dataInicio: '',
  dataFim: '',
  local: '',
  tipo: 'simples',
  taxa: 0,
  inscricoesAbertas: true,
  publicado: true,
}

const TIPOS_EVENTO = [
  { id: 'simples', rotulo: 'Simples', descricao: 'Só divulgação, sem inscrição' },
  { id: 'completo', rotulo: 'Completo', descricao: 'Com atividades e inscrição pelo site' },
]

/**
 * Incremento 1 — cadastro de eventos (criar, editar, publicar/ocultar e apagar).
 * Incremento 3 — evento completo, com taxa, inscricao e atividades proprias.
 */
export default function GestaoEventos() {
  const [eventos, setEventos] = useState([])
  const [editando, setEditando] = useState(null)
  const [comAtividades, setComAtividades] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api('/admin/eventos')
      .then((d) => setEventos(d.eventos))
      .catch((err) => setErro(err.message))
  }, [])

  async function apagar(e) {
    if (!confirm(`Apagar "${e.nome}"? As atividades dele vão junto. As notícias ligadas continuam, sem evento.`)) return
    setErro('')
    try {
      const d = await api(`/admin/eventos/${e.id}`, { method: 'DELETE' })
      setEventos(d.eventos)
    } catch (err) {
      setErro(err.message)
    }
  }

  return (
    <div className="space-y-2">
      {erro && <p className="text-[13px] text-pet-orange">{erro}</p>}
      {eventos.length === 0 && !erro && <p className="text-[13px] text-pet-navy/50">Nenhum evento cadastrado.</p>}

      {eventos.map((e) =>
        editando === e.id ? (
          <FormEvento
            key={e.id}
            inicial={e}
            aoSalvar={(lista) => {
              setEventos(lista)
              setEditando(null)
            }}
            aoCancelar={() => setEditando(null)}
          />
        ) : (
          <div key={e.id}>
            <div className="flex flex-wrap items-center gap-3 border border-pet-navy/10 bg-white p-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-pet-deep">{e.nome}</p>
                <p className="text-[11px] uppercase text-pet-navy/45">
                  {formatarPeriodo(e.dataInicio, e.dataFim)} · {rotuloSituacao[situacaoEvento(e.dataInicio, e.dataFim)]}
                  {!e.publicado && <span className="text-pet-orange"> · oculto</span>}
                </p>
                <p className="mt-0.5 text-[11.5px] text-pet-navy/60">
                  {e.tipo === 'completo'
                    ? `Completo · ${rotuloTaxa(e.taxa)} · ${e.atividades.length} atividade(s) · inscrições ${e.inscricoesAbertas ? 'abertas' : 'fechadas'}`
                    : 'Simples · só divulgação'}
                </p>
              </div>
              <div className="flex gap-2">
                {e.tipo === 'completo' && (
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-[12px] font-semibold ${comAtividades === e.id ? 'bg-pet-deep text-white' : 'border border-pet-navy/25 text-pet-navy'}`}
                    onClick={() => setComAtividades(comAtividades === e.id ? null : e.id)}
                  >
                    Atividades
                  </button>
                )}
                <button
                  type="button"
                  className="bg-pet-navy px-3 py-1.5 text-[12px] font-semibold text-white"
                  onClick={() => setEditando(e.id)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="border border-pet-orange px-3 py-1.5 text-[12px] font-semibold text-pet-orange"
                  onClick={() => apagar(e)}
                >
                  Apagar
                </button>
              </div>
            </div>
            {comAtividades === e.id && (
              <GestaoAtividades
                evento={e}
                aoMudar={(lista) => setEventos(eventos.map((x) => (x.id === e.id ? { ...x, atividades: lista } : x)))}
              />
            )}
          </div>
        ),
      )}

      <FormEvento inicial={VAZIO} aoSalvar={setEventos} />
    </div>
  )
}

function FormEvento({ inicial, aoSalvar, aoCancelar }) {
  const novo = !inicial.id
  const [dados, setDados] = useState(inicial)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const campo = (nome) => ({
    value: dados[nome],
    onChange: (e) => setDados({ ...dados, [nome]: e.target.value }),
  })

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    setErro('')
    try {
      const d = await api(novo ? '/admin/eventos' : `/admin/eventos/${inicial.id}`, {
        method: novo ? 'POST' : 'PUT',
        body: dados,
      })
      if (novo) setDados(VAZIO)
      aoSalvar(d.eventos)
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form
      onSubmit={enviar}
      className={`border bg-white p-3 ${novo ? 'mt-4 border-dashed border-pet-navy/25' : 'border-pet-navy'}`}
    >
      <p className="label mb-2 text-pet-navy/45">{novo ? 'Novo evento' : 'Editando evento'}</p>
      <div className="grid gap-x-3 sm:grid-cols-2">
        <Campo rotulo="Nome" obrigatorio>
          <input className={classeInput} {...campo('nome')} required />
        </Campo>
        <Campo rotulo="Local">
          <input className={classeInput} {...campo('local')} placeholder="Campus, sala, cidade" />
        </Campo>
        <Campo rotulo="Início" obrigatorio>
          <input type="date" className={classeInput} {...campo('dataInicio')} required />
        </Campo>
        <Campo rotulo="Término" hint="Em branco = evento de um dia só">
          <input type="date" className={classeInput} {...campo('dataFim')} min={dados.dataInicio} />
        </Campo>
      </div>
      <p className="mb-1.5 text-[12px] font-semibold text-pet-navy">Tipo de evento</p>
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        {TIPOS_EVENTO.map((t) => (
          <label
            key={t.id}
            className={`flex items-start gap-2 border px-2.5 py-2 text-[13px] ${dados.tipo === t.id ? 'border-pet-navy' : 'border-pet-navy/15'}`}
          >
            <input
              type="radio"
              className="mt-0.5"
              checked={dados.tipo === t.id}
              onChange={() => setDados({ ...dados, tipo: t.id })}
            />
            <span>
              <span className="block font-semibold text-pet-deep">{t.rotulo}</span>
              <span className="block text-[11.5px] text-pet-navy/60">{t.descricao}</span>
            </span>
          </label>
        ))}
      </div>
      {dados.tipo === 'completo' && (
        <div className="mb-3 grid items-end gap-x-3 sm:grid-cols-2">
          <Campo rotulo="Taxa de inscrição (R$)" hint="0 = gratuito">
            <input type="number" min="0" step="0.01" className={classeInput} {...campo('taxa')} />
          </Campo>
          <label className="mb-3 flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={dados.inscricoesAbertas}
              onChange={(e) => setDados({ ...dados, inscricoesAbertas: e.target.checked })}
            />
            Inscrições abertas
          </label>
          <p className="text-[11.5px] text-pet-navy/55 sm:col-span-2">
            As atividades são cadastradas depois de salvar, no botão Atividades do evento.
          </p>
        </div>
      )}
      <Campo rotulo="Chamada" hint="Uma frase que resume o evento (até 280 caracteres)">
        <input className={classeInput} maxLength={280} {...campo('chamada')} />
      </Campo>
      <Campo rotulo="Descrição" hint="Deixe uma linha em branco para separar parágrafos">
        <textarea rows={4} className={`${classeInput} h-auto py-2`} {...campo('descricao')} />
      </Campo>
      <label className="mb-3 flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={dados.publicado}
          onChange={(e) => setDados({ ...dados, publicado: e.target.checked })}
        />
        Publicado no site
      </label>
      {erro && <p className="mb-2 text-[12px] text-pet-orange">{erro}</p>}
      <div className="flex gap-2">
        <button
          disabled={enviando}
          className={`px-4 py-2 text-[12px] font-semibold text-white ${novo ? 'bg-pet-orange' : 'bg-pet-navy'}`}
        >
          {novo ? 'Cadastrar' : 'Salvar'}
        </button>
        {aoCancelar && (
          <button
            type="button"
            className="border border-pet-navy/20 px-4 py-2 text-[12px] font-semibold text-pet-navy"
            onClick={aoCancelar}
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
