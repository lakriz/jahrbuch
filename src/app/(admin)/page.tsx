import { BookOpen, FileText, Download, Images, Settings } from 'lucide-react'
import Link from 'next/link'

const cards = [
  { href: '/images',   label: 'Bilder',          icon: Images,   color: 'bg-pink-50   text-pink-700',   desc: 'Fotos hochladen & verwalten' },
  { href: '/texts',    label: 'Texte',           icon: FileText, color: 'bg-indigo-50 text-indigo-700', desc: 'Texte bearbeiten & organisieren' },
  { href: '/export',   label: 'Exportbereich',   icon: Download, color: 'bg-orange-50 text-orange-700', desc: 'PDF generieren & Daten exportieren' },
  { href: '/settings', label: 'Einstellungen',   icon: Settings, color: 'bg-gray-50   text-gray-700',   desc: 'Buchformat & Grundeinstellungen' },
]

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center gap-3">
        <BookOpen className="w-7 h-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jahrbuch CMS</h1>
          <p className="text-sm text-gray-500">Montessori Schule Kaufering</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {cards.map(({ href, label, icon: Icon, color, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-4 p-5 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className={`p-2 rounded-lg ${color} flex-shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">{label}</div>
              <div className="text-xs text-gray-500 mt-1">{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
