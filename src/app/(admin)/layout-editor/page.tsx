'use client'
import { useEffect, useState } from 'react'
import { PAGE_TEMPLATES } from '@/lib/templates'
import type { Page, PageType } from '@/types'
import { Plus, Trash2, ChevronUp, ChevronDown, Eye, LayoutTemplate } from 'lucide-react'
import Link from 'next/link'

export default function LayoutEditorPage() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<{ title: string; type: PageType }>({ title: '', type: 'class_page' })

  useEffect(() => {
    fetch('/api/pages')
      .then((r) => r.json())
      .then((data) => { setPages(data); setLoading(false) })
  }, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const template = PAGE_TEMPLATES.find((t) => t.type === form.type)!
    const res = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, blocks: template.defaultBlocks, order_index: pages.length }),
    })
    const data = await res.json()
    setPages((p) => [...p, data])
    setForm({ title: '', type: 'class_page' })
    setAdding(false)
  }

  const remove = async (id: string) => {
    await fetch(`/api/pages/${id}`, { method: 'DELETE' })
    setPages((p) => p.filter((pg) => pg.id !== id))
  }

  const move = async (index: number, dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= pages.length) return
    const updated = [...pages]
    ;[updated[index], updated[next]] = [updated[next], updated[index]]
    const reindexed = updated.map((pg, i) => ({ ...pg, order_index: i }))
    setPages(reindexed)
    await Promise.all(
      reindexed.map((pg) =>
        fetch(`/api/pages/${pg.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_index: pg.order_index }),
        })
      )
    )
  }

  if (loading) return <div className="p-8 text-gray-500">Laden…</div>

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Layout</h1>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Seite hinzufügen
        </button>
      </div>

      {adding && (
        <form onSubmit={add} className="bg-white border border-blue-200 rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              autoFocus
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
          <p className="text-xs text-gray-400">
            {PAGE_TEMPLATES.find((t) => t.type === form.type)?.description}
          </p>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
              Hinzufügen
            </button>
            <button type="button" onClick={() => setAdding(false)} className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors">
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        {PAGE_TEMPLATES.map((t) => (
          <span key={t.type} className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
            {t.label}
          </span>
        ))}
      </div>

      <div className="space-y-2">
        {pages.map((pg, i) => {
          const tpl = PAGE_TEMPLATES.find((t) => t.type === pg.type)
          return (
            <div key={pg.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => move(i, -1)} disabled={i === 0}
                  className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === pages.length - 1}
                  className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <span className="text-xs font-mono text-gray-300 w-5 text-right">{i + 1}</span>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${templateColor(pg.type)}`} />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm text-gray-900 truncate block">{pg.title}</span>
                <span className="text-xs text-gray-400">{tpl?.label}</span>
              </div>
              <Link href={`/pages/${pg.id}/preview`} className="text-gray-300 hover:text-blue-500 transition-colors">
                <Eye className="w-4 h-4" />
              </Link>
              <button onClick={() => remove(pg.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )
        })}
        {pages.length === 0 && (
          <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <LayoutTemplate className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Noch keine Seiten – füge die erste Seite hinzu.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function templateColor(type: string) {
  switch (type) {
    case 'cover':        return 'bg-rose-400'
    case 'back_cover':   return 'bg-rose-300'
    case 'class_page':   return 'bg-blue-400'
    case 'student_page': return 'bg-green-400'
    case 'event_page':   return 'bg-yellow-400'
    case 'editorial':    return 'bg-purple-400'
    default:             return 'bg-gray-400'
  }
}
