import Link from 'next/link';
import { BrandLogo } from '@/features/brand/brand-logo';
import { Icon } from '@/features/dashboard/components/icons';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="border-b bg-[var(--card)]">
        <nav
          aria-label="Ana menü"
          className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8"
        >
          <Link href="/" aria-label="MoneyPilot ana sayfa">
            <BrandLogo className="h-12 w-44" priority />
          </Link>
          <div className="flex items-center gap-4 sm:gap-7">
            <a
              href="#nasil-calisir"
              className="hidden text-sm text-[var(--muted-foreground)] sm:block"
            >
              Nasıl çalışır?
            </a>
            <Link href="/login" className="text-sm font-semibold">
              Giriş yap
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-foreground)]"
            >
              Başla <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </nav>
      </header>
      <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)]">
            <span className="size-1.5 rounded-full bg-[var(--success)]" /> Kişisel finansına yeni
            bir bakış
          </span>
          <h1 className="mt-7 max-w-xl text-5xl font-semibold leading-[1.12] tracking-[-0.05em] sm:text-6xl lg:text-[4.4rem]">
            Paranı anla.
            <br />
            <span className="text-[var(--primary)]">Yarınına yön ver.</span>
          </h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-[var(--muted-foreground)]">
            Gelirini, harcamalarını ve hedeflerini bir araya getir. Nerede olduğunu gör, bir sonraki
            adımını güvenle planla.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link
              href="/register"
              className="inline-flex items-center gap-4 rounded-xl bg-[var(--primary)] px-6 py-4 font-semibold text-[var(--primary-foreground)]"
            >
              Yolculuğuna başla <span aria-hidden="true">→</span>
            </Link>
            <a href="#nasil-calisir" className="text-sm font-semibold">
              MoneyPilot’u keşfet ↓
            </a>
          </div>
          <p className="mt-5 text-xs text-[var(--muted-foreground)]">
            Kayıtlarını sen yönet. Kararlarını sen ver.
          </p>
        </div>
        <div className="relative">
          <div className="rounded-[2rem] border bg-[var(--muted)] p-3 sm:p-5">
            <div className="overflow-hidden rounded-2xl border bg-[var(--card)] shadow-xl shadow-slate-900/5">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <span className="text-sm font-semibold">Finansal görünüm</span>
                <span className="rounded-full bg-[var(--secondary)] px-2.5 py-1 text-[10px] font-semibold text-[var(--secondary-foreground)]">
                  ÖRNEK VERİLER
                </span>
              </div>
              <div className="p-5 sm:p-7">
                <div className="rounded-2xl bg-[#162b49] p-6 text-white">
                  <p className="text-xs text-blue-100/75">Toplam bakiye</p>
                  <p className="money-number mt-2 text-4xl font-semibold">
                    ₺42.850<span className="text-2xl text-blue-100/60">,00</span>
                  </p>
                  <div className="mt-6 flex gap-8 border-t border-white/15 pt-4">
                    <div>
                      <p className="text-xs text-blue-100/70">Gelir</p>
                      <p className="mt-1 text-sm font-medium">↗ ₺35.000</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-100/70">Gider</p>
                      <p className="mt-1 text-sm font-medium">↘ ₺18.650</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm font-semibold">Birikim yolculuğun</p>
                  <span className="text-xs text-[var(--muted-foreground)]">Bu ay</span>
                </div>
                <div className="mt-4 flex h-28 items-end gap-3" aria-label="Örnek birikim grafiği">
                  {[30, 44, 38, 62, 72, 100].map((h, i) => (
                    <div key={i} className="flex h-full flex-1 flex-col justify-end gap-2">
                      <div
                        className={
                          i === 5
                            ? 'rounded-t-md bg-[var(--primary)]'
                            : 'rounded-t-md bg-[var(--secondary)]'
                        }
                        style={{ height: h + '%' }}
                      />
                      <span className="text-center text-[9px] text-[var(--muted-foreground)]">
                        {['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz'][i]}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-3 rounded-xl border p-3">
                  <span className="rounded-lg bg-[var(--success-muted)] p-2 text-[var(--success)]">
                    <Icon name="target" className="size-5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold">Acil durum fonu</p>
                    <div className="mt-2 h-1.5 rounded-full bg-[var(--muted)]">
                      <div className="h-full w-3/5 rounded-full bg-[var(--success)]" />
                    </div>
                  </div>
                  <span className="text-xs font-semibold">%60</span>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">
            Sade bir görünüm. Daha bilinçli kararlar.
          </p>
        </div>
      </section>
      <section id="nasil-calisir" className="border-y bg-[var(--card)]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <p className="text-xs font-semibold tracking-[.15em] text-[var(--primary)]">
            KONTROL SENDE
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Finansal alışkanlıkların için bir başlangıç.
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                number: '01',
                title: 'Görünür hâle getir',
                body: 'Gelir ve giderlerini kaydet. Paranın nereye gittiğini tek bir yerden takip et.',
                icon: 'arrows' as const,
              },
              {
                number: '02',
                title: 'Kendine alan aç',
                body: 'Kategorilere bütçe ayır. Harcamalarını planınla karşılaştır ve sınırlarını tanı.',
                icon: 'wallet' as const,
              },
              {
                number: '03',
                title: 'Hedefine yaklaş',
                body: 'Birikim hedefini belirle. İlerlemeni takip et ve küçük adımları alışkanlığa dönüştür.',
                icon: 'target' as const,
              },
            ].map((item) => (
              <article key={item.number} className="rounded-2xl border p-7">
                <div className="flex items-center justify-between">
                  <Icon name={item.icon} className="size-6 text-[var(--primary)]" />
                  <span className="text-sm text-[var(--muted-foreground)]">{item.number}</span>
                </div>
                <h3 className="mt-7 text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <footer className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 py-8 text-xs text-[var(--muted-foreground)] sm:flex-row sm:px-8">
        <span>MoneyPilot · Finansal yolculuğun sana ait.</span>
        <span>AI Asistan geliştirme aşamasında.</span>
      </footer>
    </main>
  );
}
