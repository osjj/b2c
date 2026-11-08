"use client"

import Image from "next/image"
import { useState } from "react"
import styles from "../information.module.css"

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
    <div className={styles.page}>
      <div className={styles.wide}>
        <header className={styles.newsHeading}>
          <div className={styles.heading}>
            <h1>News & Insights</h1>
            <p>Stay informed with industry trends and latest updates</p>
          </div>
          <div className={styles.heroImage}>
            <Image
              src="https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600"
              alt="News & Insights"
              fill
              sizes="(max-width: 680px) 100vw, 42vw"
              priority
            />
          </div>
        </header>

        <div className={styles.filters} role="group" aria-label="News category">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={styles.filter}
              aria-pressed={selectedCategory === category}
            >
              {category}
            </button>
          ))}
        </div>

        <section className={styles.newsGrid} aria-label="News articles">
          {filteredNews.map((item) => (
            <article key={item.id} className={styles.card}>
              <div className={styles.cardImage}>
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(max-width: 680px) 100vw, (max-width: 940px) 50vw, 33vw"
                />
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardMeta}>
                  <span>{item.category}</span>
                  <time dateTime={item.date}>{item.date}</time>
                </div>
                <h2>{item.title}</h2>
                <p>{item.excerpt}</p>
                <button type="button" className={styles.readMore}>
                  Read More
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  )
}
