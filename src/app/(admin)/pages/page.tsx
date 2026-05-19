'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PAGE_TEMPLATES } from '@/lib/templates'
import type { Page, PageType } from '@/types'
import { Plus, Trash2, GripVertical, Eye } from 'lucide-react'
import Link from 'next/link'

export default function PagesPage() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<{ title: string; type: PageType }>({ title: '', type: 'class_page' })

  useEffect(() => {
    supabase.from('pages').select('*').order('order_index').then(({ data }) => {
      if (data) setPages(data)
      setLoading(false)
    })
  }, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const template = PAGE_TEMPLATES.find((t) => t.type === form.type)!
    const { data } = await supabase
      .from('pages')
      .insert({ ...form, blocks: template.defaultBlocks, order_index: pages.length })
      .select()
      .single()
    if (data) setPages((p) => [...p, data])
    setForm({ title: '', type: 'class_page' })
  }

  const remove = async (id: string) => {
    await supabase.from('pages').delete().eq('id', id)
    setPages((p) => p.filter((pg) => pg.id !== id))
  }

  if (loading) return <div className="p-8 text-gray-500">Laden…</div>

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Jahrbuch-Seiten</h1>

      {/* Add form */}
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
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Seite erstellen
        </button>
      </form>

      {/* Page list */}
      <div className="space-y-2">
        {pages.map((pg, i) => {
          const tpl = PAGE_TEMPLATES.find((t) => t.type === pg.type)
          return (
            <div key={pg.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
              <GripVertical className="w-4 h-4 text-gray-300" />
              <span className="text-xs text-gray-400 w-5">{i + 1}</span>
              <div className="flex-1">
                <span className="font-medium text-sm text-gray-900">{pg.title}</span>
                <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{tpl?.label}</span>
              </div>
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
