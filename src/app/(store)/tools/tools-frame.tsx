'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, Calculator, HardHat, LayoutGrid, Pause, Play, Ruler, ScanLine, Sparkles } from 'lucide-react'
import styles from './tools-theme.module.css'
import { ToolsBackgroundPattern } from './tools-background-pattern'

const LINKS = [
  { href: '/tools', title: 'All tools', icon: LayoutGrid, skin: 'hub' },
  { href: '/tools/ppe-calculator', title: 'Quantity planner', icon: Calculator, skin: 'planner' },
  { href: '/tools/compliance-checker', title: 'Footwear labels', icon: ScanLine, skin: 'labels' },
  { href: '/tools/size-guide', title: 'Boot sizes', icon: Ruler, skin: 'sizes' },
  { href: '/tools/hard-hat-class-decoder', title: 'Hard hat classes', icon: HardHat, skin: 'hats' },
  { href: '/tools/ai-quote', title: 'AI quote', icon: Sparkles, skin: 'quote' },
]

export function ToolsFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const frame = useRef<HTMLDivElement>(null)
  const [motionEnabled, setMotionEnabled] = useState(true)
  const current = LINKS.find(link => link.href === pathname)

  useEffect(() => {
    const root = frame.current
    if (!root) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const animations = new Set<Animation>()
    let inView = true
    const canMove = () => motionEnabled && !preference.matches && !document.hidden
    const updateActivity = () => {
      root.dataset.motion = canMove() && inView ? 'running' : 'paused'
      if (!canMove()) animations.forEach(animation => animation.cancel())
    }
    const visibility = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      updateActivity()
    })
    visibility.observe(root)
    // Content remains readable before hydration and when motion is disabled.
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        reveal.unobserve(entry.target)
        if (!canMove()) return
        const animation = entry.target.animate(
          [{ opacity: 0.55, transform: 'translateY(22px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 650, delay: Number(entry.target.getAttribute('data-tool-entry') || 0) * 65, easing: 'cubic-bezier(.2,.7,.2,1)' },
        )
        animations.add(animation)
        animation.finished.then(() => animations.delete(animation), () => animations.delete(animation))
      })
    }, { threshold: 0.08 })
    root.querySelectorAll('[data-tool-hero], [data-tool-entry], [data-tool-panel], [data-tool-results], [data-tool-reading]').forEach(node => reveal.observe(node))
    preference.addEventListener('change', updateActivity)
    document.addEventListener('visibilitychange', updateActivity)
    updateActivity()
    return () => {
      visibility.disconnect()
      reveal.disconnect()
      animations.forEach(animation => animation.cancel())
      preference.removeEventListener('change', updateActivity)
      document.removeEventListener('visibilitychange', updateActivity)
    }
  }, [pathname, motionEnabled])

  return (
    <div ref={frame} className={styles.frame} data-skin={current?.skin || 'hub'} data-motion="paused">
      <div className={styles.atmosphere} aria-hidden="true">
        <span className={styles.sky} /><span className={styles.mint} /><span className={styles.sun} />
        <div className={styles.grid} />
        <ToolsBackgroundPattern />
      </div>
      <div className={styles.navigation}>
        <div className={styles.navHeading}><span className={styles.brandMark}><LayoutGrid size={15} aria-hidden="true" /></span><span>THE PPE WORKBENCH</span><ArrowUpRight size={14} aria-hidden="true" /></div>
        <nav className={styles.tabs} aria-label="Procurement tools">
          {LINKS.map(({ href, title, icon: Icon }) => (
            <Link href={href} key={href} aria-current={pathname === href ? 'page' : undefined}>
              <Icon size={16} aria-hidden="true" /><span>{title}</span>
            </Link>
          ))}
        </nav>
        <button type="button" className={styles.motionControl} onClick={() => setMotionEnabled(value => !value)} aria-pressed={!motionEnabled} aria-label={motionEnabled ? 'Pause decorative animations' : 'Enable decorative animations'}>
          {motionEnabled ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}<span>Motion {motionEnabled ? 'on' : 'off'}</span>
        </button>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
