import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  selectSessionUser,
  useAuthStore,
} from '../../auth/store/authStore'
import { useChatStore } from '../store/chatStore'

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function useIsDesktopChat(): boolean {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 960px)').matches
      : true,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 960px)')
    const onChange = () => setDesktop(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return desktop
}

export function LiveChat() {
  const user = useAuthStore(selectSessionUser)
  const messages = useChatStore((s) => s.messages)
  const loadError = useChatStore((s) => s.loadError)
  const mutedUntil = useChatStore((s) => s.mutedUntil)
  const muteReason = useChatStore((s) => s.muteReason)
  const unread = useChatStore((s) => s.unread)
  const mobileOpen = useChatStore((s) => s.mobileOpen)
  const loadMessages = useChatStore((s) => s.loadMessages)
  const send = useChatStore((s) => s.send)
  const setMobileOpen = useChatStore((s) => s.setMobileOpen)
  const markSeen = useChatStore((s) => s.markSeen)

  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const desktop = useIsDesktopChat()

  const muted =
    mutedUntil != null &&
    mutedUntil > Date.now()
  const panelVisible = desktop || mobileOpen

  useEffect(() => {
    if (!user) return
    void loadMessages()
    const id = window.setInterval(() => {
      void loadMessages()
    }, 2500)
    return () => window.clearInterval(id)
  }, [user, loadMessages])

  useEffect(() => {
    if (panelVisible) markSeen()
  }, [panelVisible, markSeen, messages.length])

  useEffect(() => {
    if (!panelVisible) return
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, panelVisible])

  useEffect(() => {
    const me = useAuthStore.getState().user
    if (me) {
      useChatStore.setState({
        mutedUntil: me.chatMutedUntil ?? null,
        muteReason: me.chatMuteReason ?? null,
      })
    }
  }, [user?.chatMutedUntil, user?.chatMuteReason])

  if (!user) return null

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const body = text.trim()
    if (!body || pending) return
    setPending(true)
    setError(null)
    const result = await send(body)
    setPending(false)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setText('')
  }

  const panel = (
    <aside
      className={`live-chat${desktop ? ' live-chat--dock' : ' live-chat--sheet'}`}
      aria-label="Чат посетителей"
    >
      <header className="live-chat__head">
        <div>
          <p className="live-chat__eyebrow">Live</p>
          <h2>Чат</h2>
        </div>
        {!desktop && (
          <button
            type="button"
            className="btn btn--ghost btn--tiny"
            onClick={() => setMobileOpen(false)}
            aria-label="Закрыть чат"
          >
            ✕
          </button>
        )}
      </header>

      <div className="live-chat__list" ref={listRef}>
        {loadError && <p className="live-chat__hint is-error">{loadError}</p>}
        {!loadError && messages.length === 0 && (
          <p className="live-chat__hint">Пока тихо — напишите первым.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`live-chat__msg${m.userId === user.id ? ' is-mine' : ''}`}
          >
            <div className="live-chat__msg-meta">
              <span className="live-chat__user">@{m.username}</span>
              <time dateTime={new Date(m.createdAt).toISOString()}>
                {formatTime(m.createdAt)}
              </time>
            </div>
            <p>{m.body}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form className="live-chat__composer" onSubmit={onSubmit}>
        {muted && (
          <p className="live-chat__hint is-muted-banner">
            Мут
            {mutedUntil
              ? ` до ${new Date(mutedUntil).toLocaleString('ru-RU')}`
              : ''}
            {muteReason ? ` — ${muteReason}` : ''}
          </p>
        )}
        {error && <p className="live-chat__hint is-error">{error}</p>}
        <div className="live-chat__row">
          <input
            className="text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={muted ? 'Вы в муте' : 'Сообщение…'}
            maxLength={300}
            disabled={muted || pending}
            aria-label="Текст сообщения"
          />
          <button
            type="submit"
            className="btn btn--tiny"
            disabled={muted || pending || !text.trim()}
          >
            →
          </button>
        </div>
      </form>
    </aside>
  )

  return (
    <>
      {!desktop && (
        <button
          type="button"
          className={`live-chat-fab${mobileOpen ? ' is-open' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-controls="live-chat-sheet"
        >
          <span className="live-chat-fab__icon" aria-hidden>
            ✦
          </span>
          <span className="live-chat-fab__label">Чат</span>
          {unread > 0 && !mobileOpen && (
            <span className="live-chat-fab__badge">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      )}

      {desktop ? (
        panel
      ) : (
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.button
                type="button"
                key="chat-scrim"
                className="live-chat-scrim"
                aria-label="Закрыть чат"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
              />
              <motion.div
                key="chat-sheet"
                id="live-chat-sheet"
                className="live-chat-sheet-wrap"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              >
                {panel}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </>
  )
}
