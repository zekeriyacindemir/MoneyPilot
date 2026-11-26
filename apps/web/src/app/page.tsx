import Link from 'next/link';
import { BrandLogo } from '@/features/brand/brand-logo';
import { Icon, type IconName } from '@/features/dashboard/components/icons';
import { AmbientVideo } from '@/features/landing/ambient-video';

const HERO_VIDEO = '/media/hero.mp4';
const HERO_POSTER = '/media/hero-poster.jpg';

const highlights = ['Gelir ve gider takibi', 'Bütçe ve birikim hedefleri', 'Akıllı bildirimler'];

const features: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'wallet',
    title: 'Bütçeler',
    body: 'Hazır ya da kendi oluşturduğun kategorilere sınır koy, aşmadan önce haberin olsun.',
  },
  {
    icon: 'target',
    title: 'Birikim hedefleri',
    body: 'Tatil, acil durum fonu ya da yeni bir bilgisayar. İlerlemeni adım adım izle.',
  },
  {
    icon: 'repeat',
    title: 'Tekrarlayan işlemler',
    body: 'Kira, maaş, abonelikler. Bir kez tanımla, her ay kendiliğinden eklensin.',
  },
  {
    icon: 'chart',
    title: 'Raporlar',
    body: 'Aylık gelir-gider dengeni ve kategorilere göre dağılımı tek bakışta gör.',
  },
  {
    icon: 'bell',
    title: 'Bildirimler',
    body: 'Bütçe uyarıları, hedef hatırlatmaları ve haftalık özet, uygulamada ve e-postada.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Görünür hâle getir',
    body: 'Gelir ve giderlerini kaydet. Paranın nereye gittiğini tek bir yerden takip et.',
  },
  {
    number: '02',
    title: 'Kendine alan aç',
    body: 'Kategorilere bütçe ayır. Harcamalarını planınla karşılaştır ve sınırlarını tanı.',
  },
  {
    number: '03',
    title: 'Hedefine yaklaş',
    body: 'Birikim hedefini belirle. Küçük adımları alışkanlığa dönüştür.',
  },
];

function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-[var(--card)] shadow-2xl shadow-black/10">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <span className="text-sm font-semibold">Finansal görünüm</span>
        <span className="rounded-full bg-[var(--gold-muted)] px-2.5 py-1 text-[10px] font-semibold text-[var(--gold)]">
          ÖRNEK VERİLER
        </span>
      </div>
      <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[1.1fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl bg-[#121317] p-6 text-white">
          <div className="absolute -top-16 -right-16 size-48 rounded-full bg-[#d6a443]/20 blur-3xl" />
          <p className="relative text-xs text-white/60">Toplam bakiye</p>
          <p className="money-number relative mt-2 text-4xl font-semibold">
            ₺42.850<span className="text-2xl text-white/45">,00</span>
          </p>
          <div className="relative mt-6 flex gap-8 border-t border-white/10 pt-4">
            <div>
              <p className="text-xs text-white/55">Gelir</p>
              <p className="mt-1 text-sm font-medium text-[#6bd4b2]">↗ ₺35.000</p>
            </div>
            <div>
              <p className="text-xs text-white/55">Gider</p>
              <p className="mt-1 text-sm font-medium text-[#f3b3a0]">↘ ₺18.650</p>
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--muted-foreground)]">Aylık birikim</p>
          <div className="mt-4 flex h-28 items-end gap-3" aria-label="Örnek birikim grafiği">
            {[30, 44, 38, 62, 72, 100].map((height, index) => (
              <div key={index} className="flex h-full flex-1 flex-col justify-end gap-2">
                <div
                  className={
                    index === 5
                      ? 'gold-button rounded-t-md shadow-none'
                      : 'rounded-t-md bg-[var(--muted)]'
                  }
                  style={{ height: height + '%' }}
                />
                <span className="text-center text-[9px] text-[var(--muted-foreground)]">
                  {['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz'][index]}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border p-3 md:col-span-2">
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
  );
}

export default function HomePage() {
  return (
    <main className="theme-gold min-h-screen">
      {/* Hero: full-bleed background video */}
      <section className="relative isolate flex min-h-[min(100svh,1000px)] flex-col overflow-hidden bg-[#0b0c0f] text-white">
        <AmbientVideo
          src={HERO_VIDEO}
          poster={HERO_POSTER}
          withControl
          className="absolute inset-0 -z-20 size-full scale-105"
        />
        <div className="absolute inset-0 -z-10 bg-[#0b0c0f]/70 lg:bg-transparent lg:bg-linear-to-r lg:from-[#0b0c0f]/95 lg:via-[#0b0c0f]/65 lg:to-[#0b0c0f]/5" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-linear-to-b from-transparent to-[#0b0c0f]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-32 bg-linear-to-b from-[#0b0c0f]/80 to-transparent" />

        <header>
          <nav
            aria-label="Ana menü"
            className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8"
          >
            <Link href="/" aria-label="MoneyPilot ana sayfa">
              <BrandLogo tone="light" />
            </Link>
            <div className="flex items-center gap-4 sm:gap-7">
              <a
                href="#ozellikler"
                className="hidden text-sm text-white/70 hover:text-white md:block"
              >
                Özellikler
              </a>
              <a
                href="#nasil-calisir"
                className="hidden text-sm text-white/70 hover:text-white md:block"
              >
                Nasıl çalışır?
              </a>
              <Link href="/login" className="text-sm font-semibold text-white/90 hover:text-white">
                Giriş yap
              </Link>
              <Link
                href="/register"
                className="glass-panel rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-white/15"
              >
                Başla <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </nav>
        </header>

        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 pt-10 pb-28 sm:px-8">
          <div className="max-w-2xl">
            <span className="reveal-up glass-panel inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-white/80">
              <span className="size-1.5 rounded-full bg-[#e6c06b]" /> Kişisel finansına yeni bir
              bakış
            </span>
            <h1
              className="reveal-up mt-7 text-5xl leading-[1.05] font-semibold tracking-[-0.045em] sm:text-6xl lg:text-[5.2rem]"
              style={{ animationDelay: '120ms' }}
            >
              Paranı anla.
              <br />
              <span className="gold-text">Yarınına yön ver.</span>
            </h1>
            <p
              className="reveal-up mt-7 max-w-lg text-lg leading-8 text-white/70"
              style={{ animationDelay: '240ms' }}
            >
              Gelirini, harcamalarını ve hedeflerini bir araya getir. Nerede olduğunu gör, bir
              sonraki adımını güvenle planla.
            </p>
            <div
              className="reveal-up mt-10 flex flex-wrap items-center gap-4"
              style={{ animationDelay: '360ms' }}
            >
              <Link
                href="/register"
                className="gold-button inline-flex items-center gap-3 rounded-xl px-6 py-4 font-semibold"
              >
                Yolculuğuna başla <span aria-hidden="true">→</span>
              </Link>
              <a
                href="#ozellikler"
                className="glass-panel inline-flex items-center gap-2 rounded-xl px-6 py-4 font-semibold text-white/90 hover:bg-white/15"
              >
                Keşfet <span aria-hidden="true">↓</span>
              </a>
            </div>
            <ul
              className="reveal-up mt-12 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/65"
              style={{ animationDelay: '480ms' }}
            >
              {highlights.map((item) => (
                <li key={item} className="inline-flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="size-4 text-[#e6c06b]" aria-hidden="true">
                    <path
                      d="m5 12.5 4.5 4.5L19 7.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="ozellikler"
        className="mx-auto max-w-7xl scroll-mt-8 px-5 py-20 sm:px-8 sm:py-28"
      >
        <p className="text-xs font-semibold tracking-[.18em] text-[var(--gold)]">NELER VAR?</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Paranla ilgili her şey, tek ve sakin bir ekranda.
        </h2>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <div className="rounded-[1.75rem] border bg-[var(--muted)] p-3 sm:p-4 lg:col-span-2 lg:row-span-2">
            <DashboardPreview />
            <p className="px-2 pt-4 pb-1 text-sm text-[var(--muted-foreground)]">
              Bakiyen, birikimin ve hedeflerin tek bakışta. Sade bir görünüm, daha bilinçli
              kararlar.
            </p>
          </div>
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group rounded-[1.75rem] border bg-[var(--card)] p-7 transition-transform duration-300 hover:-translate-y-1"
            >
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-[var(--gold-muted)] text-[var(--gold)]">
                <Icon name={feature.icon} className="size-5" />
              </span>
              <h3 className="mt-6 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
                {feature.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="nasil-calisir" className="scroll-mt-8 border-y bg-[var(--card)]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <p className="text-xs font-semibold tracking-[.18em] text-[var(--gold)]">KONTROL SENDE</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Üç adımda finansal düzen.
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((step) => (
              <li key={step.number} className="relative border-t pt-8">
                <span className="absolute -top-px left-0 h-px w-16 bg-[var(--gold)]" />
                <span className="money-number text-4xl font-semibold text-[var(--gold)]">
                  {step.number}
                </span>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing call to action, reusing the same video */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-[#0b0c0f] px-6 py-16 text-center text-white sm:px-16 sm:py-24">
          <AmbientVideo
            src={HERO_VIDEO}
            poster={HERO_POSTER}
            className="absolute inset-0 -z-20 size-full"
          />
          <div className="absolute inset-0 -z-10 bg-[#0b0c0f]/75" />
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
            Finansal yolculuğuna <span className="gold-text">bugün</span> başla.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-white/70">
            Hesabını birkaç saniyede oluştur, ilk işlemini ekle ve paranın hikâyesini görmeye başla.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="gold-button inline-flex items-center gap-3 rounded-xl px-6 py-4 font-semibold"
            >
              Hesap oluştur <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/login"
              className="glass-panel inline-flex items-center rounded-xl px-6 py-4 font-semibold hover:bg-white/15"
            >
              Giriş yap
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col justify-between gap-3 border-t px-5 py-8 text-xs text-[var(--muted-foreground)] sm:flex-row sm:px-8">
        <span>MoneyPilot · Finansal yolculuğun sana ait.</span>
        <span>AI Asistan geliştirme aşamasında.</span>
      </footer>
    </main>
  );
}
