'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Class } from '@/types'
import { Plus, Trash2 } from 'lucide-react'

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')

  useEffect(() => {
    supabase.from('classes').select('*').order('name').then(({ data }) => {
      if (data) setClasses(data)
      setLoading(false)
    })
  }, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data } = await supabase.from('classes').insert({ name }).select().single()
    if (data) setClasses((p) => [...p, data])
    setName('')
  }

  const remove = async (id: string) => {
    await supabase.from('classes').delete().eq('id', id)
    setClasses((p) => p.filter((c) => c.id !== id))
  }

  if (loading) return <div className="p-8 text-gray-500">Laden…</div>

  return (
    <div className="p-8 max-w-md">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Klassen</h1>

      <form onSubmit={add} className="flex gap-2 mb-6">
        <input
          required
          placeholder="z. B. 10A, Klasse 3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Hinzufügen
        </button>
      </form>

      <div className="space-y-2">
        {classes.map((c) => (
          <div key={c.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
            <span className="font-medium text-sm text-gray-900">{c.name}</span>
            <button onClick={() => remove(c.id)} className="text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {classes.length === 0 && <p className="text-sm text-gray-400">Noch keine Klassen angelegt.</p>}
      </div>
    </div>
  )
}
