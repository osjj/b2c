'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calculator, Hand, HardHat, LayoutGrid, Pause, Play, Ruler, ScanLine, Sparkles, TableProperties } from 'lucide-react'
import styles from './tools-theme.module.css'
import { ToolsBackgroundPattern } from './tools-background-pattern'

const LINKS = [
  { href: '/tools', title: 'All tools', icon: LayoutGrid },
  { href: '/tools/ppe-calculator', title: 'Quantity planner', icon: Calculator },
  { href: '/tools/footwear-size-allocation', title: 'Bulk footwear sizes', icon: TableProperties },
  { href: '/tools/compliance-checker', title: 'Footwear labels', icon: ScanLine },
  { href: '/tools/glove-marking-decoder', title: 'Glove markings', icon: Hand },
  { href: '/tools/size-guide', title: 'Boot sizes', icon: Ruler },
  { href: '/tools/hard-hat-class-decoder', title: 'Hard hat classes', icon: HardHat },
  { href: '/tools/ai-quote', title: 'AI quote', icon: Sparkles },
]

export function ToolsFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const frame = useRef<HTMLDivElement>(null)
  const [motionEnabled, setMotionEnabled] = useState(true)

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
          [{ opacity: 0.7, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 360, delay: Number(entry.target.getAttribute('data-tool-entry') || 0) * 35, easing: 'cubic-bezier(.2,.7,.2,1)' },
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
    <div ref={frame} className={styles.frame} data-motion="paused">
      <div className={styles.atmosphere} aria-hidden="true">
        <div className={styles.grid} />
        <ToolsBackgroundPattern />
      </div>
      <div className={styles.navigation}>
        <div className={styles.navSurface}>
          <Link href="/tools" className={styles.navHeading}>
            <span className={styles.brandMark}><LayoutGrid size={19} aria-hidden="true" /></span>
            <span><strong>PPE workbench</strong><small>Tools for your next order</small></span>
          </Link>
          <button type="button" className={styles.motionControl} onClick={() => setMotionEnabled(value => !value)} aria-pressed={!motionEnabled} aria-label={motionEnabled ? 'Pause decorative animations' : 'Enable decorative animations'}>
            {motionEnabled ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}<span>Motion {motionEnabled ? 'on' : 'off'}</span>
          </button>
          <nav className={styles.tabs} aria-label="Procurement tools">
            {LINKS.map(({ href, title, icon: Icon }) => (
              <Link href={href} key={href} className={styles.toolLink} aria-current={pathname === href ? 'page' : undefined}>
                <Icon size={16} className={styles.toolLinkIcon} aria-hidden="true" /><span>{title}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
