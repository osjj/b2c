"use client"

import Image from "next/image"
import { useState } from "react"

// News data
const newsItems = [
  {
    id: "1",
    title: "Company Successfully Passes ISO9001:2015 Quality Management Certification",
    category: "Company News",
    date: "2024-12-20",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800",
    excerpt:
      "After rigorous audit and evaluation, our company has successfully passed the ISO9001:2015 quality management system certification, marking a new milestone in our quality management standards.",
  },
  {
    id: "2",
    title: "2024 Safety Equipment Industry Development Trend Report Released",
    category: "Industry News",
    date: "2024-12-15",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800",
    excerpt:
      "According to the latest industry data, the safety equipment market is expected to reach $50 billion in 2024, with smart manufacturing and automation becoming the main growth drivers.",
  },
  {
    id: "3",
    title: "New Product Launch: Auto-Darkening Welding Helmet Series",
    category: "Product News",
    date: "2024-12-10",
    image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800",
    excerpt:
      "Our company has launched a new series of auto-darkening welding helmets with TRUE COLOR technology, suitable for professional welding applications.",
  },
  {
    id: "4",
    title: "Winter Safety Equipment Maintenance and Care Guide",
    category: "Technical Tips",
    date: "2024-12-05",
    image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800",
    excerpt:
      "As temperatures drop in winter, safety equipment performance can be affected. This article introduces key points and precautions for winter equipment maintenance.",
  },
  {
    id: "5",
    title: "Company Successfully Participates in International Safety Equipment Expo",
    category: "Company News",
    date: "2024-11-28",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
    excerpt:
      "Our company showcased the latest products and solutions at the Safety Expo, attracting attention from numerous customers and partners.",
  },
  {
    id: "6",
    title: "How to Choose the Right Safety Helmet",
    category: "Technical Tips",
    date: "2024-11-20",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800",
    excerpt:
      "The selection of safety helmets directly affects worker protection. This article details the key points for helmet selection based on work environment.",
  },
  {
    id: "7",
    title: "Digital Ordering System Officially Launched",
    category: "Company News",
    date: "2024-11-15",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
    excerpt:
      "Our company's new digital ordering system is now live, providing customers with a more convenient and efficient purchasing experience.",
  },
  {
    id: "8",
    title: "Safety Equipment Trends in Smart Manufacturing",
    category: "Industry News",
    date: "2024-11-10",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800",
    excerpt:
      "With the rapid development of smart manufacturing, the safety equipment industry faces new opportunities and challenges, with products moving towards high-tech and intelligent directions.",
  },
]

const categories = ["All", "Company News", "Industry News", "Product News", "Technical Tips"]

export default function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState("All")

  const filteredNews =
    selectedCategory === "All"
      ? newsItems
      : newsItems.filter((item) => item.category === selectedCategory)

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[300px] bg-neutral-900">
        <Image
          src="https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600"
          alt="News & Insights"
          fill
          className="object-cover opacity-40"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-white mb-4">
              News & Insights
            </h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto px-4">
              Stay informed with industry trends and latest updates
            </p>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="bg-muted py-6 sticky top-[73px] z-40 border-b">
        <div className="container mx-auto px-6">
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-background/80 border"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* News Grid */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNews.map((item) => (
              <article
                key={item.id}
                className="bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow border"
              >
                <div className="aspect-video overflow-hidden bg-muted relative group">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                      {item.category}
                    </span>
                    <span>{item.date}</span>
                  </div>

                  <h3 className="text-lg font-semibold mb-3 line-clamp-2 min-h-[3.5rem]">
                    {item.title}
                  </h3>

                  <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                    {item.excerpt}
                  </p>

                  <button className="text-primary hover:text-primary/80 text-sm flex items-center gap-2 font-medium">
                    Read More
                    <span>→</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
