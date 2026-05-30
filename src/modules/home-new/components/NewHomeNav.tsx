"use client"

import Image from "next/image"
import Link from "next/link"
import { MiniQuote } from "@/components/store/mini-quote"
import { Mail, Menu, MessageCircle, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { QuoteDrawer } from "./QuoteRequestForm"
import styles from "./home-new.module.css"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/solutions", label: "Solutions" },
  { href: "/tools", label: "Tools" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
]

export function NewHomeNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const showQuoteList = process.env.NEXT_PUBLIC_PROJECT_TYPE === "B2B"

  const isActiveLink = (href: string) => {
    if (href === "/") {
      return pathname === "/"
    }

    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div className={styles.navSticky}>
      <header className={styles.nav}>
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
        <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ""}`} id="new-home-mobile-menu">
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
