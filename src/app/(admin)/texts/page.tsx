'use client'
import { useCallback, useEffect, useState, useMemo } from 'react'
import type { TextEntry } from '@/types'
import { Trash2, X, FileText, Plus, Tag, RefreshCw, Edit3, Loader2 } from 'lucide-react'
import MarkdownWYSIWYG from '@/components/MarkdownWYSIWYG'

// Simple client-side Markdown-to-HTML parser for card previews
function renderMarkdownPreview(md: string): string {
  if (!md) return ''
  // Strip headers, lists, links, stars, and return plain text snippet
  return md
    .replace(/^#+\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .substring(0, 150) + (md.length > 150 ? '…' : '')
}

export default function TextsPage() {
  const [texts, setTexts] = useState<TextEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentTab, setCurrentTab] = useState<'active' | 'trash'>('active')
  
  // Tag filtering & management
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [availableTags, setAvailableTags] = useState<string[]>([
    'vorwort', 'danksagung', 'gedicht', 'interview', 'klassen-steckbrief', 'bericht'
  ])
  const [newTagInput, setNewTagInput] = useState('')

  // Edit / Create states
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingText, setEditingText] = useState<TextEntry | null>(null) // null = create new
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])

  const loadTexts = useCallback(() => {
    setLoading(true)
    const isTrash = currentTab === 'trash'
    fetch(`/api/texts?deleted=${isTrash}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTexts(data)
        else setTexts([])
        setLoading(false)
      })
      .catch(() => {
        setTexts([])
        setLoading(false)
      })
  }, [currentTab])

  useEffect(() => { loadTexts() }, [loadTexts])

  const openCreateMode = () => {
    setEditingText(null)
    setEditTitle('')
    setEditContent('')
    setEditTags([])
    setEditorOpen(true)
  }

  const openEditMode = (text: TextEntry) => {
    setEditingText(text)
    setEditTitle(text.title)
    setEditContent(text.content)
    setEditTags(text.tags || [])
    setEditorOpen(true)
  }

  const saveText = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTitle.trim()) return
    setSaving(true)

    try {
      const isCreate = !editingText
      const url = isCreate ? '/api/texts' : `/api/texts/${editingText.id}`
      const method = isCreate ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          tags: editTags,
        }),
      })

      if (res.ok) {
        const saved = await res.json() as TextEntry
        if (isCreate) {
          setTexts((prev) => [saved, ...prev])
        } else {
          setTexts((prev) => prev.map((t) => t.id === saved.id ? saved : t))
        }
        setEditorOpen(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // Soft Delete
  const remove = async (text: TextEntry) => {
    const res = await fetch(`/api/texts/${text.id}`, { method: 'DELETE' })
    if (res.ok) {
      setTexts((p) => p.filter((t) => t.id !== text.id))
    }
  }

  // Restore
  const restoreFromTrash = async (text: TextEntry) => {
    const res = await fetch(`/api/texts/${text.id}/restore`, { method: 'POST' })
    if (res.ok) {
      setTexts((p) => p.filter((t) => t.id !== text.id))
    }
  }

  // Permanent Delete
  const deletePermanently = async (text: TextEntry) => {
    if (!confirm('Dieser Text wird unwiderruflich gelöscht. Fortfahren?')) return
    const res = await fetch(`/api/texts/${text.id}?permanent=true`, { method: 'DELETE' })
    if (res.ok) {
      setTexts((p) => p.filter((t) => t.id !== text.id))
    }
  }

  // Empty Trash
  const emptyTrash = async () => {
    if (!confirm('Papierkorb leeren? Alle Texte darin werden endgültig gelöscht.')) return
    setLoading(true)
    try {
      await Promise.all(texts.map((t) => fetch(`/api/texts/${t.id}?permanent=true`, { method: 'DELETE' })))
      setTexts([])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Update text metadata directly (for Drag & Drop)
  const updateTextMetadata = async (textId: string, payload: Partial<TextEntry>) => {
    try {
      const res = await fetch(`/api/texts/${textId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const updated = await res.json() as TextEntry
        setTexts((prev) => prev.map((t) => t.id === updated.id ? updated : t))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const addCustomTag = () => {
    const t = newTagInput.trim().toLowerCase()
    if (t && !availableTags.includes(t)) {
      setAvailableTags([...availableTags, t])
    }
    setNewTagInput('')
  }

  // Intelligent filter & sorting
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    texts.forEach((txt) => {
      txt.tags?.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1
      })
    })
    return counts
  }, [texts])

  const filteredTexts = useMemo(() => {
    if (!selectedTag) return texts
    return texts.filter((txt) => txt.tags?.includes(selectedTag))
  }, [texts, selectedTag])

  return (
    <div className="flex h-full min-h-screen">
      {/* Sidebar for Text Tags */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Text-Tags</span>
          {selectedTag && (
            <button onClick={() => setSelectedTag(null)} className="text-xs text-blue-600 hover:underline">
              alle
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {availableTags.map((tag) => {
            const count = tagCounts[tag] || 0
            const active = selectedTag === tag
            return (
              <div
                key={tag}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', `tag:${tag}`)
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault()
                  const data = e.dataTransfer.getData('text/plain')
                  if (data.startsWith('text:')) {
                    const textId = data.substring(5)
                    const text = texts.find(t => t.id === textId)
                    if (text && !text.tags.includes(tag)) {
                      const updatedTags = [...text.tags, tag]
                      await updateTextMetadata(textId, { tags: updatedTags })
                    }
                  }
                }}
                onClick={() => setSelectedTag(active ? null : tag)}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer border transition-all ${
                  active 
                    ? 'bg-orange-50 border-orange-200 text-orange-700 font-medium' 
                    : 'border-transparent hover:bg-gray-50 text-gray-600 hover:text-gray-900'
                }`}
                title="Tag auf einen Text ziehen oder Text hierher ziehen"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Tag className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{tag}</span>
                </div>
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    active ? 'bg-orange-200/50 text-orange-800' : 'bg-gray-100 text-gray-500'
                  }`}>{count}</span>
                )}
              </div>
            )
          })}

          <div className="pt-2 px-1">
            <div className="flex gap-1">
              <input
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="Neuer Tag…"
                className="flex-1 text-[11px] border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={addCustomTag}
                className="p-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 italic leading-tight">
              Tipp: Tags per Drag & Drop auf Texte ziehen, um sie zuzuweisen!
            </p>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 p-6 flex flex-col min-h-0 bg-gray-50 overflow-y-auto">
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-4 mb-5 gap-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">Texte</h1>
            <div className="flex bg-gray-200/60 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => { setCurrentTab('active'); setSelectedTag(null) }}
                className={`px-3 py-1 rounded-md transition-colors ${
                  currentTab === 'active' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Aktive Texte
              </button>
              <button
                onClick={() => { setCurrentTab('trash'); setSelectedTag(null) }}
                className={`px-3 py-1 rounded-md transition-colors ${
                  currentTab === 'trash' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Papierkorb
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentTab === 'trash' && texts.length > 0 && (
              <button
                onClick={emptyTrash}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm transition-colors border border-red-200 font-medium"
              >
                <Trash2 className="w-4 h-4" /> Papierkorb leeren
              </button>
            )}

            {currentTab === 'active' && (
              <button
                onClick={openCreateMode}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors shadow-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Text erstellen
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1 py-20 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mr-2" /> Laden…
          </div>
        ) : filteredTexts.length === 0 ? (
          <div className="text-center py-20 text-gray-400 bg-white border border-gray-200 rounded-2xl flex-1 flex flex-col justify-center items-center">
            <FileText className="w-10 h-10 opacity-30 mb-3" />
            <p className="text-sm font-medium">Keine Texte gefunden.</p>
            {currentTab === 'active' && (
              <button onClick={openCreateMode} className="mt-3 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg">
                Jetzt ersten Text anlegen
              </button>
            )}
          </div>
        ) : (
          /* Cards list */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTexts.map((text) => (
              <div
                key={text.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', `text:${text.id}`)
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault()
                  const data = e.dataTransfer.getData('text/plain')
                  if (data.startsWith('tag:')) {
                    const tag = data.substring(4)
                    if (!text.tags?.includes(tag)) {
                      const updatedTags = [...(text.tags || []), tag]
                      await updateTextMetadata(text.id, { tags: updatedTags })
                    }
                  }
                }}
                onClick={() => openEditMode(text)}
                className="group bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[160px]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">{text.title}</h3>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {currentTab === 'active' ? (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditMode(text) }}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600"
                            title="Bearbeiten"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); remove(text) }}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600"
                            title="Löschen (in Papierkorb)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); restoreFromTrash(text) }}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-green-600"
                            title="Wiederherstellen"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deletePermanently(text) }}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600"
                            title="Endgültig löschen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-4 leading-relaxed mb-4">
                    {renderMarkdownPreview(text.content) || <span className="italic text-gray-300">Kein Inhalt...</span>}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1 items-center border-t border-gray-100 pt-3">
                  <FileText className="w-3 h-3 text-gray-300 flex-shrink-0" />
                  {text.tags && text.tags.map((t) => (
                    <span key={t} className="bg-orange-50 border border-orange-100 text-orange-700 text-[9px] px-2 py-0.5 rounded-full font-medium">{t}</span>
                  ))}
                  {(!text.tags || text.tags.length === 0) && (
                    <span className="text-[9px] text-gray-300 italic">keine Tags</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor Modal for Create / Edit Text */}
      {editorOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 md:p-10" onClick={() => setEditorOpen(false)}>
          <form
            onSubmit={saveText}
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-900 text-sm">
                {editingText ? 'Text bearbeiten' : 'Neuen Text erstellen'}
              </h3>
              <button type="button" onClick={() => setEditorOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Titel *</label>
                <input
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="z. B. Vorwort des Schulleiters"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tag Selection within Editor Modal */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tags</label>
                <div className="flex flex-wrap gap-1.5 p-2.5 border border-gray-200 rounded-lg min-h-[40px] bg-gray-50/50 mb-1.5">
                  {editTags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded-full font-medium shadow-sm">
                      {t}
                      <button
                        type="button"
                        onClick={() => setEditTags(editTags.filter(x => x !== t))}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  {editTags.length === 0 && (
                    <span className="text-[10px] text-gray-400 italic">Keine Tags zugewiesen. Klicke unten, um Tags hinzuzufügen.</span>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap p-1 bg-gray-50 border border-dashed border-gray-200 rounded">
                  {availableTags
                    .filter(t => !editTags.includes(t))
                    .map(t => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setEditTags([...editTags, t])}
                        className="text-[9px] bg-white border border-gray-200 px-1.5 py-0.5 rounded hover:border-gray-400 text-gray-600 transition-colors"
                      >
                        + {t}
                      </button>
                    ))}
                </div>
              </div>

              {/* WYSIWYG Editor */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Inhalt (WYSIWYG / Markdown)</label>
                <MarkdownWYSIWYG value={editContent} onChange={setEditContent} />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <span className="text-xs text-gray-400 italic">
                Inhalt wird im Hintergrund als sauberes Markdown gespeichert.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 text-xs text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={saving || !editTitle.trim()}
                  className="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors font-medium"
                >
                  {saving ? 'Speichert…' : 'Speichern'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
