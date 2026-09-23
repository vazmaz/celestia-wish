import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  selectSessionUser,
  useAuthStore,
} from '../../auth/store/authStore'
import { useChatStore } from '../../chat/store/chatStore'
import { CHAT_MUTE_PRESETS } from '../../chat/types'

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AdminChatPanel() {
  const me = useAuthStore(selectSessionUser)
  const messages = useChatStore((s) => s.messages)
  const mutes = useChatStore((s) => s.mutes)
  const loadError = useChatStore((s) => s.loadError)
  const loadMessages = useChatStore((s) => s.loadMessages)
  const loadMutes = useChatStore((s) => s.loadMutes)
  const deleteMessage = useChatStore((s) => s.deleteMessage)
  const muteUser = useChatStore((s) => s.muteUser)
  const unmuteUser = useChatStore((s) => s.unmuteUser)

  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [muteUserId, setMuteUserId] = useState('')
  const [muteMinutes, setMuteMinutes] = useState<number>(60)
  const [muteReason, setMuteReason] = useState('')

  const sorted = useMemo(
    () => [...messages].sort((a, b) => b.createdAt - a.createdAt),
    [messages],
  )

  useEffect(() => {
    void loadMessages()
    void loadMutes()
    const id = window.setInterval(() => {
      void loadMessages()
      void loadMutes()
    }, 4000)
    return () => window.clearInterval(id)
  }, [loadMessages, loadMutes])

  if (!me) return null

  const onDelete = async (id: string) => {
    setError(null)
    setMessage(null)
    const result = await deleteMessage(id)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setMessage('Сообщение удалено')
  }

  const onMuteFromRow = async (userId: string, username: string) => {
    setError(null)
    setMessage(null)
    const result = await muteUser(userId, 60 * 24, 'Модерация чата')
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setMessage(`@${username} в муте на 24 часа`)
  }

  const onMuteSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    const result = await muteUser(
      muteUserId.trim(),
      muteMinutes,
      muteReason.trim() || undefined,
    )
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setMessage('Мут применён')
    setMuteReason('')
  }

  const onUnmute = async (userId: string, username: string) => {
    setError(null)
    setMessage(null)
    const result = await unmuteUser(userId)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setMessage(`Мут @${username} снят`)
  }

  return (
    <div className="admin-chat">
      <div className="admin-chat__intro">
        <h2>Модерация чата</h2>
        <p className="form-hint">
          Удаление сообщений и мут пользователей. Живой чат справа на сайте
          обновляется автоматически.
        </p>
        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-ok">{message}</p>}
        {loadError && <p className="form-error">{loadError}</p>}
      </div>

      <div className="admin-chat__grid">
        <section className="admin-chat__panel">
          <h3>Последние сообщения</h3>
          {sorted.length === 0 ? (
            <p className="form-hint">Сообщений пока нет.</p>
          ) : (
            <ul className="admin-chat__list">
              {sorted.map((m) => (
                <li key={m.id} className="admin-chat__row">
                  <div className="admin-chat__row-main">
                    <div className="admin-chat__row-top">
                      <strong>@{m.username}</strong>
                      <time>{formatTime(m.createdAt)}</time>
                    </div>
                    <p>{m.body}</p>
                  </div>
                  <div className="admin-chat__row-actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--tiny"
                      onClick={() => void onDelete(m.id)}
                    >
                      Удалить
                    </button>
                    {m.userId !== me.id && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--tiny"
                        onClick={() => {
                          setMuteUserId(m.userId)
                          void onMuteFromRow(m.userId, m.username)
                        }}
                      >
                        Мут 24ч
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-chat__panel">
          <h3>Муты</h3>
          <form className="admin-chat__mute-form" onSubmit={onMuteSubmit}>
            <label className="auth-field">
              ID пользователя
              <input
                className="text-input"
                value={muteUserId}
                onChange={(e) => setMuteUserId(e.target.value)}
                placeholder="cuid…"
                required
              />
            </label>
            <label className="auth-field">
              Срок
              <select
                className="text-input"
                value={muteMinutes}
                onChange={(e) => setMuteMinutes(Number(e.target.value))}
              >
                {CHAT_MUTE_PRESETS.map((p) => (
                  <option key={p.label} value={p.minutes}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="auth-field">
              Причина
              <input
                className="text-input"
                value={muteReason}
                onChange={(e) => setMuteReason(e.target.value)}
                maxLength={200}
                placeholder="Необязательно"
              />
            </label>
            <button type="submit" className="btn">
              Замутить
            </button>
          </form>

          {mutes.length === 0 ? (
            <p className="form-hint">Активных мутов нет.</p>
          ) : (
            <ul className="admin-chat__list">
              {mutes.map((m) => (
                <li key={m.userId} className="admin-chat__row">
                  <div className="admin-chat__row-main">
                    <div className="admin-chat__row-top">
                      <strong>@{m.username}</strong>
                      <time>до {formatTime(m.chatMutedUntil)}</time>
                    </div>
                    {m.chatMuteReason && <p>{m.chatMuteReason}</p>}
                  </div>
                  <div className="admin-chat__row-actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--tiny"
                      onClick={() => void onUnmute(m.userId, m.username)}
                    >
                      Снять
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
