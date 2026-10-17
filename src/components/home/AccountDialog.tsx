import 'altcha';
import 'altcha/types/react';
import type { AltchaWidgetElement } from 'altcha/types/generic';
import { useRef, useState, type FormEvent } from 'react';
import { AccountError, login, recover, signup, type Account, type WithCode } from '../../store/account';
import { Modal } from '../editor/dialogs';
import { Field } from '../editor/fields';

type Step = 'login' | 'signup' | 'recover';

const TITLES: Record<Step, string> = { login: 'Sign in', signup: 'Create an account', recover: 'Reset your password' };
const CONFIRMS: Record<Step, string> = { login: 'Sign in', signup: 'Create account', recover: 'Reset password' };
const PASSWORD_HINT = 'At least 10 characters. Common passwords are refused.';

/**
 * Sign in, create an account, or get back in with the recovery code. There is no email: a new
 * account and a reset password each end on the recovery code, which has to be saved to move on.
 */
export function AccountDialog({ onClose, onSignedIn }: { onClose(): void; onSignedIn(account: Account): void }) {
  const [step, setStep] = useState<Step>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<WithCode | null>(null);
  const robotCheck = useRef<AltchaWidgetElement>(null);

  if (issued) return <RecoveryCode issued={issued} onDone={onClose} />;

  const go = (next: Step) => {
    setStep(next);
    setProblem('');
  };

  const send = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    // The robot check has already run: the widget holds the submit until it is solved, then puts the proof in the form.
    const proof = String(new FormData(ev.currentTarget).get('altcha') ?? '');
    setBusy(true);
    setProblem('');
    try {
      if (step === 'login') {
        onSignedIn(await login(username, password, proof));
        onClose();
      } else {
        const result = step === 'signup' ? await signup(username, password, proof) : await recover(username, code, password, proof);
        onSignedIn(result);
        setIssued(result);
      }
    } catch (error) {
      setProblem(error instanceof AccountError ? error.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
      // Each proof works once, so the next attempt solves a new one.
      robotCheck.current?.reset();
    }
  };

  // Keyed by step, so each step starts in its first field.
  return (
    <Modal key={step} title={TITLES[step]} onClose={onClose}>
      <form onSubmit={(ev) => void send(ev)}>
        {step === 'signup' && (
          <p className="mtext">No email needed. You get a recovery code instead: it is the only way back in if you forget your password.</p>
        )}
        <Field label="Username" hint={step === 'signup' ? '3 to 32 letters, digits, dots, dashes or underscores.' : undefined}>
          <input type="text" autoComplete="username" spellCheck={false} required value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        {step === 'recover' && (
          <Field label="Recovery code" hint="The code you saved when you signed up, or at your last reset.">
            <input type="text" autoComplete="one-time-code" spellCheck={false} required value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
        )}
        <Field label={step === 'recover' ? 'New password' : 'Password'} hint={step === 'login' ? undefined : PASSWORD_HINT}>
          <PasswordInput autoComplete={step === 'login' ? 'current-password' : 'new-password'} value={password} onChange={setPassword} />
        </Field>
        <altcha-widget ref={robotCheck} challenge="/api/auth/challenge" auto="onsubmit" />
        {problem && (
          <p className="fhint bad" role="alert">
            {problem}
          </p>
        )}
        <div className="mactions">
          {step === 'login' ? (
            <>
              <button type="button" className="textbtn aside" onClick={() => go('recover')}>
                Forgot password?
              </button>
              <button type="button" className="textbtn" onClick={() => go('signup')}>
                Create an account
              </button>
            </>
          ) : (
            <button type="button" className="textbtn aside" onClick={() => go('login')}>
              Back to sign in
            </button>
          )}
          <button type="submit" className="textbtn primary" disabled={busy}>
            {CONFIRMS[step]}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** A password box with an eye button that shows or hides what was typed. */
function PasswordInput({ autoComplete, value, onChange }: { autoComplete: string; value: string; onChange(value: string): void }) {
  const [shown, setShown] = useState(false);
  return (
    <span className="pwrow">
      <input type={shown ? 'text' : 'password'} autoComplete={autoComplete} spellCheck={false} required value={value} onChange={(e) => onChange(e.target.value)} />
      <button
        type="button"
        className="iconbtn"
        aria-label={shown ? 'Hide password' : 'Show password'}
        title={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        onClick={() => setShown(!shown)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {shown && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </span>
  );
}

/** The recovery code, shown once. The pop-up stays until the code is marked as saved. */
function RecoveryCode({ issued, onDone }: { issued: WithCode; onDone(): void }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(issued.recoveryCode);
      setCopied(true);
    } catch {
      // The code is selectable; it can be copied by hand.
    }
  };
  return (
    <Modal title="Save your recovery code" onClose={() => saved && onDone()}>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          if (saved) onDone();
        }}
      >
        <p className="mtext">
          This code is the only way back into <strong>{issued.username}</strong> if you forget your password. It is shown only now. Write it down
          or keep it in a password manager.
        </p>
        <code className="recoverycode">{issued.recoveryCode}</code>
        <label className="check">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />I have saved my recovery code
        </label>
        <div className="mactions">
          <button type="button" className="textbtn aside" onClick={() => void copy()}>
            {copied ? 'Copied' : 'Copy code'}
          </button>
          <button type="submit" className="textbtn primary" disabled={!saved}>
            Continue
          </button>
        </div>
      </form>
    </Modal>
  );
}
