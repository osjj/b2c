import type { Metadata } from "next"
import { AboutNewPage } from "@/modules/about-new"
import { buildPageTitle } from "@/lib/seo-title"

export const metadata: Metadata = {
  title: {
    absolute: buildPageTitle("About Laifappe PPE Manufacturer"),
  },
  description:
    "Inspect Laifappe's PPE manufacturing capability, certifications, OEM/ODM workflow, warehouse, export process, and contact details before sourcing bulk safety equipment.",
}

export default function AboutPage() {
  return <AboutNewPage />
}
