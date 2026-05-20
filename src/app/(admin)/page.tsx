import { BookOpen, GraduationCap, FileText, Download, LayoutTemplate, Images, Blocks } from 'lucide-react'
import Link from 'next/link'

const cards = [
  { href: '/layout-editor',  label: 'Layout',        icon: LayoutTemplate, color: 'bg-blue-50   text-blue-700',   desc: 'Buch aus Templates zusammenstellen' },
  { href: '/content-blocks', label: 'Contentblöcke', icon: Blocks,         color: 'bg-violet-50 text-violet-700', desc: 'Wiederverwendbare Inhaltsblöcke' },
  { href: '/images',         label: 'Bilder',        icon: Images,         color: 'bg-pink-50   text-pink-700',   desc: 'Fotos hochladen & verwalten' },
  { href: '/classes',        label: 'Klassen',       icon: GraduationCap,  color: 'bg-green-50  text-green-700',  desc: 'Klassenzuordnungen' },
  { href: '/pages',          label: 'Seiten',        icon: FileText,       color: 'bg-purple-50 text-purple-700', desc: 'Templates & Inhalte' },
  { href: '/export',         label: 'PDF exportieren', icon: Download,     color: 'bg-orange-50 text-orange-700', desc: 'Druckfertiges Jahrbuch' },
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
      <div className="grid grid-cols-2 gap-4 max-w-xl">
        {cards.map(({ href, label, icon: Icon, color, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-4 p-5 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-gray-900 text-sm">{label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
