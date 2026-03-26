// Landing page pública de Gorres PET

import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-green-800">Gorres</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">PET</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#com-funciona" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">Com funciona</a>
            <a href="#productes" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">Productes</a>
            <Link href="/comanda" className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 transition-all">
              Demana pressupost
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full mb-6">
            ♻️ Gorres fetes de plàstic PET reciclat
          </span>
          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
            Gorres artesanals.<br />
            <span className="text-green-700">100% sostenibles.</span>
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
            Cada gorra Gorres PET està teixida amb fil extret d&apos;ampolles de plàstic reciclades. Personalitzades per a empreses, events, ajuntaments i colles.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/comanda" className="px-8 py-4 bg-green-700 text-white font-bold text-lg rounded-2xl hover:bg-green-800 transition-all shadow-lg shadow-green-200">
              Configura la teva comanda →
            </Link>
            <a href="#com-funciona" className="px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold text-lg rounded-2xl hover:border-gray-400 transition-all">
              Com funciona
            </a>
          </div>
          <p className="text-sm text-gray-400 mt-6">Sense registre · Pressupost en 2 minuts · Resposta en 24h</p>
        </div>
      </section>

      {/* Com funciona */}
      <section id="com-funciona" className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Com funciona</h2>
          <p className="text-gray-500 text-center mb-12">3 passos senzills</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                num: '1',
                title: 'Configures la comanda',
                desc: 'Tria el tipus de gorra, color, logo i quantitat. Veus el preu en temps real.',
                icon: '⚙️',
              },
              {
                num: '2',
                title: 'Rep el pressupost',
                desc: 'En menys de 24h confirmes la comanda i fas el 50% de bestreta.',
                icon: '📄',
              },
              {
                num: '3',
                title: 'Reps les gorres',
                desc: 'Producció artesanal en 21 dies hàbils. Lliurament local o enviament nacional.',
                icon: '📦',
              },
            ].map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                  {step.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Productes */}
      <section id="productes" className="px-6 py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Tipus de gorres</h2>
          <p className="text-gray-500 text-center mb-12">Des de la gorra bàsica fins al pack souvenir per a events</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { name: 'Bàsica',       price: '6€',  desc: 'Natural',         color: '#D4C4A8' },
              { name: 'amb Logo',     price: '11€', desc: 'Natural + logo',   color: '#D4C4A8' },
              { name: 'Color + Logo', price: '13€', desc: '10 colors',        color: '#2E5FAA' },
              { name: 'Deluxe',       price: '22€', desc: 'Pack premium',     color: '#2C3E50' },
              { name: 'Souvenir',     price: '25€', desc: 'Capsa individual', color: '#8E44AD' },
            ].map((p) => (
              <div key={p.name} className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100">
                <div
                  className="w-14 h-14 rounded-full mx-auto mb-3 border-4 border-white shadow-sm"
                  style={{ backgroundColor: p.color }}
                />
                <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                <p className="text-green-700 font-bold">{p.price}</p>
                <p className="text-xs text-gray-400">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500 mb-4">Descomptes per volum a partir de 25 unitats (fins -25%)</p>
            <Link href="/comanda" className="inline-block px-8 py-3 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition-all">
              Calcula el teu preu →
            </Link>
          </div>
        </div>
      </section>

      {/* Per a qui */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">Per a qui?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { icon: '🏢', label: 'Empreses',    desc: 'Merchandising corporatiu sostenible' },
              { icon: '🏛️', label: 'Ajuntaments', desc: 'Regals institucionals locals' },
              { icon: '🎉', label: 'Events',       desc: 'Concerts, festivals, fires' },
              { icon: '⛷️', label: 'Colles i clubs', desc: 'Esports, excursionisme, cultura' },
            ].map((c) => (
              <div key={c.label} className="p-5 rounded-2xl bg-gray-50">
                <div className="text-4xl mb-2">{c.icon}</div>
                <p className="font-semibold text-gray-900 mb-1">{c.label}</p>
                <p className="text-xs text-gray-500">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impacte */}
      <section className="px-6 py-16 bg-green-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">L&apos;impacte de cada gorra</h2>
          <p className="text-green-200 mb-10 max-w-2xl mx-auto">
            Cada gorra Gorres PET es fabrica amb fil obtingut del reciclatge d&apos;ampolles de plàstic PET. Un procés artesanal que dona una segona vida als residus de la teva comarca.
          </p>
          <div className="grid grid-cols-3 gap-8">
            {[
              { num: '~8',   label: 'ampolles per gorra' },
              { num: '0',    label: 'microplàstics alliberats' },
              { num: '100%', label: 'producció local' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-4xl font-bold text-green-300">{s.num}</p>
                <p className="text-green-200 text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">Preguntes freqüents</h2>
          <div className="space-y-6">
            {[
              { q: 'Quin és el mínim de comanda?', a: '10 unitats. Però els descomptes per volum comencen a partir de 25 unitats.' },
              { q: 'Quan triguen a arribar?', a: 'El termini estàndard és de 21 dies hàbils des de la confirmació de la comanda. Hi ha opció urgència (7 dies) amb recàrrec del 20%.' },
              { q: 'Com funciona el pagament?', a: '50% de bestreta en confirmar la comanda (Bizum, transferència o efectiu) i el 50% restant en rebre les gorres.' },
              { q: "Podeu entregar fora del Valles?", a: "Si! La recollida local es gratuita (Valles i provincia). Per a enviaments nacionals apliquem el cost de missatgeria." },
            ].map((faq) => (
              <div key={faq.q} className="border-b border-gray-100 pb-6">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-500 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-16 bg-green-50 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Llest per demanar?</h2>
        <p className="text-gray-500 mb-8">Configura la teva comanda en 2 minuts. Sense registre.</p>
        <Link href="/comanda" className="inline-block px-10 py-4 bg-green-700 text-white font-bold text-lg rounded-2xl hover:bg-green-800 transition-all shadow-lg shadow-green-200">
          Demana pressupost →
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 border-t border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <div className="font-bold text-gray-700">Gorres PET</div>
          <div className="flex gap-6">
            <a href="mailto:comandes@gorrespet.cat" className="hover:text-gray-600">comandes@gorrespet.cat</a>
            <a href="https://wa.me/34600000000" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">WhatsApp</a>
            <a href="/admin" className="hover:text-gray-600">Admin</a>
          </div>
          <p>Valles · provincia · Catalunya</p>
        </div>
      </footer>
    </main>
  )
}
