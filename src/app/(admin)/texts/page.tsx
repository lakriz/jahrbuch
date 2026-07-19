'use client'
import { useCallback, useEffect, useState, useMemo } from 'react'
import type { TextEntry } from '@/types'
import { Trash2, X, FileText, Plus, Tag, RefreshCw, ChevronDown, ChevronUp, Loader2, Save } from 'lucide-react'
import MarkdownWYSIWYG from '@/components/MarkdownWYSIWYG'

// Simple client-side Markdown-to-HTML parser for card previews
function renderMarkdownPreview(md: string): string {
  if (!md) return ''
  return md
    .replace(/!\[.*?\]\(.*?\)/g, '[Bild] ')
    .replace(/^#+\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .substring(0, 100) + (md.length > 100 ? '…' : '')
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

  // Mail-like Editor States
  const [selectedTextId, setSelectedTextId] = useState<string | 'new' | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editorExpanded, setEditorExpanded] = useState(true)

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

  // Select text for editing (like opening an email)
  const selectText = (text: TextEntry) => {
    setSelectedTextId(text.id)
    setEditTitle(text.title)
    setEditContent(text.content)
    setEditTags(text.tags || [])
    setEditorExpanded(true)
  }

  const openCreateMode = () => {
    setSelectedTextId('new')
    setEditTitle('')
    setEditContent('')
    setEditTags([])
    setEditorExpanded(true)
  }

  const closeEditor = () => {
    setSelectedTextId(null)
    setEditTitle('')
    setEditContent('')
    setEditTags([])
  }

  const saveText = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTitle.trim()) return
    setSaving(true)

    try {
      const isCreate = selectedTextId === 'new'
      const url = isCreate ? '/api/texts' : `/api/texts/${selectedTextId}`
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
          setSelectedTextId(saved.id) // Automatically select the newly created text
        } else {
          setTexts((prev) => prev.map((t) => t.id === saved.id ? saved : t))
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // Soft Delete
  const remove = async (text: TextEntry, e: React.MouseEvent) => {
    e.stopPropagation()
    const res = await fetch(`/api/texts/${text.id}`, { method: 'DELETE' })
    if (res.ok) {
      setTexts((p) => p.filter((t) => t.id !== text.id))
      if (selectedTextId === text.id) closeEditor()
    }
  }

  // Restore
  const restoreFromTrash = async (text: TextEntry, e: React.MouseEvent) => {
    e.stopPropagation()
    const res = await fetch(`/api/texts/${text.id}/restore`, { method: 'POST' })
    if (res.ok) {
      setTexts((p) => p.filter((t) => t.id !== text.id))
      if (selectedTextId === text.id) closeEditor()
    }
  }

  // Permanent Delete
  const deletePermanently = async (text: TextEntry, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Dieser Text wird unwiderruflich gelöscht. Fortfahren?')) return
    const res = await fetch(`/api/texts/${text.id}?permanent=true`, { method: 'DELETE' })
    if (res.ok) {
      setTexts((p) => p.filter((t) => t.id !== text.id))
      if (selectedTextId === text.id) closeEditor()
    }
  }

  // Empty Trash
  const emptyTrash = async () => {
    if (!confirm('Papierkorb leeren? Alle Texte darin werden endgültig gelöscht.')) return
    setLoading(true)
    try {
      await Promise.all(texts.map((t) => fetch(`/api/texts/${t.id}?permanent=true`, { method: 'DELETE' })))
      setTexts([])
      closeEditor()
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
        if (selectedTextId === textId) {
          setEditTags(updated.tags || [])
        }
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
          </div>
        </div>
      </aside>

      {/* Split Pane: List (Top/Left-like) & Editor (Bottom) */}
      <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
        
        {/* Texts List Section (Top half, scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col min-h-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-4 mb-4 gap-3">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">Texte</h1>
              <div className="flex bg-gray-200/60 p-0.5 rounded-lg text-xs font-medium">
                <button
                  onClick={() => { setCurrentTab('active'); setSelectedTag(null); closeEditor() }}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    currentTab === 'active' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Aktive Texte
                </button>
                <button
                  onClick={() => { setCurrentTab('trash'); setSelectedTag(null); closeEditor() }}
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
                  className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-3.5 py-1.5 rounded-lg text-xs transition-colors border border-red-200 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Papierkorb leeren
                </button>
              )}

              {currentTab === 'active' && (
                <button
                  onClick={openCreateMode}
                  className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs hover:bg-blue-700 transition-colors shadow-sm font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Neuer Text
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center flex-1 py-10 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Laden…
            </div>
          ) : filteredTexts.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-xl flex-1 flex flex-col justify-center items-center">
              <FileText className="w-8 h-8 opacity-20 mb-2" />
              <p className="text-xs font-semibold">Keine Texte vorhanden.</p>
            </div>
          ) : (
            /* Email-like List Rows */
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden shadow-sm">
              {filteredTexts.map((text) => {
                const isSelected = selectedTextId === text.id
                return (
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
                    onClick={() => selectText(text)}
                    className={`flex items-center justify-between p-3.5 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-50/60 border-l-4 border-l-blue-600 pl-2.5' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {text.title}
                        </span>
                        {text.tags && text.tags.map((t) => (
                          <span key={t} className="bg-orange-50 border border-orange-100 text-orange-600 text-[9px] px-1.5 py-0.5 rounded-full font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">
                        {renderMarkdownPreview(text.content) || <span className="italic text-gray-300">Kein Inhalt vorhanden.</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-gray-400 font-medium">
                        {new Date(text.created_at).toLocaleDateString('de-DE')}
                      </span>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                        {currentTab === 'active' ? (
                          <button
                            onClick={(e) => remove(text, e)}
                            className="p-1 hover:bg-gray-200/80 rounded text-gray-400 hover:text-red-600 transition-colors"
                            title="Löschen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={(e) => restoreFromTrash(text, e)}
                              className="p-1 hover:bg-gray-200/80 rounded text-gray-400 hover:text-green-600 transition-colors"
                              title="Wiederherstellen"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => deletePermanently(text, e)}
                              className="p-1 hover:bg-gray-200/80 rounded text-gray-400 hover:text-red-600 transition-colors"
                              title="Dauerhaft löschen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Email-like Bottom Editor Drawer (Collapsible) */}
        {selectedTextId !== null && (
          <div className="bg-white border-t border-gray-200 shadow-lg flex flex-col transition-all duration-300 ease-in-out">
            
            {/* Editor Header Panel */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 select-none">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  {selectedTextId === 'new' ? 'Neuer Entwurf' : `Entwurf: ${editTitle || 'Unbenannt'}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditorExpanded(!editorExpanded)}
                  className="p-1.5 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                  title={editorExpanded ? 'Minimieren' : 'Maximieren'}
                >
                  {editorExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
                <button
                  onClick={closeEditor}
                  className="p-1.5 hover:bg-gray-200 rounded text-gray-500 hover:text-red-600 transition-colors"
                  title="Schließen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Editor Body Area */}
            {editorExpanded && (
              <form onSubmit={saveText} className="flex flex-col h-[400px] overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Title Input Row */}
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                    <span className="text-xs font-semibold text-gray-400 w-12 flex-shrink-0">Betreff:</span>
                    <input
                      required
                      disabled={currentTab === 'trash'}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="z. B. Vorwort des Schulleiters"
                      className="flex-1 bg-transparent text-sm font-semibold outline-none text-gray-800 placeholder-gray-300"
                    />
                  </div>

                  {/* Tags Selector Input Row */}
                  <div className="flex items-start gap-3 border-b border-gray-100 pb-2">
                    <span className="text-xs font-semibold text-gray-400 w-12 flex-shrink-0 mt-1">Tags:</span>
                    <div className="flex-1 flex flex-wrap gap-1 items-center">
                      {editTags.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-[10px] px-2 py-0.5 rounded-full font-medium shadow-sm">
                          {t}
                          {currentTab === 'active' && (
                            <button
                              type="button"
                              onClick={() => setEditTags(editTags.filter(x => x !== t))}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </span>
                      ))}
                      {currentTab === 'active' && (
                        <div className="flex gap-1 flex-wrap">
                          {availableTags
                            .filter(t => !editTags.includes(t))
                            .map(t => (
                              <button
                                type="button"
                                key={t}
                                onClick={() => setEditTags([...editTags, t])}
                                className="text-[9px] bg-white border border-gray-200 px-1.5 py-0.5 rounded hover:border-gray-400 text-gray-500 transition-colors"
                              >
                                + {t}
                              </button>
                            ))}
                        </div>
                      )}
                      {editTags.length === 0 && currentTab === 'trash' && (
                        <span className="text-[10px] text-gray-400 italic">Keine Tags zugewiesen.</span>
                      )}
                    </div>
                  </div>

                  {/* WYSIWYG Editor Block */}
                  <div>
                    <MarkdownWYSIWYG value={editContent} onChange={setEditContent} />
                  </div>
                </div>

                {/* Editor Footer Panel */}
                <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50/70">
                  <span className="text-[10px] text-gray-400 italic">
                    Entwurf wird im Hintergrund als sauberes Markdown gespeichert.
                  </span>
                  
                  {currentTab === 'active' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={closeEditor}
                        className="px-4 py-2 text-xs text-gray-500 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                      >
                        Verwerfen
                      </button>
                      <button
                        type="submit"
                        disabled={saving || !editTitle.trim()}
                        className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs hover:bg-blue-700 disabled:opacity-40 transition-colors font-semibold shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {saving ? 'Speichert…' : 'Speichern'}
                      </button>
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
