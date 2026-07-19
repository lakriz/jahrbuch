'use client'
import { useEffect, useRef, useState } from 'react'
import { Bold, Italic, Heading1, Heading2, Heading3, List, Link, Image as ImageIcon } from 'lucide-react'
import ImagePicker from '@/components/ImagePicker'
import type { ImageEntry } from '@/types'

interface Props {
  value: string
  onChange: (markdown: string) => void
}

function markdownToHtml(md: string): string {
  if (!md) return ''
  let html = md
    .replace(/\r\n/g, '\n')
    // Escape HTML tags to prevent XSS (images and links generated after)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Convert Headers first
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    // Bullet list items
    .replace(/^\* (.*?)$/gm, '<li>$1</li>')
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    // Images: ![alt](url) (must convert before links)
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" />')
    // Links: [text](url)
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1</a>')
    // Line breaks (convert remaining \n to <br>)
    .replace(/\n/g, '<br/>')

  // Wrap consecutive list items in <ul>
  html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>')
  return html
}

function htmlToMarkdown(html: string): string {
  if (!html) return ''
  
  // Im Browser ausführen
  if (typeof window === 'undefined') return ''
  
  const div = document.createElement('div')
  div.innerHTML = html

  function convert(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue ?? ''
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return ''
    }

    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()

    let children = ''
    el.childNodes.forEach((child) => {
      children += convert(child)
    })

    switch (tag) {
      case 'strong':
      case 'b':
        return `**${children}**`
      case 'em':
      case 'i':
        return `*${children}*`
      case 'h1':
        return `# ${children}\n`
      case 'h2':
        return `## ${children}\n`
      case 'h3':
        return `### ${children}\n`
      case 'p':
        return `${children}\n\n`
      case 'br':
        return '\n'
      case 'li':
        return `* ${children}\n`
      case 'ul':
        return `${children}\n`
      case 'a':
        const href = el.getAttribute('href') ?? ''
        return `[${children}](${href})`
      case 'img':
        const imgsrc = el.getAttribute('src') ?? ''
        const imgalt = el.getAttribute('alt') ?? ''
        return `![${imgalt}](${imgsrc})`
      case 'div':
        return `${children}\n`
      default:
        return children
    }
  }

  return convert(div)
    .trim()
    .replace(/\n{3,}/g, '\n\n')
}

export default function MarkdownWYSIWYG({ value, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isEditingRef = useRef(false)
  const [showPicker, setShowPicker] = useState(false)

  // Set initial content
  useEffect(() => {
    if (editorRef.current && !isEditingRef.current) {
      editorRef.current.innerHTML = markdownToHtml(value)
    }
  }, [value])

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      const md = htmlToMarkdown(html)
      onChange(md)
    }
  }

  const format = (command: string, value: string = '') => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      editorRef.current.focus()
    }
    handleInput()
  }

  const addLink = () => {
    const url = prompt('URL eingeben:')
    if (url) {
      format('createLink', url)
    }
  }

  const handleImageConfirm = (imgs: ImageEntry[]) => {
    if (imgs.length > 0) {
      const img = imgs[0]
      const src = img.public_url
      const alt = img.alt_text || img.name
      format('insertImage', src)
      
      // Synchronisiere das Alt-Attribut im Editor
      if (editorRef.current) {
        const images = editorRef.current.querySelectorAll('img')
        images.forEach((im) => {
          if (im.getAttribute('src') === src && !im.getAttribute('alt')) {
            im.setAttribute('alt', alt)
          }
        })
      }
      handleInput()
    }
    setShowPicker(false)
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
      <style dangerouslySetInnerHTML={{ __html: `
        .editor-area:empty:before { content: attr(data-placeholder) !important; color: #9ca3af !important; display: block; }
        .editor-area ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin-bottom: 0.75rem !important; }
        .editor-area ol { list-style-type: decimal !important; padding-left: 1.5rem !important; margin-bottom: 0.75rem !important; }
        .editor-area li { margin-bottom: 0.25rem !important; }
        .editor-area h1 { font-size: 1.4rem !important; font-weight: bold !important; margin-top: 1rem !important; margin-bottom: 0.5rem !important; line-height: 1.25 !important; }
        .editor-area h2 { font-size: 1.2rem !important; font-weight: bold !important; margin-top: 0.75rem !important; margin-bottom: 0.4rem !important; line-height: 1.25 !important; }
        .editor-area h3 { font-size: 1.05rem !important; font-weight: bold !important; margin-top: 0.5rem !important; margin-bottom: 0.3rem !important; line-height: 1.25 !important; }
        .editor-area a { color: #2563eb !important; text-decoration: underline !important; }
        .editor-area img { max-width: 100% !important; max-height: 300px !important; object-fit: contain !important; border-radius: 0.5rem !important; margin: 0.75rem 0 !important; display: block !important; border: 1px solid #e5e7eb !important; }
      `}} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-100 select-none">
        <button
          type="button"
          onClick={() => format('bold')}
          className="p-1.5 hover:bg-gray-200 rounded-md text-gray-600 transition-colors"
          title="Fett"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => format('italic')}
          className="p-1.5 hover:bg-gray-200 rounded-md text-gray-600 transition-colors"
          title="Kursiv"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        
        <span className="w-px h-4 bg-gray-200 mx-1" />

        <button
          type="button"
          onClick={() => format('formatBlock', '<h1>')}
          className="p-1.5 hover:bg-gray-200 rounded-md text-gray-600 transition-colors"
          title="Überschrift 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => format('formatBlock', '<h2>')}
          className="p-1.5 hover:bg-gray-200 rounded-md text-gray-600 transition-colors"
          title="Überschrift 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => format('formatBlock', '<h3>')}
          className="p-1.5 hover:bg-gray-200 rounded-md text-gray-600 transition-colors"
          title="Überschrift 3"
        >
          <Heading3 className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-gray-200 mx-1" />

        <button
          type="button"
          onClick={() => format('insertUnorderedList')}
          className="p-1.5 hover:bg-gray-200 rounded-md text-gray-600 transition-colors"
          title="Aufzählungsliste"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={addLink}
          className="p-1.5 hover:bg-gray-200 rounded-md text-gray-600 transition-colors"
          title="Link einfügen"
        >
          <Link className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="p-1.5 hover:bg-gray-200 rounded-md text-gray-600 transition-colors"
          title="Bild referenzieren"
        >
          <ImageIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ContentEditable area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => { isEditingRef.current = true }}
        onBlur={() => { isEditingRef.current = false }}
        className="p-4 min-h-[220px] outline-none text-sm text-gray-800 editor-area overflow-y-auto"
        data-placeholder="Schreibe deinen Text hier und füge Bilder hinzu..."
      />

      {/* Image Picker Dialog */}
      {showPicker && (
        <ImagePicker
          selected={[]}
          multiple={false}
          onConfirm={handleImageConfirm}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
