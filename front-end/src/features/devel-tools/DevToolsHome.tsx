import React from 'react'
import { RailsPicker } from '@om/ui-core'

export default function DevToolsHome() {
  return (
    <div style={{padding:16}}>
      <h2>Devel Tools</h2>
      <RailsPicker rails={['gold', 'blue-ornate']} onChange={()=>{}} />
    </div>
  )
}
