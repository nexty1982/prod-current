import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { Homepage } from './Homepage'

export function mount(selector: string){
  const el = document.querySelector(selector)
  if(!el) throw new Error('Mount element not found')
  const root = createRoot(el as HTMLElement)
  root.render(<Homepage />)
}
