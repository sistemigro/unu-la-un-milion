import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Confidențialitate',
  description:
    'Ce date colectează Unu’ la un milion: progresul rămâne în browserul tău, răspunsurile se salvează anonim.',
  alternates: { canonical: '/confidentialitate' },
}

export default function Confidentialitate() {
  return (
    <article className="px-5 py-8">
      <h1 className="font-display text-2xl font-bold">Confidențialitate</h1>
      <p className="mt-2 text-sm text-muted">Actualizat: 27 noiembrie 2026</p>

      <p className="mt-5 text-[15px] leading-relaxed">
        Jocul nu are conturi și nu îți cere nicio informație personală. Nu colectăm
        nume, adrese de e-mail, adrese IP sau identificatori de utilizator.
      </p>

      <h2 className="font-display mt-8 text-xl font-bold">Ce rămâne în browserul tău</h2>
      <p className="mt-3 text-[15px] leading-relaxed">
        Progresul tău — scorurile, hărțile și pachetele terminate — se salvează doar în
        memoria locală a browserului tău (<em>localStorage</em>). Nu ajunge la noi și nu
        îl putem citi. Dacă ștergi datele site-ului, progresul dispare definitiv.
      </p>

      <h2 className="font-display mt-8 text-xl font-bold">Ce salvăm anonim</h2>
      <p className="mt-3 text-[15px] leading-relaxed">
        Când trimiți un răspuns, salvăm pe serverele noastre (Supabase, în Uniunea
        Europeană):
      </p>
      <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-relaxed">
        <li>întrebarea la care ai răspuns;</li>
        <li>textul răspunsului, așa cum l-ai scris, și forma lui normalizată;</li>
        <li>dacă a fost acceptat și câte puncte a primit;</li>
        <li>în câte secunde ai răspuns;</li>
        <li>data și ora.</li>
      </ul>
      <p className="mt-3 text-[15px] leading-relaxed">
        Nu salvăm adresa IP, browserul folosit sau orice altceva care te-ar putea
        identifica. Înregistrările nu pot fi legate între ele, așa că nu știm ce
        răspunsuri vin de la aceeași persoană.
      </p>
      <p className="mt-3 text-[15px] leading-relaxed">
        Le folosim ca să recalibrăm punctajele după cât de des apare fiecare răspuns și
        ca să găsim răspunsurile corecte pe care le-am omis din listă.
      </p>
      <p className="mt-3 text-[15px] leading-relaxed">
        Textul scris de tine este text liber. Te rugăm să nu scrii în el informații
        personale. <strong>Ștergem textul brut după 90 de zile</strong> și păstrăm doar
        forma normalizată, de care avem nevoie pentru punctaje.
      </p>

      <h2 className="font-display mt-8 text-xl font-bold">Statistici de trafic</h2>
      <p className="mt-3 text-[15px] leading-relaxed">
        Folosim Vercel Web Analytics, care numără vizitele fără cookie-uri și fără să
        urmărească persoane între site-uri.
      </p>

      <h2 className="font-display mt-8 text-xl font-bold">Reclame</h2>
      <p className="mt-3 text-[15px] leading-relaxed">
        Jocul nu afișează reclame și nu conține cod de publicitate. Dacă asta se
        schimbă, actualizăm pagina înainte.
      </p>

      <h2 className="font-display mt-8 text-xl font-bold">Drepturile tale</h2>
      <p className="mt-3 text-[15px] leading-relaxed">
        Pentru că nu colectăm date care te identifică, nu putem găsi „înregistrările
        tale” ca să le ștergem la cerere. Progresul îl ștergi singur, ștergând datele
        site-ului din browser. Pentru orice întrebare despre datele colectate, scrie-ne.
      </p>
      <p className="mt-3 text-[15px]">
        <a href="mailto:contact@sistemigro.com">contact@sistemigro.com</a>
      </p>
    </article>
  )
}
