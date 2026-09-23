import { useCallback, useMemo, useState, type CSSProperties } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { CaseContents } from '../components/CaseContents'
import { ResultModal } from '../../../shared/components/opening/ResultModal'
import { Roulette } from '../../../shared/components/opening/Roulette'
import { sfx } from '../../../shared/lib/sfx'
import { getCaseById } from '../data/cases'
import { usePlayerStore } from '../../inventory/store/playerStore'
import type { CaseItem } from '../../../shared/types'

type Phase = 'idle' | 'spinning' | 'result'

export function CasePage() {
  const { caseId = '' } = useParams()
  const caseDef = useMemo(() => getCaseById(caseId), [caseId])

  const balance = usePlayerStore((s) => s.balance)
  const openCase = usePlayerStore((s) => s.openCase)
  const clearLastDrop = usePlayerStore((s) => s.clearLastDrop)
  const lastDrop = usePlayerStore((s) => s.lastDrop)

  const [phase, setPhase] = useState<Phase>('idle')
  const [winner, setWinner] = useState<CaseItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canAfford = caseDef ? balance >= caseDef.price : false

  const handleOpen = useCallback(() => {
    if (!caseDef || phase === 'spinning') return
    setError(null)
    clearLastDrop()

    const result = openCase(caseDef.id)
    if (!result.ok) {
      setError(
        result.reason === 'insufficient'
          ? 'Недостаточно средств. Пополни баланс кнопкой «+» в шапке.'
          : 'Кейс не найден.',
      )
      return
    }

    setWinner(result.dropped)
    setPhase('spinning')
    sfx.unlock()
    sfx.caseOpen()
  }, [caseDef, phase, openCase, clearLastDrop])

  const handleSpinDone = useCallback(() => {
    setPhase('result')
    if (winner) sfx.reveal(winner.rarity)
  }, [winner])

  const handleCloseResult = useCallback(() => {
    setPhase('idle')
    setWinner(null)
    clearLastDrop()
  }, [clearLastDrop])

  if (!caseDef) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="page case-page">
      <Link to="/" className="back-link">
        ← Все баннеры
      </Link>

      <section
        className="case-stage"
        style={{ '--case-theme': caseDef.theme } as CSSProperties}
      >
        <div className="case-stage__glow" aria-hidden />

        <header className="case-stage__head">
          <div>
            <h1>{caseDef.name}</h1>
            <p>{caseDef.description}</p>
          </div>
          <div className="case-stage__price">
            <span>Цена</span>
            <strong>{caseDef.price} кристаллов</strong>
          </div>
        </header>

        <div className="case-stage__opening">
          {phase === 'idle' && !winner && (
            <div className="case-stage__idle" aria-hidden>
              <img
                className="case-stage__cover"
                src={caseDef.image}
                alt=""
              />
            </div>
          )}

          {(phase === 'spinning' || phase === 'result') && winner && (
            <Roulette
              pool={caseDef.items}
              winner={winner}
              spinning={phase === 'spinning'}
              onDone={handleSpinDone}
            />
          )}

          {phase === 'idle' && (
            <button
              type="button"
              className="btn btn--primary btn--xl open-cta"
              onClick={handleOpen}
              disabled={!canAfford}
            >
              Сделать Wish · {caseDef.price} кристаллов
            </button>
          )}

          {error && <p className="form-error">{error}</p>}
          {!canAfford && phase === 'idle' && (
            <p className="form-hint">Не хватает баланса для этого кейса.</p>
          )}
        </div>
      </section>

      <CaseContents items={caseDef.items} />

      <ResultModal
        item={phase === 'result' ? lastDrop : null}
        onClose={handleCloseResult}
        onOpenAgain={() => {
          handleCloseResult()
          window.setTimeout(() => handleOpen(), 40)
        }}
        canOpenAgain={canAfford}
      />
    </div>
  )
}
