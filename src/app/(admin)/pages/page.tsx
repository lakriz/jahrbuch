'use client'
import { useEffect, useState } from 'react'
import { PAGE_TEMPLATES } from '@/lib/templates'
import type { Page, PageType } from '@/types'
import { Plus, Trash2, GripVertical, Eye } from 'lucide-react'
import Link from 'next/link'

export default function PagesPage() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<{ title: string; type: PageType }>({ title: '', type: 'class_page' })

  useEffect(() => {
    fetch('/api/pages')
      .then((r) => r.json())
      .then((data) => { setPages(data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const template = PAGE_TEMPLATES.find((t) => t.type === form.type)!
    const res = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, blocks: template.defaultBlocks, order_index: pages.length }),
    })
    setSaving(false)
    if (!res.ok) { setError('Fehler beim Erstellen'); return }
    const data = await res.json()
    setPages((p) => [...p, data])
    setForm({ title: '', type: 'class_page' })
  }

  const remove = async (id: string) => {
    await fetch(`/api/pages/${id}`, { method: 'DELETE' })
    setPages((p) => p.filter((pg) => pg.id !== id))
  }

  if (loading) return <div className="p-8 text-gray-500">Laden…</div>

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Jahrbuch-Seiten</h1>

      <form onSubmit={add} className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            required
            placeholder="Seitentitel"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as PageType }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PAGE_TEMPLATES.map((t) => (
              <option key={t.type} value={t.type}>{t.label}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          {PAGE_TEMPLATES.find((t) => t.type === form.type)?.description}
        </p>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" /> {saving ? 'Erstellen…' : 'Seite erstellen'}
        </button>
      </form>

      {error && <p className="mb-6 text-sm text-red-500">{error}</p>}

      <div className="space-y-2">
        {pages.map((pg, i) => {
          const tpl = PAGE_TEMPLATES.find((t) => t.type === pg.type)
          return (
            <div key={pg.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
              <Link href={`/pages/${pg.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <span className="text-xs text-gray-400 w-5 flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm text-gray-900 truncate block">{pg.title}</span>
                  <span className="mt-1 inline-block text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{tpl?.label}</span>
                </div>
              </Link>
              <Link href={`/pages/${pg.id}/preview`} className="text-gray-400 hover:text-blue-500 transition-colors">
                <Eye className="w-4 h-4" />
              </Link>
              <button onClick={() => remove(pg.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )
        })}
        {pages.length === 0 && <p className="text-sm text-gray-400">Noch keine Seiten erstellt.</p>}
      </div>
    </div>
  )
}
