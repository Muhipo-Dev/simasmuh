'use client'

import { useEffect } from 'react'

export function GlobalPasswordEyeEnhancer() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const enhanceSwalPasswordInputs = () => {
      const swalInputs = document.querySelectorAll<HTMLInputElement>(
        '.swal2-container input[type="password"]:not([data-eye-enhanced="true"]), .swal2-container #swal-input-password:not([data-eye-enhanced="true"])'
      )

      swalInputs.forEach((input) => {
        if (!input.parentNode) return
        input.setAttribute('data-eye-enhanced', 'true')

        // Ensure parent can contain the eye icon
        const wrapper = document.createElement('div')
        wrapper.className = 'swal2-password-eye-wrapper'
        wrapper.style.position = 'relative'
        wrapper.style.display = 'inline-block'
        wrapper.style.width = '100%'
        wrapper.style.margin = '0 auto'

        input.parentNode.insertBefore(wrapper, input)
        wrapper.appendChild(input)

        input.style.paddingRight = '42px'
        input.style.boxSizing = 'border-box'

        const toggleBtn = document.createElement('button')
        toggleBtn.type = 'button'
        toggleBtn.className = 'swal2-password-eye-btn'
        toggleBtn.setAttribute('aria-label', 'Lihat kata sandi')
        toggleBtn.title = 'Lihat kata sandi'
        toggleBtn.style.cssText =
          'position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#64748b; padding:6px; display:flex; align-items:center; justify-content:center; border-radius:6px; z-index:20; line-height:1;'
        
        toggleBtn.innerHTML =
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>'

        let isShown = false
        toggleBtn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          isShown = !isShown
          input.type = isShown ? 'text' : 'password'
          toggleBtn.title = isShown ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'
          toggleBtn.innerHTML = isShown
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>'
        })

        wrapper.appendChild(toggleBtn)
      })
    }

    const observer = new MutationObserver(() => {
      enhanceSwalPasswordInputs()
    })

    observer.observe(document.body, { childList: true, subtree: true })
    enhanceSwalPasswordInputs()

    return () => {
      observer.disconnect()
    }
  }, [])

  return null
}
