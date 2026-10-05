"use client"

import Image from "next/image"
import Link from "next/link"
import { MiniQuote } from "@/components/store/mini-quote"
import { Mail, Menu, MessageCircle, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { QuoteDrawer } from "./QuoteRequestForm"
import styles from "./home-new.module.css"
import { pointerPressHandlers } from "./pointerPress"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/cases", label: "Procurement Cases" },
  { href: "/tools", label: "Tools" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
]

export function NewHomeNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const showQuoteList = process.env.NEXT_PUBLIC_PROJECT_TYPE === "B2B"

  useEffect(() => {
    if (!menuOpen) return
    const desktop = window.matchMedia("(min-width: 1251px)")
    const closeForDesktop = () => {
      if (desktop.matches) setMenuOpen(false)
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }
    const outside = (event: globalThis.PointerEvent) => {
      if (!(event.target instanceof Node) || headerRef.current?.contains(event.target)) return
      const focusWasInMenu = menuRef.current?.contains(document.activeElement)
      setMenuOpen(false)
      if (focusWasInMenu) menuButtonRef.current?.focus()
    }
    closeForDesktop()
    desktop.addEventListener("change", closeForDesktop)
    document.addEventListener("keydown", keydown)
    document.addEventListener("pointerdown", outside)
    return () => {
      desktop.removeEventListener("change", closeForDesktop)
      document.removeEventListener("keydown", keydown)
      document.removeEventListener("pointerdown", outside)
    }
  }, [menuOpen])

  const isActiveLink = (href: string) => {
    if (href === "/") {
      return pathname === "/"
    }

    if (href === "/blog" && (pathname === "/solutions" || pathname.startsWith("/solutions/"))) {
      return true
    }

    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div className={styles.navSticky}>
      <header ref={headerRef} className={styles.nav} data-tools-page={pathname === '/tools' || pathname.startsWith('/tools/')}>
        <div className={styles.wrap}>
          <Link className={styles.logo} href="/" aria-label="Laifappe homepage">
            <Image
              src="/favicon.ico"
              alt="Yuelaifa PPE icon"
              width={52}
              height={52}
              className={styles.logoIcon}
              priority
            />
            <span className={styles.logoText}>
              <strong>{"\u7ca4\u6765\u53d1\u52b3\u4fdd"}</strong>
              <small>YUELAIFA PPE · EST. 2003</small>
            </span>
          </Link>
          <nav className={styles.navLinks} aria-label="New homepage navigation">
            {navLinks.map((link) => {
              const isActive = isActiveLink(link.href)

              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={isActive ? styles.navLinkActive : undefined}
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
          <div className={styles.navRight}>
            <a
              aria-label="Email"
              className={`${styles.navBtn} ${styles.btnEmailNav}`}
              href="mailto:sales@laifappe.com"
              title="Email"
            >
              <span className={styles.mailIcon} aria-hidden="true">
                <Mail size={15} strokeWidth={2.2} />
              </span>
              <span className={styles.navBtnText}>Email</span>
            </a>
            <a
              aria-label="WhatsApp"
              className={`${styles.navBtn} ${styles.btnWa}`}
              href="https://wa.me/8618029309938"
              title="WhatsApp"
            >
              <span className={styles.chatIcon} aria-hidden="true">
                <MessageCircle size={15} strokeWidth={2.3} />
              </span>
              <span className={styles.navBtnText}>WhatsApp</span>
            </a>
            <QuoteDrawer
              source="Header Request Quote"
              trigger={
                <button
                  {...pointerPressHandlers}
                  aria-label="Request Quote"
                  className={`${styles.navBtn} ${styles.btnAccentNav}`}
                  title="Request Quote"
                  type="button"
                >
                  <span className={styles.navBtnText}>Request Quote</span>
                  <span className={styles.arr} aria-hidden="true">
                    &rarr;
                  </span>
                </button>
              }
            />
            <button
              {...pointerPressHandlers}
              ref={menuButtonRef}
              aria-controls="new-home-mobile-menu"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              className={styles.mobileMenuButton}
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              {menuOpen ? <X size={18} strokeWidth={2.2} /> : <Menu size={18} strokeWidth={2.2} />}
            </button>
            {showQuoteList && (
              <MiniQuote
                hideWhenEmpty
                triggerClassName={`${styles.navBtn} ${styles.btnQuoteNav}`}
                triggerLabel="Quote List"
                triggerLabelClassName={styles.navBtnText}
              />
            )}
          </div>
        </div>
        <div
          ref={menuRef}
          className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ""}`}
          id="new-home-mobile-menu"
          inert={!menuOpen}
          aria-hidden={!menuOpen}
        >
          <nav aria-label="Mobile homepage navigation">
            {navLinks.map((link) => (
              <Link
                aria-current={isActiveLink(link.href) ? "page" : undefined}
                href={link.href}
                key={link.href}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
    </div>
  )
}
