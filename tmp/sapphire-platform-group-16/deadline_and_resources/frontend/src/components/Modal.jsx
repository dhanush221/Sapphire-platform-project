import { useEffect, useRef } from 'react'

export default function Modal({ titleId, onClose, children }) {
  const overlayRef = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => {
    const prevActive = document.activeElement
    const focusable = contentRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusable?.focus?.()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
      if (e.key === 'Tab') {
        const nodes = contentRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const list = nodes ? Array.from(nodes) : []
        if (list.length === 0) return
        const first = list[0]
        const last = list[list.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (prevActive && prevActive.focus) prevActive.focus()
    }
  }, [onClose])

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={overlayRef} onMouseDown={(e)=>{ if (e.target === overlayRef.current) onClose?.() }}>
      <div className="modal-content" ref={contentRef}>
        {children}
      </div>
    </div>
  )
}

