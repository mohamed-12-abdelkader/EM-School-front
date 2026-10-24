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

/** True auth failures — do not treat DB/proxy 401s (or empty bodies) as logout. */
const AUTH_FAILURE_MESSAGES = new Set([
  'unauthorized',
  'invalid token',
  'user not found',
  'session expired or replaced',
]);

function isAuthFailureMessage(message: string) {
  return AUTH_FAILURE_MESSAGES.has(message.trim().toLowerCase());
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

/** Fail fast on dead DB — keep above typical Aiven latency for heavier student queries. */
const DEFAULT_TIMEOUT_MS = 20_000;

export async function apiFetch<T>(
  path: string,
  options: RequestInit & {
    auth?: boolean;
    formData?: boolean;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const {
    auth = true,
    formData = false,
    headers,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: outerSignal,
    ...rest
  } = options;
  const finalHeaders = new Headers(headers || {});

  if (!formData && !finalHeaders.has('Content-Type') && rest.body) {
    finalHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = await getToken();
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const onOuterAbort = () => controller.abort();
  if (outerSignal) {
    if (outerSignal.aborted) controller.abort();
    else outerSignal.addEventListener('abort', onOuterAbort, { once: true });
  }
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await parseError(res);
      // Only clear session on real auth failures — not DB timeouts mislabeled as 401,
      // and never on 503/network-style service errors.
      if (res.status === 401 && isAuthFailureMessage(err.message)) {
        emitUnauthorized();
      }
      throw err;
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    if (
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError')
    ) {
      throw new ApiError('انتهت مهلة الاتصال بالخادم. حاول مرة أخرى', 0);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    outerSignal?.removeEventListener('abort', onOuterAbort);
  }
}
