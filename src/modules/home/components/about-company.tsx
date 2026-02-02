"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { X } from "lucide-react"
import { Play, Calendar, Users, Ruler, ArrowRight } from "lucide-react"

const PannellumViewer = dynamic(() => import("@/components/pannellum-viewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-800">
      <div className="text-white/60 text-sm">Loading VR viewer...</div>
    </div>
  ),
})

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
const host = 'https://shop.laifappe.com'

const vrScenes = [
  {
    id: "factory",
    label: "Factory Tour",
    cubeMapPreview: {
      front: `${host}/vr/f.jpg`,
      right: `${host}/vr/l.jpg`,
      back: `${host}/vr/b.jpg`,
      left: `${host}/vr/r.jpg`,
      up: `${host}/vr/u.jpg`,
      down: `${host}/vr/d.jpg`,
    },
    cubeMapHD: {
      front: `${host}/vr2/f.jpg`,
      right: `${host}/vr2/l.jpg`,
      back: `${host}/vr2/b.jpg`,
      left: `${host}/vr2/r.jpg`,
      up: `${host}/vr2/u.jpg`,
      down: `${host}/vr2/d.jpg`,
    },
  },
  {
    id: "workshop",
    label: "Workshop Tour",
    cubeMapPreview: {
      front: `${host}/vr3/b.jpg`,
      right: `${host}/vr3/r.jpg`,
      back: `${host}/vr3/f.jpg`,
      left: `${host}/vr3/l.jpg`,
      up: `${host}/vr3/u.jpg`,
      down: `${host}/vr3/d.jpg`,
    },
    cubeMapHD: {
      front: `${host}/vr4/b.jpg`,
      right: `${host}/vr4/r.jpg`,
      back: `${host}/vr4/f.jpg`,
      left: `${host}/vr4/l.jpg`,
      up: `${host}/vr4/u.jpg`,
      down: `${host}/vr4/d.jpg`,
    },
  },
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
  const [activeVr, setActiveVr] = useState<(typeof vrScenes)[0] | null>(null)

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
          <p className="text-sm tracking-wide uppercase text-slate-400 font-medium mb-4">
            VR Factory Tour
          </p>

          {/* VR Scenes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vrScenes.map((scene) => (
              <button
                key={scene.id}
                onClick={() => {
                  setActiveVr(scene)
                  setVrOpen(true)
                }}
                className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video w-full block group cursor-pointer"
              >
                {/* Background VR animation */}
                <div className="absolute inset-0 pointer-events-none">
                  <PannellumViewer
                    cubeMap={scene.cubeMapPreview}
                    autoRotate={-1}
                    autoLoad={true}
                    showControls={false}
                  />
                </div>
                {/* Click overlay with VR icon */}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Image
                    src="/vr360.png"
                    alt="360° VR"
                    width={120}
                    height={120}
                    className="opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
                  />
                </div>
                {/* Label */}
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="text-white text-sm font-medium drop-shadow bg-black/40 px-3 py-1 rounded-lg">
                    {scene.label}
                  </span>
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

      {/* VR Modal - HD Version */}
      <Dialog open={vrOpen} onOpenChange={setVrOpen}>
        <DialogContent className="max-w-6xl p-0 overflow-hidden bg-slate-900 border-white/10" showCloseButton={false}>
          <DialogHeader className="px-6 pt-5 pb-3">
            <DialogTitle className="text-white flex items-center gap-2">
              {activeVr?.label} — 360° Virtual Tour
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">HD</span>
            </DialogTitle>
          </DialogHeader>
          {/* Custom close button */}
          <DialogClose className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative aspect-video bg-slate-800">
            {vrOpen && activeVr && (
              <PannellumViewer
                cubeMap={activeVr.cubeMapHD}
                autoRotate={-2}
                autoLoad={true}
              />
            )}
          </div>
          <div className="px-6 py-3 bg-slate-800/50 border-t border-white/10">
            <p className="text-white/60 text-xs text-center">
              Drag to look around • Use controls to navigate
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
