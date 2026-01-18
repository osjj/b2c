"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, Menu, Search, Heart, LogOut, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { logout } from "@/actions/auth"
import { MiniCart } from "./mini-cart"
import { MiniQuote } from "./mini-quote"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/cases", label: "Cases" },
  { href: "/news", label: "News" },
  { href: "/about", label: "About" },
]

interface HeaderProps {
  user?: {
    id?: string
    name?: string | null
    email?: string | null
    role?: string
  } | null
}

export function Header({ user }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-500",
        scrolled
          ? "bg-background/95 backdrop-blur-md shadow-sm border-b"
          : "bg-transparent"
      )}
    >
      {/* Top announcement bar */}
      <div className="bg-primary text-primary-foreground text-center py-2 text-xs tracking-widest uppercase">
        Free shipping on orders over $150
      </div>

      <div className="container mx-auto px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Left section - Logo & Navigation */}
          <div className="flex items-center gap-8">
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="hover:bg-accent">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 pt-12">
                <SheetHeader>
                  <SheetTitle className="text-left font-serif text-2xl tracking-wide">
                    Menu
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 mt-8">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "py-4 text-lg font-light tracking-wide border-b border-border/50 transition-colors hover:text-primary",
                        isActive(link.href) && "text-primary font-medium"
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/" className="group">
              <h1 className="font-serif text-2xl md:text-3xl tracking-[0.2em] font-medium transition-colors group-hover:text-primary">
                MAISON
              </h1>
              <p className="text-[10px] tracking-[0.3em] text-muted-foreground text-center -mt-1">
                CURATED GOODS
              </p>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8 group/nav">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-base font-medium tracking-wide transition-all relative",
                    "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:bg-primary after:transition-all",
                    isActive(link.href)
                      ? "text-primary after:w-full group-hover/nav:text-foreground/50 group-hover/nav:after:w-0 hover:!text-primary hover:!after:w-full"
                      : "text-foreground/80 after:w-0 hover:text-primary hover:after:w-full"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center gap-3">
            {/* Search button */}
            <Button variant="ghost" size="icon" className="hover:bg-accent hidden sm:flex" asChild>
              <Link href="/orders?tab=lookup" title="Order Lookup">
                <Search className="h-6 w-6" />
              </Link>
            </Button>

            <Button variant="ghost" size="icon" className="hover:bg-accent hidden sm:flex">
              <Heart className="h-6 w-6" />
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover:bg-accent">
                    <User className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm font-medium">
                    {user.name || user.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account">My Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/orders">My Orders</Link>
                  </DropdownMenuItem>
                  {user.role === 'ADMIN' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin">Admin Dashboard</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <form action={logout}>
                      <button type="submit" className="flex w-full items-center">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size="icon" className="hover:bg-accent" asChild>
                  <Link href="/orders" title="My Orders">
                    <Package className="h-6 w-6" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="hover:bg-accent text-base" asChild>
                  <Link href="/login">Login</Link>
                </Button>
              </>
            )}

            {process.env.NEXT_PUBLIC_PROJECT_TYPE === 'B2B' ? (
              <MiniQuote />
            ) : (
              <MiniCart />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
