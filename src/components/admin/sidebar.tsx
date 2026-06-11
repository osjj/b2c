"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Layers,
  Tags,
  ShoppingCart,
  FileText,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Store,
  MessageSquare,
  Lightbulb,
  Mail,
  MailCheck,
  Newspaper,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

const menuItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/solutions", label: "Solutions", icon: Lightbulb },
  { href: "/admin/blog", label: "Blog", icon: Newspaper },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/collections", label: "Collections", icon: Layers },
  { href: "/admin/attributes", label: "Attributes", icon: Tags },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/quotes", label: "Quotes", icon: FileText },
  { href: "/admin/chat", label: "Chat", icon: MessageSquare },
  { href: "/admin/email", label: "Email", icon: Mail },
  { href: "/admin/quote-emails", label: "Quote Emails", icon: MailCheck },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "bg-card border-r min-h-screen flex shrink-0 flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-20 md:w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-3 md:px-4">
        {!collapsed && (
          <Link href="/admin" className="flex w-full items-center justify-center gap-2 md:justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Store className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="hidden font-serif text-lg tracking-wide md:inline">Laifappe</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <Store className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-all duration-200 md:justify-start md:px-3",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "md:justify-center md:px-2"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0", collapsed && "h-5 w-5")} />
                {!collapsed && <span className="hidden md:inline">{item.label}</span>}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t space-y-1">
        <Link
          href="/"
          target="_blank"
          className={cn(
            "flex items-center justify-center gap-3 rounded-lg px-2 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:justify-start md:px-3",
            collapsed && "md:justify-center md:px-2"
          )}
          title={collapsed ? "View Store" : undefined}
        >
          <Store className="h-5 w-5" />
          {!collapsed && <span className="hidden md:inline">View Store</span>}
        </Link>
        <button
          className={cn(
            "flex w-full items-center justify-center gap-3 rounded-lg px-2 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:justify-start md:px-3",
            collapsed && "md:justify-center md:px-2"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="hidden md:inline">Logout</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn("w-full", collapsed && "px-2")}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
