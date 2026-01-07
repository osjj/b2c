import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Edit, MoreHorizontal, Trash2 } from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const categories = [
  {
    id: "1",
    name: "Home Decor",
    slug: "home-decor",
    products: 24,
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=200&h=200&fit=crop",
  },
  {
    id: "2",
    name: "Textiles",
    slug: "textiles",
    products: 18,
    image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=200&h=200&fit=crop",
  },
  {
    id: "3",
    name: "Storage",
    slug: "storage",
    products: 12,
    image: "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=200&h=200&fit=crop",
  },
  {
    id: "4",
    name: "Art",
    slug: "art",
    products: 15,
    image: "https://images.unsplash.com/photo-1582201942988-13e60e4556ee?w=200&h=200&fit=crop",
  },
  {
    id: "5",
    name: "Garden",
    slug: "garden",
    products: 8,
    image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=200&h=200&fit=crop",
  },
  {
    id: "6",
    name: "Lighting",
    slug: "lighting",
    products: 10,
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=200&h=200&fit=crop",
  },
]

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl mb-1">Categories</h1>
          <p className="text-muted-foreground">Organize your products into collections</p>
        </div>
        <Button asChild>
          <Link href="/admin/categories/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Link>
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Card key={category.id} className="overflow-hidden group">
            <div className="aspect-video relative overflow-hidden">
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="font-serif text-xl">{category.name}</h3>
                <p className="text-sm opacity-80">{category.products} products</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem>View Products</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">/{category.slug}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
