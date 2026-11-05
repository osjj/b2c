"use client"

import Link from "next/link"
import {
  ArrowRight,
  Boxes,
  ChevronDown,
  ChevronRight,
  Ear,
  Eye,
  Flame,
  Footprints,
  Hand,
  HardHat,
  Package,
  ShieldCheck,
  Shirt,
  Umbrella,
  Wind,
  type LucideIcon,
} from "lucide-react"
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import type { buildProductCategoryNavigation } from "@/lib/product-category-navigation"
import styles from "./products-nav-menu.module.css"

type ProductsNavMenuProps = {
  categories: ReturnType<typeof buildProductCategoryNavigation>
  active: boolean
  isToolsPage: boolean
  mobile?: boolean
  onNavigate?: () => void
}

const categoryIcons: Record<string, LucideIcon> = {
  "fall-protection": ShieldCheck,
  "respiratory-protection": Wind,
  "body-protection": Shirt,
  "hand-protection": Hand,
  "hearing-protection": Ear,
  "head-protection": HardHat,
  "firefighting-equipment": Flame,
  "eye-protection": Eye,
  rainwear: Umbrella,
  "foot-protection": Footprints,
  "other-supplies": Boxes,
}

export function ProductsNavMenu({
  categories,
  active,
  isToolsPage,
  mobile = false,
  onNavigate,
}: ProductsNavMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const firstCategoryRef = useRef<HTMLAnchorElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const keyboardFocusRef = useRef(false)
  const skipFocusOpenRef = useRef(false)
  const focusFirstRef = useRef(false)
  const panelId = useId()
  const hasCategories = categories.length > 0

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const close = useCallback(() => {
    cancelClose()
    focusFirstRef.current = false
    setOpen(false)
  }, [cancelClose])

  const closeAndRestoreFocus = useCallback(() => {
    close()
    skipFocusOpenRef.current = true
    toggleRef.current?.focus()
    skipFocusOpenRef.current = false
  }, [close])

  useEffect(() => cancelClose, [cancelClose])

  useEffect(() => {
    if (!open) return
    if (focusFirstRef.current) {
      firstCategoryRef.current?.focus()
      focusFirstRef.current = false
    }

    const outside = (event: globalThis.PointerEvent | FocusEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) close()
    }
    const keydown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return
      event.preventDefault()
      closeAndRestoreFocus()
    }

    document.addEventListener("pointerdown", outside)
    document.addEventListener("focusin", outside)
    document.addEventListener("keydown", keydown)
    window.addEventListener("resize", close)
    window.addEventListener("popstate", close)
    return () => {
      document.removeEventListener("pointerdown", outside)
      document.removeEventListener("focusin", outside)
      document.removeEventListener("keydown", keydown)
      window.removeEventListener("resize", close)
      window.removeEventListener("popstate", close)
    }
  }, [open, close, closeAndRestoreFocus])

  const navigate = () => {
    close()
    onNavigate?.()
  }

  const keydown = (event: KeyboardEvent<HTMLDivElement>) => {
    keyboardFocusRef.current = true
    if (event.key === "Escape" && open) {
      event.preventDefault()
      event.stopPropagation()
      closeAndRestoreFocus()
    } else if (
      event.key === "ArrowDown" &&
      hasCategories &&
      event.target instanceof HTMLElement &&
      event.target.closest(`.${styles.trigger}`)
    ) {
      event.preventDefault()
      cancelClose()
      if (open) firstCategoryRef.current?.focus()
      else {
        focusFirstRef.current = true
        setOpen(true)
      }
    }
  }

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${mobile ? styles.mobile : styles.desktop}`}
      data-active={active}
      data-tools-page={isToolsPage}
      onKeyDown={keydown}
      onPointerDown={() => { keyboardFocusRef.current = false }}
      onPointerEnter={(event) => {
        cancelClose()
        if (!mobile && hasCategories && event.pointerType !== "touch") setOpen(true)
      }}
      onPointerLeave={() => {
        if (mobile) return
        cancelClose()
        closeTimerRef.current = setTimeout(() => {
          closeTimerRef.current = null
          if (keyboardFocusRef.current && panelRef.current?.contains(document.activeElement)) return
          close()
        }, 150)
      }}
      onFocusCapture={(event) => {
        cancelClose()
        if (event.target.matches(":focus-visible")) {
          keyboardFocusRef.current = true
          if (!mobile && hasCategories && !skipFocusOpenRef.current) setOpen(true)
        }
      }}
      onBlur={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
          keyboardFocusRef.current = false
          close()
        }
      }}
    >
      <div className={styles.trigger}>
        <Link
          className={styles.productsLink}
          href="/products"
          aria-current={active ? "page" : undefined}
          onClick={navigate}
        >
          Products
        </Link>
        {hasCategories && (
          <button
            ref={toggleRef}
            className={styles.toggle}
            type="button"
            aria-label="Browse product categories"
            aria-controls={panelId}
            aria-expanded={open}
            onClick={() => {
              cancelClose()
              setOpen((value) => !value)
            }}
          >
            <ChevronDown size={15} aria-hidden="true" />
          </button>
        )}
      </div>
      {open && hasCategories && (
        <section ref={panelRef} className={styles.panel} id={panelId} aria-label="Product categories">
          <div className={styles.catalogIntro}>
            <p className={styles.catalogLabel}>Product catalog</p>
            <p className={styles.catalogTitle}>Find your protection.</p>
            <p className={styles.catalogDescription}>Browse our range by category.</p>
            <Link className={styles.allProducts} href="/products" onClick={navigate}>
              All products <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.catalogContent}>
            <p className={styles.panelLabel}>Shop by category</p>
            <ul className={styles.categories}>
              {categories.map((category, index) => {
                const Icon = categoryIcons[category.slug] ?? Package
                return (
                  <li key={category.id}>
                    <Link
                      ref={index === 0 ? firstCategoryRef : undefined}
                      className={styles.categoryLink}
                      href={category.href}
                      onClick={navigate}
                    >
                      <span className={styles.categoryIcon}>
                        <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
                      </span>
                      <span className={styles.categoryName}>{category.name}</span>
                      <ChevronRight className={styles.categoryArrow} size={13} aria-hidden="true" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
