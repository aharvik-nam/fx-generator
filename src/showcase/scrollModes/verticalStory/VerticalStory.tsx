import { useEffect, useRef, useState } from 'react'
import { StorySection } from './StorySection'
import type { ImageProject, ShowcaseProject } from '@/types'

type VerticalStoryProps = {
  showcase: ShowcaseProject
  project: ImageProject
  sourceBitmap: ImageBitmap
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function VerticalStory({ showcase, project, sourceBitmap }: VerticalStoryProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sectionsRef = useRef<Map<string, HTMLElement>>(new Map())
  const [activeStateId, setActiveStateId] = useState<string | undefined>(showcase.states[0]?.id)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .toSorted((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        const id = mostVisible?.target.getAttribute('data-state-id')
        if (id) setActiveStateId(id)
      },
      { root: container, threshold: [0.5] },
    )

    for (const section of sectionsRef.current.values()) observer.observe(section)
    return () => observer.disconnect()
    // showcase.states isn't read directly in this effect, but sectionsRef is only populated
    // (via each StorySection's registerSection ref-callback) as a side effect of rendering —
    // when a state is added/removed the set of mounted <section> elements changes, and the
    // observer must be rebuilt to observe exactly that new set.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [showcase.states])

  function registerSection(id: string, el: HTMLElement | null) {
    if (el) sectionsRef.current.set(id, el)
    else sectionsRef.current.delete(id)
  }

  function scrollToState(id: string) {
    sectionsRef.current
      .get(id)
      ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  }

  const activeIndex = Math.max(
    0,
    showcase.states.findIndex((state) => state.id === activeStateId),
  )
  const progress = showcase.states.length > 0 ? (activeIndex + 1) / showcase.states.length : 0

  return (
    <div className="relative flex min-h-0 flex-1">
      <div
        className="bg-primary absolute top-0 left-0 z-10 h-1 transition-[width] duration-300"
        style={{ width: `${progress * 100}%` }}
      />

      <div ref={containerRef} className="flex-1 overflow-y-auto scroll-smooth">
        {showcase.texts.intro && (
          <section className="border-border flex min-h-[40vh] items-center justify-center border-b p-8 text-center">
            <p className="text-muted-foreground max-w-xl text-lg">{showcase.texts.intro}</p>
          </section>
        )}

        {showcase.states.map((state) => (
          <StorySection
            key={state.id}
            state={state}
            sourceBitmap={sourceBitmap}
            project={project}
            displaySettings={showcase.displaySettings}
            registerSection={registerSection}
          />
        ))}

        {showcase.texts.outro && (
          <section className="flex min-h-[40vh] items-center justify-center p-8 text-center">
            <p className="text-muted-foreground max-w-xl text-lg">{showcase.texts.outro}</p>
          </section>
        )}
      </div>

      <nav
        aria-label="Showcase-fremdrift"
        className="border-border flex w-14 shrink-0 flex-col items-center justify-center gap-2 border-l"
      >
        {showcase.states.map((state) => (
          <button
            key={state.id}
            type="button"
            aria-label={`Gå til ${state.name}`}
            aria-current={state.id === activeStateId ? 'true' : undefined}
            onClick={() => scrollToState(state.id)}
            className={
              state.id === activeStateId
                ? 'bg-primary size-2.5 rounded-full transition-colors'
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/60 size-2.5 rounded-full transition-colors'
            }
          />
        ))}
      </nav>
    </div>
  )
}
