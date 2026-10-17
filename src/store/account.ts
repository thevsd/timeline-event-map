/**
 * Accounts, kept by the server in server/ and reached at /api on the page's own address.
 * The session is a cookie the browser sends by itself; nothing is stored here.
 */

export interface Account {
  username: string;
}

/** A new account or a reset password comes with a fresh recovery code, shown once. */
export interface WithCode extends Account {
  recoveryCode: string;
}

/** A refusal worth showing as it is: a wrong password, a taken name, too many attempts. */
export class AccountError extends Error {}

/** What the server said, in a sentence. */
async function problemOf(res: Response): Promise<string> {
  if (res.status === 429) {
    const minutes = Math.max(1, Math.ceil(Number(res.headers.get('Retry-After') ?? 60) / 60));
    return `Too many attempts from your network. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
  }
  try {
    const problem = (await res.json()) as { detail?: string; errors?: Record<string, string[]> };
    if (problem.errors) return Object.values(problem.errors).flat().join(' ');
    if (problem.detail) return problem.detail;
  } catch {
    // Not JSON: fall through.
  }
  return 'The account server did not answer as expected. Try again in a moment.';
}

async function post<T>(path: string, body: object = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new AccountError('The account server cannot be reached.');
  }
  if (!res.ok) throw new AccountError(await problemOf(res));
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/**
 * Who is signed in: the account, null when no one is, or 'offline' when there is no account
 * server to ask (a page opened from disk, or an exported copy).
 */
export async function whoAmI(): Promise<Account | null | 'offline'> {
  try {
    const res = await fetch('/api/auth/me');
    if (res.status === 401) return null;
    return res.ok ? ((await res.json()) as Account) : 'offline';
  } catch {
    return 'offline';
  }
}

// `altcha` is the solved robot check from the ALTCHA widget; the server wants a new one for every attempt.
export const signup = (username: string, password: string, altcha: string) => post<WithCode>('signup', { username, password, altcha });
export const login = (username: string, password: string, altcha: string) => post<Account>('login', { username, password, altcha });
export const recover = (username: string, recoveryCode: string, newPassword: string, altcha: string) =>
  post<WithCode>('recover', { username, recoveryCode, newPassword, altcha });
export const logout = () => post<void>('logout');
