import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Despre',
  description:
    'Unul la un milion e un joc gratuit despre România, făcut de Sistemigro pentru 1 Decembrie.',
  alternates: { canonical: '/despre' },
}

export default function Despre() {
  return (
    <article className="px-5 py-8">
      <h1 className="font-display text-2xl font-bold">Despre joc</h1>

      <p className="mt-5 text-[15px] leading-relaxed">
        <strong>Unul la un milion</strong> e un joc gratuit de cultură generală despre
        România. Ideea e simplă: la fiecare întrebare toată lumea știe câteva răspunsuri,
        dar puține persoane merg mai departe. Jocul premiază exact asta — cu cât
        răspunsul tău e mai rar, cu atât primești mai multe puncte.
      </p>

      <p className="mt-4 text-[15px] leading-relaxed">
        Fiecare răspuns coase o regiune istorică pe o hartă a României. Harta de la
        final e a ta și nu seamănă cu a nimănui.
      </p>

      <h2 className="font-display mt-8 text-xl font-bold">Cine l-a făcut</h2>
      <p className="mt-3 text-[15px] leading-relaxed">
        Jocul e făcut de{' '}
        <a
          href="https://sistemigro.com?utm_source=unul-la-un-milion&utm_medium=despre"
          target="_blank"
          rel="noopener"
        >
          Sistemigro
        </a>
        , un studio care construiește aplicații web. L-am făcut pentru 1 Decembrie, în
        câteva zile, ca să arătăm ce se poate construi repede și cu grijă.
      </p>

      <h2 className="font-display mt-8 text-xl font-bold">Întrebări și greșeli</h2>
      <p className="mt-3 text-[15px] leading-relaxed">
        Băncile de răspunsuri sunt scrise și verificate de oameni, așa că se poate
        strecura o greșeală sau poate lipsi un răspuns corect. Dacă dai peste una,
        scrie-ne și o corectăm.
      </p>
      <p className="mt-3 text-[15px]">
        <a href="mailto:contact@sistemigro.com">contact@sistemigro.com</a>
      </p>
    </article>
  )
}
