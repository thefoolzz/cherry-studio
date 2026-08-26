import { useMemo } from 'react'

import { detectOs } from './download/assets'
import { useLatestRelease } from './download/useLatestRelease'
import { Download } from './sections/Download'
import { Footer } from './sections/Footer'
import { Foundation } from './sections/Foundation'
import { Hero } from './sections/Hero'
import { Masthead } from './sections/Masthead'
import { Platforms } from './sections/Platforms'
import { Proof } from './sections/Proof'
import { Publish } from './sections/Publish'

export function App() {
  const state = useLatestRelease()
  const os = useMemo(() => detectOs(), [])

  return (
    <>
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-10 focus:border-[2.5px] focus:border-ink focus:bg-paper focus:px-4 focus:py-2 focus:text-sm"
        href="#download">
        跳到下载
      </a>
      <Masthead />
      <main>
        <Hero os={os} state={state} />
        <Proof />
        <Publish />
        <Platforms />
        <Foundation />
        <Download os={os} state={state} />
      </main>
      <Footer />
    </>
  )
}
