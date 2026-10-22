import { API_BASE_URL } from '@/api/config';
import { getToken } from '@/auth/storage';
import { emitUnauthorized } from '@/auth/sessionEvents';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function parseError(res: Response) {
  let message = 'حدث خطأ غير متوقع';
  let details: unknown;
  try {
    const data = await res.json();
    details = data;
    message =
      data?.detail ||
      data?.message ||
      (typeof data === 'string' ? data : message);
    if (Array.isArray(data?.detail)) {
      message = data.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(' · ') || message;
    }
  } catch {
    // ignore
  }
  return new ApiError(message, res.status, details);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean; formData?: boolean } = {},
): Promise<T> {
  const { auth = true, formData = false, headers, ...rest } = options;
  const finalHeaders = new Headers(headers || {});

  if (!formData && !finalHeaders.has('Content-Type') && rest.body) {
    finalHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = await getToken();
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
  });

  if (res.status === 401) {
    // Sync AuthContext + storage; do not wipe storage alone (that caused "login every open")
    emitUnauthorized();
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
