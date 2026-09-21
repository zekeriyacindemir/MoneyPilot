'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { getAuthErrorMessage } from './auth-error';
import { AuthShell, AuthField, AuthFormError, authInputClassName, authButtonClassName } from './components/auth-ui';

export function PasswordRecovery({ reset = false }: { reset?: boolean }) {
 const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
 const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
 async function submit(event: FormEvent<HTMLFormElement>) {
   event.preventDefault(); setError(null);
   if (reset && password !== confirmation) { setError('Şifreler eşleşmiyor.'); return; }
   setBusy(true);
   try {
     if (reset) { await apiClient.post('/auth/reset-password', { token: window.location.hash.slice(1), password }); window.history.replaceState(null, '', '/reset-password'); }
     else await apiClient.post('/auth/forgot-password', { email });
     setDone(true);
   } catch (reason) { setError(getAuthErrorMessage(reason)); } finally { setBusy(false); }
 }
 return <AuthShell title={reset ? 'Yeni bir başlangıç' : 'Şifreni mi unuttun?'} description={reset ? 'Hesabın için yeni ve güçlü bir şifre belirle.' : 'E-posta adresine tek kullanımlık bir yenileme bağlantısı iste.'}>
 {done ? <p role="status" className="rounded-xl border bg-[var(--success-muted)] p-4 text-sm leading-6 text-[var(--success)]">{reset ? 'Şifren güncellendi. Tüm oturumlar kapatıldı; yeni şifrenle giriş yapabilirsin.' : 'Bu adresle bir hesap varsa yenileme bağlantısı gönderilecektir. Gelen kutunu ve spam klasörünü kontrol et.'}</p> : <form onSubmit={submit} className="space-y-5">
 {reset ? <><AuthField htmlFor="new-password" label="Yeni şifre" helper="En az 8 karakter."><input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required className={authInputClassName} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy} /></AuthField><AuthField htmlFor="confirm-password" label="Şifreyi tekrar gir" helper="İki şifre aynı olmalıdır."><input id="confirm-password" type="password" autoComplete="new-password" required className={authInputClassName} value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={busy} /></AuthField></> : <AuthField htmlFor="recovery-email" label="E-posta" helper="Hesabına bağlı e-posta adresi."><input id="recovery-email" type="email" autoComplete="email" required className={authInputClassName} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy} /></AuthField>}
 <AuthFormError error={error}/><button className={authButtonClassName} disabled={busy}>{busy ? 'İşleniyor…' : reset ? 'Şifremi yenile' : 'Bağlantı iste'}</button></form>}
 <div className="mt-6 flex justify-between text-sm font-medium text-[var(--primary)]"><Link href="/login">← Girişe dön</Link>{reset ? <Link href="/forgot-password">Yeni bağlantı iste</Link> : null}</div>
 </AuthShell>;
}
