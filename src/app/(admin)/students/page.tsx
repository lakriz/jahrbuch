'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Student, Class } from '@/types'
import { UserPlus, Trash2 } from 'lucide-react'

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', class_id: '', bio_text: '' })

  useEffect(() => {
    Promise.all([
      supabase.from('students').select('*').order('name'),
      supabase.from('classes').select('*').order('name'),
    ]).then(([s, c]) => {
      if (s.data) setStudents(s.data)
      if (c.data) setClasses(c.data)
      setLoading(false)
    })
  }, [])

  const addClass = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data } = await supabase.from('students').insert(form).select().single()
    if (data) setStudents((p) => [...p, data])
    setForm({ name: '', class_id: '', bio_text: '' })
  }

  const remove = async (id: string) => {
    await supabase.from('students').delete().eq('id', id)
    setStudents((p) => p.filter((s) => s.id !== id))
  }

  if (loading) return <div className="p-8 text-gray-500">Laden…</div>

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Schüler</h1>

      {/* Add form */}
      <form onSubmit={addClass} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={form.class_id}
            onChange={(e) => setForm((p) => ({ ...p, class_id: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Klasse wählen…</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <textarea
          placeholder="Steckbrief (optional)"
          value={form.bio_text}
          onChange={(e) => setForm((p) => ({ ...p, bio_text: e.target.value }))}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Schüler hinzufügen
        </button>
      </form>

      {/* List */}
      <div className="space-y-2">
        {students.map((s) => {
          const cls = classes.find((c) => c.id === s.class_id)
          return (
            <div key={s.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div>
                <span className="font-medium text-sm text-gray-900">{s.name}</span>
                {cls && <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{cls.name}</span>}
                {s.bio_text && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-sm">{s.bio_text}</p>}
              </div>
              <button onClick={() => remove(s.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )
        })}
        {students.length === 0 && <p className="text-sm text-gray-400">Noch keine Schüler angelegt.</p>}
      </div>
    </div>
  )
}
