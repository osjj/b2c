"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Play, Calendar, Users, Ruler, ArrowRight } from "lucide-react"

const stats = [
  {
    icon: Calendar,
    value: "2003",
    label: "Founded In",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Users,
    value: "100+",
    label: "Professional Technicians",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Ruler,
    value: "20,000",
    suffix: "m\u00B2",
    label: "Plant Area",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
]

const galleryImages = [
  { src: "/company/f1.webp", alt: "Factory production line" },
  { src: "/company/f2.webp", alt: "Quality inspection process" },
  { src: "/company/f3.webp", alt: "Modern manufacturing equipment" },
]

const vrImages = [
  { src: "/company/f1.webp", label: "Production Workshop" },
  { src: "/company/f2.webp", label: "Assembly Line" },
  { src: "/company/f3.webp", label: "Quality Lab" },
]

function Icon360({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      {/* 360 arrow hint */}
      <path d="M17 7l1.5-1.5M17 7h-2.5M17 7v2.5" />
    </svg>
  )
}

export default function AboutCompany() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [vrOpen, setVrOpen] = useState(false)
  const [activeVr, setActiveVr] = useState<(typeof vrImages)[0] | null>(null)

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container mx-auto px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <h3 className="text-lg md:text-xl font-bold tracking-widest uppercase text-primary mb-4">
            — Who We Are —
          </h3>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Discover Our <span className="text-primary">Story</span>
          </h2>
          <div className="w-16 h-1 bg-primary mx-auto rounded-full" />
        </div>

        {/* Main content: Video + Info */}
        <div className="grid lg:grid-cols-5 gap-10 items-start">
          {/* Video + Gallery area - takes 3 cols */}
          <div className="lg:col-span-3 space-y-4">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-white/10">
              {!isPlaying ? (
                <div className="relative aspect-video bg-slate-800">
                  <Image
                    src="/company/f1.webp"
                    alt="Factory tour video"
                    fill
                    className="object-cover opacity-60"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => setIsPlaying(true)}
                      className="group relative"
                      aria-label="Play factory tour video"
                    >
                      <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                      <span className="relative flex items-center justify-center w-20 h-20 rounded-full bg-primary text-white shadow-lg shadow-primary/40 group-hover:scale-110 transition-transform">
                        <Play className="h-8 w-8 ml-1" fill="currentColor" />
                      </span>
                    </button>
                  </div>
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-white text-sm font-medium">Factory Tour</span>
                  </div>
                </div>
              ) : (
                <div className="aspect-video">
                  <iframe
                    src="https://www.youtube.com/embed/a1mSxy5YMa8?autoplay=1&rel=0&hd=1&vq=hd1080"
                    title="Factory Tour Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              )}
            </div>

            {/* Gallery - aligned with video */}
            <div className="grid grid-cols-3 gap-3">
              {galleryImages.map((img) => (
                <div
                  key={img.src}
                  className="group relative overflow-hidden rounded-lg border border-white/10 aspect-[4/3]"
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-white text-xs font-medium">{img.alt}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Info area - takes 2 cols */}
          <div className="lg:col-span-2 flex flex-col justify-center">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-6 leading-tight">
              Professional Factory Production Since{" "}
              <span className="text-primary">2003</span>
            </h3>

            <p className="text-slate-300 leading-relaxed mb-8">
              Founded in Foshan City, we are a professional factory specializing in
              the production of safety shoes, safety clothing, helmets, and other
              safety integration products. With 7 professional production lines and
              a team of senior designers, we deliver high-quality PPE solutions to
              clients worldwide.
            </p>

            {/* Stats cards */}
            <div className="space-y-4 mb-8">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
                >
                  <div
                    className={`flex-shrink-0 w-12 h-12 ${stat.bg} rounded-lg flex items-center justify-center`}
                  >
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl font-bold ${stat.color}`}>
                        {stat.value}
                      </span>
                      {stat.suffix && (
                        <span className={`text-sm font-medium ${stat.color}`}>
                          {stat.suffix}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-slate-400">{stat.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* VR Factory Tour - full width */}
        <div className="mt-12">
          <p className="text-sm tracking-wide uppercase text-slate-400 mb-4 font-medium">
            VR Factory Tour
          </p>
          <div className="grid grid-cols-3 gap-4">
            {vrImages.map((vr) => (
              <button
                key={vr.label}
                onClick={() => {
                  setActiveVr(vr)
                  setVrOpen(true)
                }}
                className="group relative overflow-hidden rounded-lg border border-white/10 aspect-[4/3] cursor-pointer"
              >
                <Image
                  src={vr.src}
                  alt={vr.label}
                  fill
                  className="object-cover"
                />
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                {/* 360 icon */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                  <Icon360 className="w-8 h-8 text-white drop-shadow-lg group-hover:scale-110 transition-transform" />
                  <span className="text-white text-[10px] font-semibold tracking-wide uppercase">
                    360&deg;
                  </span>
                </div>
                {/* Label */}
                <div className="absolute bottom-2 left-2 right-2">
                  <span className="text-white text-xs font-medium drop-shadow">{vr.label}</span>
                </div>
              </button>
            ))}
          </div>

          <Button size="lg" className="w-fit group mt-8" asChild>
            <Link href="/about">
              Learn More About Us
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>

      {/* VR Modal */}
      <Dialog open={vrOpen} onOpenChange={setVrOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-900 border-white/10">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-white">
              {activeVr?.label} — 360° View
            </DialogTitle>
          </DialogHeader>
          <div className="relative aspect-video bg-slate-800">
            {activeVr && (
              <Image
                src={activeVr.src}
                alt={activeVr.label}
                fill
                className="object-cover"
              />
            )}
            {/* VR placeholder overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
              <Icon360 className="w-16 h-16 text-white/80 mb-3 animate-spin-slow" />
              <p className="text-white/80 text-sm font-medium">
                Drag to explore 360° view
              </p>
              <p className="text-white/40 text-xs mt-1">
                VR experience coming soon
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* slow spin animation */}
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        :global(.animate-spin-slow) {
          animation: spin-slow 6s linear infinite;
        }
      `}</style>
    </section>
  )
}
