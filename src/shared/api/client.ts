const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(
  /\/$/,
  '',
)

export function getApiUrl(): string {
  if (!API_URL) {
    throw new Error(
      'VITE_API_URL не задан. Создай .env с адресом Railway API (см. .env.example).',
    )
  }
  return API_URL
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options
  const res = await fetch(`${getApiUrl()}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  let body: unknown = null
  const text = await res.text()
  if (text) {
    try {
      body = JSON.parse(text) as unknown
    } catch {
      body = { error: text }
    }
  }

  if (!res.ok) {
    const message =
      body &&
      typeof body === 'object' &&
      'error' in body &&
      typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `Ошибка ${res.status}`
    throw new ApiError(res.status, message)
  }

  return body as T
}
