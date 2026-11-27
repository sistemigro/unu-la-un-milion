import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cum se joacă',
  description:
    'Șapte întrebări, 20 de secunde fiecare. Cu cât răspunsul tău e mai rar, cu atât primești mai multe puncte.',
  alternates: { canonical: '/cum-se-joaca' },
}

export default function CumSeJoaca() {
  return (
    <article className="px-5 py-8">
      <h1 className="font-display text-2xl font-bold">Cum se joacă</h1>

      <ol className="mt-5 flex flex-col gap-4 text-[15px] leading-relaxed">
        <li>
          <strong>Șapte întrebări.</strong> Fiecare joc are șapte întrebări, aceleași
          pentru toată lumea, ca să vă puteți compara scorurile.
        </li>
        <li>
          <strong>Un singur răspuns, 20 de secunde.</strong> Vezi întrebarea trei
          secunde, apoi pornește cronometrul. Scrii un răspuns și îl trimiți. Dacă nu e
          pe listă, poți încerca din nou cât mai ai timp.
        </li>
        <li>
          <strong>Răspunsurile rare valorează mai mult.</strong> Un răspuns pe care îl
          dă toată lumea îți aduce 10 puncte. Unul pe care aproape nimeni nu îl știe
          îți aduce 100. Maximum e 700.
        </li>
        <li>
          <strong>Fiecare răspuns coase o regiune.</strong> La final ai propria hartă a
          României, cusută în culorile punctajelor tale. Toate cele șapte pachete
          înseamnă Marea Unire completă.
        </li>
      </ol>

      <h2 className="font-display mt-8 text-xl font-bold">Punctajele</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="border-b-2 py-2 pr-4 font-bold">Nivel</th>
              <th className="border-b-2 py-2 pr-4 font-bold">Puncte</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-b py-2 pr-4">Unul la un milion</td>
              <td className="border-b py-2 pr-4">100</td>
            </tr>
            <tr>
              <td className="border-b py-2 pr-4">Rar</td>
              <td className="border-b py-2 pr-4">60</td>
            </tr>
            <tr>
              <td className="border-b py-2 pr-4">Bun</td>
              <td className="border-b py-2 pr-4">30</td>
            </tr>
            <tr>
              <td className="border-b py-2 pr-4">Clișeu</td>
              <td className="border-b py-2 pr-4">10</td>
            </tr>
            <tr>
              <td className="border-b py-2 pr-4">Ratat</td>
              <td className="border-b py-2 pr-4">0</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-muted">
        Scriem fără grijă la diacritice: „stefan cel mare” și „Ștefan cel Mare” sunt
        același răspuns. Și o literă greșită într-un nume lung tot se acceptă.
      </p>
    </article>
  )
}
