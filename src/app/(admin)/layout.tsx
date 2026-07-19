import Link from 'next/link'
import { BookOpen, GraduationCap, FileText, Download, LayoutTemplate, Images, Blocks, Settings } from 'lucide-react'

const nav = [
  { href: '/layout-editor', label: 'Layout',        icon: LayoutTemplate },
  { href: '/content-blocks', label: 'Contentblöcke', icon: Blocks },
  { href: '/images',         label: 'Bilder',        icon: Images },
  { href: '/classes',        label: 'Klassen',       icon: GraduationCap },
  { href: '/pages',          label: 'Seiten',        icon: FileText },
  { href: '/export',         label: 'PDF Export',    icon: Download },
  { href: '/settings',       label: 'Einstellungen', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-200 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900 text-sm">Jahrbuch CMS</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 text-xs text-gray-400">
          Montessori Schule Kaufering
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
