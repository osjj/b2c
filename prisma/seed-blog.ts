/**
 * Seeds blog posts from markdown files at the project root.
 *
 * Current supported posts:
 *   - construction-safety-footwear-guide
 *   - osha-ppe-requirements-construction
 *   - bulk-construction-ppe-procurement
 *   - contractor-ppe-kit-checklist
 *   - construction-hearing-protection
 *   - construction-respiratory-protection
 *   - type-1-vs-type-2-hard-hats
 *   - construction-hard-hat-types
 *   - high-visibility-clothing-construction
 *   - construction-safety-helmet-vs-hard-hat
 *   - heat-stress-ppe-construction-workers
 *   - heavy-equipment-operator-ppe-checklist
 *   - trenching-excavation-ppe-checklist
 *   - scaffolding-ppe-checklist
 *
 * Idempotent: safe to re-run via `npm run db:seed:blog` because each post is
 * upserted on `slug`.
 *
 * Supported markdown subset:
 *   - `#` / `##` / `###` / `####` -> header block
 *   - `---`                       -> delimiter block
 *   - `- ` / `* `                 -> unordered list block
 *   - `1. ` / `2. `               -> ordered list block
 *   - `> quote`                   -> quote block
 *   - GFM-style tables            -> table block
 *   - blank line                  -> paragraph/list/quote break
 *   - everything else             -> paragraph block
 *
 * Inline formatting:
 *   - **bold**
 *   - *italic*
 *   - `code`
 *   - [link](url)
 *
 * For posts that define section image mappings, an illustration is injected
 * after the first paragraph following each H2 heading.
 */

import { PrismaClient } from '@prisma/client'
import { readFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const prisma = new PrismaClient()

type SectionImageMap = Record<string, { url: string; caption: string }>

interface BlogSeedConfig {
  slug: string
  markdownPath: string
  generatedImagesPath: string
  title: string
  excerpt: string
  seoTitle: string
  seoDescription: string
  seoKeywords: string
  heroFallback: string
  sectionImages?: SectionImageMap
}

const BLOG_POSTS: BlogSeedConfig[] = [
  {
    slug: 'construction-safety-footwear-guide',
    markdownPath: join(process.cwd(), 'construction-safety-footwear-guide.md'),
    generatedImagesPath: join(__dirname, 'blog-images.generated.json'),
    title: 'Construction Safety Footwear Guide: ASTM, EN ISO 20345 and Size Planning',
    excerpt:
      'Choose construction safety footwear by site hazard, ASTM F2413 or EN ISO 20345 rating, slip and puncture risk, electrical exposure, and bulk size planning.',
    seoTitle:
      'Construction Safety Footwear Guide | ASTM, EN & Sizes',
    seoDescription:
      'Choose construction safety footwear by site hazard, ASTM F2413 or EN ISO 20345 rating, slip/puncture risk, electrical exposure, and bulk size planning.',
    seoKeywords:
      'construction safety footwear, construction site footwear, safety footwear construction site, construction safety boots, steel toe boots construction, ASTM F2413, EN ISO 20345, safety boots for construction workers, composite toe vs steel toe, puncture resistant boots construction, bulk safety footwear size planning',
    heroFallback:
      'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1600&q=80',
    sectionImages: {
      'Foot Hazards on a Construction Site': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'Active construction sites present a wider range of foot hazards than almost any other workplace.',
      },
      'OSHA Safety Footwear Requirements for Construction': {
        url: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?w=1200&q=80',
        caption:
          'OSHA 29 CFR 1926.95/96 mandates protective footwear wherever falling objects, punctures or electrical hazards are possible.',
      },
      'Understanding ASTM F2413: The US Safety Footwear Standard': {
        url: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?w=1200&q=80',
        caption:
          'ASTM F2413 specifies impact, compression, puncture and electrical hazard protection for North American safety footwear.',
      },
      'Understanding EN ISO 20345: The European Safety Footwear Standard': {
        url: 'https://images.unsplash.com/photo-1521334884684-d80222895322?w=1200&q=80',
        caption:
          'EN ISO 20345 uses S1–S5 classes to bundle common feature sets for European safety boots.',
      },
      'Steel Toe vs Composite Toe vs Aluminium Toe: Which to Choose': {
        url: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=1200&q=80',
        caption:
          'Modern safety boots offer steel, composite, or aluminium toe caps — each with distinct trade-offs.',
      },
      'Matching Safety Footwear to Construction Sub-Trades': {
        url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=1200&q=80',
        caption:
          'Each construction sub-trade — electrician, scaffolder, concrete worker — has its own footwear priorities.',
      },
      'How to Read the Boot Label: A Practical Checklist': {
        url: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=1200&q=80',
        caption:
          'A safety boot label tells you, in minutes, whether it matches your hazard assessment.',
      },
      'Common Mistakes in Construction Safety Footwear Selection': {
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
        caption:
          'Most construction foot injuries trace back to avoidable mistakes in selection and fit.',
      },
      'Care and Maintenance of Construction Safety Boots': {
        url: 'https://images.unsplash.com/photo-1449247709967-d4461a6a6103?w=1200&q=80',
        caption:
          'Routine cleaning, inspection and re-waterproofing extend the protective life of safety boots.',
      },
      'Regulatory Summary: OSHA and EU Requirements Side by Side': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'US OSHA and EU Regulation 2016/425 overlap substantially but differ in the detailed standards they reference.',
      },
    },
  },
  {
    slug: 'construction-ppe-checklist',
    markdownPath: join(process.cwd(), 'construction-ppe-checklist.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.construction-ppe-checklist.generated.json',
    ),
    title:
      'Construction PPE Checklist: Site Entry, Task Add-Ons and Worker PPE List',
    excerpt:
      'A practical construction PPE checklist for site entry, task add-ons, trade-based worker PPE lists, fit checks, replacement stock, and start-of-shift routines.',
    seoTitle:
      'Construction PPE Checklist | Site Entry & Task Add-Ons',
    seoDescription:
      'Use this construction PPE checklist for hard hats, eye protection, gloves, boots, hi-vis, respirators, fall protection, task add-ons, and shift checks.',
    seoKeywords:
      'construction PPE checklist, PPE checklist for construction workers, construction site PPE checklist, what PPE is required on a construction site, construction worker PPE list, site entry PPE checklist, construction PPE by trade',
    heroFallback:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80',
    sectionImages: {
      'Section 1: Universal Construction PPE Checklist': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'A usable construction PPE checklist starts with a strong baseline layer before task-specific hazards are added.',
      },
      'Section 2: Quick Reference By Common Construction Exposure': {
        url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80',
        caption:
          'Different construction exposures call for different PPE combinations, even when workers share the same site.',
      },
      'Section 3: Task-Based Add-Ons That Sites Commonly Miss': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'Most PPE gaps happen when sites stop at the baseline bundle and forget task-specific add-ons like fall, dust, or electrical protection.',
      },
      'Section 4: A Supervisor Start-Of-Shift PPE Checklist': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'A short supervisor pre-start routine does more for PPE execution than a long checklist nobody uses in the field.',
      },
      'Section 5: Employer And Program-Level PPE Checklist': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'Construction PPE becomes more defensible when the site can connect field issue, fit, training, and replacement back to a real program.',
      },
      'Section 6: Common Construction PPE Mistakes': {
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
        caption:
          'Construction PPE failures usually come from repetition and routine, not from dramatic one-off mistakes.',
      },
    },
  },
  {
    slug: 'osha-ppe-requirements-construction',
    markdownPath: join(process.cwd(), 'osha-ppe-requirements-construction.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.osha-ppe-requirements-construction.generated.json',
    ),
    title: 'OSHA PPE Requirements for Construction: Complete Compliance Guide',
    excerpt:
      'A regulation-first 2026 guide to OSHA PPE requirements for construction covering 29 CFR 1926 Subpart E, the proper-fit rule, heat enforcement context, hazard assessment, training, inspections, and citation risk.',
    seoTitle: 'OSHA PPE Requirements for Construction: Complete Compliance Guide 2026',
    seoDescription:
      '2026 guide to OSHA construction PPE requirements: 29 CFR 1926 Subpart E, proper fit, heat enforcement, hazard assessment, training, and inspections.',
    seoKeywords:
      'OSHA PPE requirements construction, 29 CFR 1926 PPE, OSHA construction PPE standards, construction PPE compliance, OSHA 1926.95, PPE hazard assessment construction, OSHA construction safety regulations 2026',
    heroFallback:
      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1600&q=80',
    sectionImages: {
      'The 2026 Reminder: Proper Fit Is Now an Active PPE Compliance Issue': {
        url: 'https://images.unsplash.com/photo-1541976590-713941681591?w=1200&q=80',
        caption:
          'The construction PPE fit rule should now be treated as an active compliance requirement, not a future purchasing project.',
      },
      '2026 Heat Enforcement Context: PPE Can Add Heat Burden': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'Heat enforcement makes PPE selection, breathability, acclimatization, water, rest, and shade part of the same compliance conversation.',
      },
      'Hazard Assessment: The Step That Drives Everything Else': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'A defensible PPE program starts with a written, task-specific hazard assessment instead of a generic site checklist.',
      },
      'The PPE Areas That Create the Most Compliance Exposure': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'Fall exposure, respirators, visibility, and high-noise tasks are the areas where construction employers most often create OSHA risk.',
      },
      'What OSHA Inspectors Commonly Look For': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'PPE inspections are usually a mix of documentation review, direct worker observation, and visible equipment condition checks.',
      },
      'Penalties and Citation Exposure Contractors Should Check in 2026': {
        url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80',
        caption:
          'For contractors, the real penalty risk comes from multiplication across workers, tasks, and standards rather than a single top-line fine.',
      },
    },
  },
  {
    slug: 'heat-stress-ppe-construction-workers',
    markdownPath: join(process.cwd(), 'heat-stress-ppe-construction-workers.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.heat-stress-ppe-construction-workers.generated.json',
    ),
    title:
      'Heat Stress PPE for Construction Workers: Hot Weather Safety Gear and Checklist',
    excerpt:
      'A practical hot-weather construction PPE guide covering breathable hi-vis, cooling PPE, sun protection, helmets, gloves, boots, respirators, hydration support, shade, rest breaks, and heat stress procurement.',
    seoTitle:
      'Heat Stress PPE for Construction Workers | Hot Weather Safety Gear',
    seoDescription:
      'Choose heat stress PPE for construction: breathable hi-vis, cooling PPE, sun protection, respirators, hydration, shade, rest breaks, and hot-weather kits.',
    seoKeywords:
      'heat stress PPE construction, hot weather construction PPE, cooling PPE construction workers, breathable hi vis construction, construction heat safety gear, OSHA heat construction PPE, summer construction PPE checklist, heat stress safety equipment',
    heroFallback:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80',
    sectionImages: {
      'Quick Heat Stress PPE Checklist for Construction': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'A heat stress PPE checklist should cover clothing, cooling support, hydration, shade, rest, acclimatization, and emergency response.',
      },
      '2026 OSHA Heat Enforcement Context': {
        url: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&q=80',
        caption:
          'OSHA heat enforcement makes hot-weather planning a practical issue for construction supervisors and PPE buyers.',
      },
      'Breathable High-Visibility Clothing for Hot Weather': {
        url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80',
        caption:
          'Hot-weather hi-vis garments need to balance breathability, visibility class, color contrast, and reflective performance.',
      },
      'Head, Face, and Sun Protection': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'Head and face protection must remain compatible with sun protection, sweat management, eyewear, hearing protection, and respirators.',
      },
      'Cooling PPE: Vests, Towels, and Shade Kits': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'Cooling PPE works best when it is paired with practical recharging, cleaning, shade, rest, and hydration logistics.',
      },
      'Water, Rest, Shade, and Acclimatization': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'Heat illness prevention depends on water, rest, shade, acclimatization, supervision, and emergency response, not PPE alone.',
      },
      'Respiratory Protection and Heat Burden': {
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
        caption:
          'Respirators can add heat and breathing burden, so dust and silica work needs stronger heat planning instead of weaker protection.',
      },
      'Heat Illness Symptoms and Emergency Readiness': {
        url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&q=80',
        caption:
          'A hot-weather PPE program should include early symptom recognition, fast cooling, communication, and emergency access.',
      },
      'Procurement Checklist for Heat Stress PPE': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'Hot-weather PPE procurement should specify breathability, fit, standards, replacement stock, cooling support, and hydration equipment together.',
      },
    },
  },
  {
    slug: 'construction-gloves-selection-guide',
    markdownPath: join(process.cwd(), 'construction-gloves-selection-guide.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.construction-gloves-selection-guide.generated.json',
    ),
    title:
      'Construction Site Safety Gloves: Hand Protection Guide for Rebar, Cut and Impact Work',
    excerpt:
      'Choose construction site safety gloves by task: rebar, cut, abrasion, wet cement, impact tools, electrical work, fit, and bulk glove orders.',
    seoTitle:
      'Construction Site Safety Gloves | Hand Protection Guide',
    seoDescription:
      'Choose construction site safety gloves by task: rebar, cut, abrasion, wet cement, impact tools, electrical work, fit, and bulk glove orders.',
    seoKeywords:
      'construction site safety gloves, safety gloves for construction sites, construction hand protection, hand protection in construction, construction gloves how to choose, construction work gloves, gloves used in construction, proper hand protection for rebar work, cut resistant gloves construction, impact gloves construction, gloves for masonry work, welding gloves construction, electrical gloves construction',
    heroFallback:
      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1600&q=80',
    sectionImages: {
      'What OSHA Requires for Construction Gloves': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'Construction glove compliance starts with hazard matching, fit, and task-specific PPE selection rather than a generic issue policy.',
      },
      'The Main Glove Hazards on Construction Sites': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'Construction hand hazards often overlap, which is why glove choice has to balance cut, abrasion, impact, wet work, and dexterity together.',
      },
      'The Main Types of Construction Gloves': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'General handling gloves, cut gloves, impact gloves, chemical gloves, welding gloves, and insulating gloves all serve different construction tasks.',
      },
      'How To Read Construction Glove Labels and Standards': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'Standards only help when the buyer knows which test result actually maps to the hand hazard on site.',
      },
      'Glove Materials and Coatings: What They Usually Do Well': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'Material and coating choices often decide whether a glove performs well in wet, oily, abrasive, or sharp construction conditions.',
      },
      'How To Choose Gloves by Construction Task': {
        url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80',
        caption:
          'A stronger glove program starts by matching the glove family to the real task instead of forcing one glove across the whole site.',
      },
      'Common Glove Buying Mistakes on Construction Sites': {
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
        caption:
          'Most glove failures come from oversimplified buying decisions, not from a lack of PPE on paper.',
      },
    },
  },
  {
    slug: 'construction-eye-face-protection',
    markdownPath: join(process.cwd(), 'construction-eye-face-protection.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.construction-eye-face-protection.generated.json',
    ),
    title:
      'Construction Eye and Face Protection: Safety Glasses, Goggles and Face Shields',
    excerpt:
      'Choose construction eye and face protection by task: safety glasses, goggles, face shields, welding eye protection, dust, splash, grinding, and side protection.',
    seoTitle:
      'Construction Eye and Face PPE | Glasses, Goggles, Shields',
    seoDescription:
      'Choose construction eye and face protection by task: safety glasses, goggles, face shields, welding eye protection, dust, splash, grinding, and side protection.',
    seoKeywords:
      'eye and face protection construction, construction eye and face PPE, construction safety glasses, construction goggles, face shield construction, welding eye protection construction, eye PPE for construction sites, construction eye protection requirements, safety glasses vs goggles construction',
    heroFallback:
      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1600&q=80',
    sectionImages: {
      'What OSHA Requires for Construction Eye and Face Protection': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'Construction eye and face PPE selection starts with matching the protector to the actual task hazard, fit, and surrounding equipment.',
      },
      'The Main Eye and Face Hazards on Construction Sites': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'Flying chips, dust, splash, sparks, and face-level debris often overlap on construction sites, which is why one default eyewear choice is rarely enough.',
      },
      'Safety Glasses, Goggles, Face Shields, and Welding Helmets: What Each One Actually Does': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'Safety glasses, goggles, face shields, and welding helmets solve different problems and should not be treated as interchangeable.',
      },
      'What To Choose by Construction Task': {
        url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80',
        caption:
          'A better construction eye PPE program starts by matching the protector to the task rather than forcing one product across the whole site.',
      },
      'Face Shield Use: The Point Many Sites Get Wrong': {
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
        caption:
          'A face shield can add important coverage, but it often belongs over primary eye protection rather than replacing it.',
      },
      'Common Buying Mistakes in Construction Eye and Face Protection': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'Most eye and face PPE failures come from oversimplified buying decisions, fit problems, and using the wrong device category for the task.',
      },
    },
  },
  {
    slug: 'bulk-construction-ppe-procurement',
    markdownPath: join(process.cwd(), 'bulk-construction-ppe-procurement.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.bulk-construction-ppe-procurement.generated.json',
    ),
    title: 'How to Buy Bulk Construction PPE for a New Crew',
    excerpt:
      'A practical guide for buying bulk construction PPE for a new crew, comparing contractor PPE suppliers, building RFQ fields, planning sizes, and setting replacement stock.',
    seoTitle:
      'Contractor PPE Supplier Bulk Guide | RFQ & Crew Kits',
    seoDescription:
      'Compare contractor PPE supplier bulk options for a new crew: RFQ fields, size plans, standards, replacement stock, packaging, and trade kit needs.',
    seoKeywords:
      'buy construction PPE in bulk, bulk construction PPE procurement, contractor PPE supplier bulk, best bulk PPE kit for contractors, bulk safety equipment for new construction crew, construction PPE RFQ, PPE purchasing guide construction, construction PPE ordering checklist, bulk PPE replacement stock, construction PPE size planning',
    heroFallback:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=80',
    sectionImages: {
      'Start With A Site PPE Scope, Not A Product List': {
        url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80',
        caption:
          'Bulk construction PPE procurement starts with the site scope, trade mix, and hazard profile before any product list is finalized.',
      },
      'Build The Baseline Construction PPE Package': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'A baseline PPE package gives every worker a consistent entry layer before task-specific hazards are added.',
      },
      'Add Task-Specific PPE By Trade And Exposure': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'Role-based PPE buying reduces waste while keeping protection matched to the actual construction task.',
      },
      'Verify Standards Before You Compare Prices': {
        url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
        caption:
          'Certification documents, product markings, and test reports should be checked before price comparison starts.',
      },
      'Account For The 2025 Proper-Fit Requirement': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'Bulk orders need real size planning because fit-sensitive PPE has to work for every affected employee.',
      },
      'Compare Suppliers On More Than Unit Price': {
        url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&q=80',
        caption:
          'Supplier reliability, documentation, packaging, sizing, and repeat order support matter as much as unit price.',
      },
      'A Practical Bulk PPE Request-For-Quote Template': {
        url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80',
        caption:
          'A clear RFQ helps suppliers quote the same requirements and reduces costly substitutions later.',
      },
      'Bulk Construction PPE Purchasing Checklist': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'A procurement checklist connects site hazards, standards, sizing, packaging, replacement stock, and issue control.',
      },
    },
  },
  {
    slug: 'contractor-ppe-kit-checklist',
    markdownPath: join(process.cwd(), 'contractor-ppe-kit-checklist.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.contractor-ppe-kit-checklist.generated.json',
    ),
    title: 'Best Bulk PPE Kit for Contractors: Checklist for Bulk Orders',
    excerpt:
      'Build bulk PPE kits for contractors by trade, size, standard, packaging, replacement stock, and supplier RFQ checks.',
    seoTitle:
      'Best Bulk PPE Kit for Contractors | Checklist & RFQ',
    seoDescription:
      'Build bulk PPE kits for contractors by trade, size, standard, packaging, and replacement stock. Includes baseline kit, add-on modules, and supplier RFQ checks.',
    seoKeywords:
      'best bulk PPE kit for contractors, contractor PPE kit, bulk PPE kit for contractors, contractor PPE supplier bulk, construction PPE kit checklist, industrial PPE kits construction procurement, contractor safety kit, PPE kit checklist, site issue PPE kits',
    heroFallback:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=80',
    sectionImages: {
      'Quick Contractor PPE Kit Checklist': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'A contractor PPE kit should start with a clear baseline and then add trade-specific protection by task.',
      },
      'What Is a Contractor PPE Kit?': {
        url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80',
        caption:
          'A PPE kit turns scattered item purchasing into a repeatable issue package for contractors and crews.',
      },
      'Baseline Construction Contractor PPE Kit': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'Baseline kits usually cover head, eye, visibility, hand, and foot protection before task modules are added.',
      },
      'Trade Add-On Modules': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'Trade modules keep contractor PPE kits specific without forcing every worker into the same oversized package.',
      },
      'Sizing and Proper Fit in Bulk PPE Kits': {
        url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&q=80',
        caption:
          'Bulk PPE kits need real size planning because proper fit is now an active construction PPE requirement.',
      },
      'Standards and Documentation to Request': {
        url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
        caption:
          'A contractor PPE kit quote should identify the standard or approval basis for each item.',
      },
      'Packaging, Labeling, and Site Issue Control': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'Clear kit packaging and replacement packs reduce field issuing errors on contractor jobsites.',
      },
      'Contractor PPE Kit RFQ Template': {
        url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80',
        caption:
          'A structured RFQ helps suppliers quote the same kit requirements and reduces substitution risk.',
      },
    },
  },
  {
    slug: 'construction-hearing-protection',
    markdownPath: join(process.cwd(), 'construction-hearing-protection.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.construction-hearing-protection.generated.json',
    ),
    title: 'Hearing Protection for Construction Workers: How to Choose the Right PPE',
    excerpt:
      'A practical guide to choosing construction hearing protection by task, OSHA noise rules, NRR/SNR, fit, comfort, compatibility, communication needs, and bulk purchasing.',
    seoTitle:
      'Hearing Protection for Construction Workers: Earplugs, Earmuffs, NRR and SNR',
    seoDescription:
      'Learn how to choose hearing protection for construction workers by task, noise level, OSHA requirements, NRR/SNR rating, fit, compatibility, communication needs, and bulk purchasing.',
    seoKeywords:
      'hearing protection construction, construction ear protection, earplugs for construction workers, earmuffs construction PPE, NRR hearing protection construction, construction noise PPE, OSHA hearing protection construction, construction hearing conservation',
    heroFallback:
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1600&q=80',
    sectionImages: {
      'What OSHA Requires For Construction Noise And Hearing Protection': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'Construction noise compliance starts with knowing the applicable OSHA construction noise table and where hearing protection must be used.',
      },
      'Common Construction Noise Sources': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'Construction noise exposure changes by tool, distance, duration, enclosure, and crew movement across the site.',
      },
      'Earplugs, Earmuffs, Canal Caps, And Communication Headsets': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'Earplugs, earmuffs, canal caps, and communication headsets solve different noise and jobsite communication problems.',
      },
      'How To Choose The Right NRR Or SNR': {
        url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
        caption:
          'Hearing protector ratings only help when they are matched to real exposure, fit, comfort, and communication needs.',
      },
      'Fit Matters More Than The Package Rating': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'Correct fit often determines whether construction hearing protection performs anywhere near its package rating.',
      },
      'Compatibility With Other Construction PPE': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'Hearing protection has to work with hard hats, safety glasses, respirators, face shields, and other site PPE.',
      },
      'Hearing Protection By Construction Task': {
        url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80',
        caption:
          'Task-based selection helps crews use hearing protection that fits the actual noise pattern and surrounding PPE.',
      },
      'Bulk Purchasing And Replacement Planning': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'Bulk hearing protection buying should account for disposable use, reusable assignment, earmuff cushions, and replacement stock.',
      },
    },
  },
  {
    slug: 'construction-respiratory-protection',
    markdownPath: join(process.cwd(), 'construction-respiratory-protection.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.construction-respiratory-protection.generated.json',
    ),
    title: 'Construction Dust Respirator Guide: N95 vs P100 vs Half-Face',
    excerpt:
      'Compare N95, P100 and half-face respirators for construction dust, silica, concrete dust, demolition, grinding, welding fumes, fit testing, and bulk RFQs.',
    seoTitle:
      'Construction Dust Respirator | N95 vs P100 Guide',
    seoDescription:
      'Compare N95, P100 and half-face respirators for construction dust, silica, concrete dust, demolition, grinding, welding fumes, fit testing, and bulk RFQs.',
    seoKeywords:
      'construction dust respirator, respirator for concrete dust, silica dust respirator construction, N95 construction dust, P100 respirator construction, half face respirator construction, respiratory protection construction, construction respiratory PPE',
    heroFallback:
      'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1600&q=80',
    sectionImages: {
      'What OSHA Requires For Construction Respirators': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'Construction respiratory protection becomes a program decision when respirators are required by OSHA or by the employer.',
      },
      'The Main Airborne Hazards On Construction Sites': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'Construction airborne hazards can include silica dust, general dust, welding fumes, vapors, asbestos, lead, and demolition debris.',
      },
      'N95, P100, Half-Face, Full-Face, And PAPR: What Each One Does': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'Respirator type, filter class, facepiece design, and powered airflow all solve different construction exposure problems.',
      },
      'OSHA Silica Table 1 And Respirator Selection': {
        url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
        caption:
          'OSHA silica Table 1 connects task, control method, duration, and when respiratory protection is required.',
      },
      'Respirator Selection By Construction Task': {
        url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80',
        caption:
          'Task-based respirator selection helps avoid treating every dust, fume, and vapor exposure as the same hazard.',
      },
      'Fit Testing, Medical Evaluation, And Training': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'Required respirator use typically brings medical evaluation, fit testing, training, and written program procedures.',
      },
      'Compatibility With Other Construction PPE': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'Respirators must work with eye protection, hard hats, face shields, hearing protection, gloves, and fall protection.',
      },
      'Filter And Cartridge Replacement Planning': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'Respirator purchasing has to include filter, cartridge, cleaning, storage, fit-test, and replacement planning.',
      },
    },
  },
  {
    slug: 'type-1-vs-type-2-hard-hats',
    markdownPath: join(process.cwd(), 'type-1-vs-type-2-hard-hats.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.type-1-vs-type-2-hard-hats.generated.json',
    ),
    title:
      'Type 1 vs Type 2 Hard Hats: Class G, E, C Explained for Construction Buyers',
    excerpt:
      'Compare Type 1 vs Type 2 hard hats and Class G, Class E, and Class C ratings before adding construction head protection to a bulk PPE RFQ.',
    seoTitle:
      'Type 1 vs Type 2 Hard Hats | Class G, E, C Explained',
    seoDescription:
      'Compare Type 1 vs Type 2 hard hats and Class G, Class E, Class C ratings for construction buyers. Learn which hard hat spec belongs in a bulk RFQ.',
    seoKeywords:
      'type 1 vs type 2 hard hat, Type I vs Type II hard hat, Class G hard hat, Class E hard hat, Class C hard hat, Type 1 Class C hard hat, Type 1 Class G hard hat, hard hat classes, construction hard hat buyer guide, ANSI Z89.1 hard hat',
    heroFallback:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80',
    sectionImages: {
      'Quick Answer: Type 1 vs Type 2 Hard Hats': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'Type 1 and Type 2 hard hats solve different impact exposure problems, so buyers should specify the required type before choosing color or price.',
      },
      'Type 1 And Type 2 Are Impact Ratings, Not Electrical Ratings': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'A clear head protection RFQ separates impact type from electrical class.',
      },
      'What Type 1 Hard Hats Mean': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'Type 1 hard hats focus mainly on top impact from falling or flying objects.',
      },
      'What Type 2 Hard Hats Mean': {
        url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80',
        caption:
          'Type 2 head protection adds lateral impact coverage for higher-movement and congested construction tasks.',
      },
      'Class G, Class E, And Class C Explained': {
        url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
        caption:
          'Hard hat class selection should follow electrical exposure, not shell color or worker preference.',
      },
      'Common Combinations Buyers Ask About': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'Common hard hat combinations include Type 1 Class G, Type 1 Class C, Type 2 Class E, and Type 2 Class C.',
      },
      'Which Hard Hat Should Contractors Buy In Bulk?': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'Contractor head protection orders work best when quantities are separated by role, task, and electrical exposure.',
      },
      'How To Write A Better Hard Hat RFQ': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'A strong hard hat RFQ includes type, class, shell style, retention, accessory compatibility, replacement parts, and documentation.',
      },
      'Field Selection Checklist': {
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
        caption:
          'Field trials help confirm fit, retention, compatibility, and worker acceptance before a bulk hard hat order.',
      },
    },
  },
  {
    slug: 'construction-hard-hat-types',
    markdownPath: join(process.cwd(), 'construction-hard-hat-types.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.construction-hard-hat-types.generated.json',
    ),
    title: 'Construction Hard Hat Types: Class G, E, C and Helmet Selection',
    excerpt:
      'Choose construction hard hats by Class G/E/C, helmet style, impact risk, electrical exposure, fit, accessories, inspection, and bulk RFQ needs.',
    seoTitle:
      'Construction Hard Hat Types | Class G, E, C Guide',
    seoDescription:
      'Choose construction hard hats by Class G/E/C, helmet style, impact risk, electrical exposure, fit, accessories, inspection, and bulk RFQ needs.',
    seoKeywords:
      'construction hard hat types, types of hard hats construction, hard hat classes, Class G hard hat, Class E hard hat, Class C hard hat, ANSI Z89.1 hard hat, construction helmet selection, hard hat bulk buying, construction head protection',
    heroFallback:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80',
    sectionImages: {
      'Why Hard Hat Type Selection Matters': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'Hard hat selection starts with the actual construction head hazards, not with one default shell style.',
      },
      'What OSHA Requires For Construction Head Protection': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'OSHA construction head protection requirements connect impact, flying-object, and electrical hazards to the selected helmet.',
      },
      'Hard Hat Types: Type I Vs Type II': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'Type I focuses on top impact, while Type II adds lateral impact protection for more complex construction tasks.',
      },
      'Hard Hat Electrical Classes: Class G, E, And C': {
        url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
        caption:
          'Class G, Class E, and Class C hard hats solve different electrical exposure problems and should not be treated as interchangeable.',
      },
      'Vented, Non-Vented, Full-Brim, Cap-Style, And Climbing-Style Helmets': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'Shell style affects comfort, retention, accessory fit, electrical class, and worker acceptance on construction sites.',
      },
      'How To Choose Hard Hats By Construction Task': {
        url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80',
        caption:
          'Different construction tasks call for different head protection priorities, from general access to electrical and scaffold work.',
      },
      'Compatibility With Other Construction PPE': {
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
        caption:
          'Hard hats must work with eye protection, hearing protection, respirators, face shields, lights, and fall protection gear.',
      },
      'Fit, Inspection, Replacement, And Bulk Purchasing': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'A strong hard hat program includes fit, daily inspection, shell replacement, spare suspensions, and bulk inventory planning.',
      },
    },
  },
  {
    slug: 'high-visibility-clothing-construction',
    markdownPath: join(process.cwd(), 'high-visibility-clothing-construction.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.high-visibility-clothing-construction.generated.json',
    ),
    title: 'Class 2 vs Class 3 High-Visibility Clothing for Construction',
    excerpt:
      'A practical guide to the Class 2 high visibility outermost-layer rule for trailer yards, work zones, equipment routes, Class 2 vs Class 3 selection, and construction RFQs.',
    seoTitle:
      'Class 2 High Visibility Outer Layer Rule | Construction',
    seoDescription:
      'Class 2 high visibility clothing must stay visible as the outermost layer in trailer yards, work zones, and equipment routes. Compare Class 2 vs Class 3.',
    seoKeywords:
      'class 2 high visibility clothing must be the outermost layer, Class 2 hi-vis outer layer rule, high visibility clothing construction, hi vis construction clothing, construction safety vest requirements, trailer yard hi-vis clothing, Class 2 vs Class 3 hi vis, ANSI 107 construction, EN ISO 20471 construction, reflective workwear construction, high visibility PPE',
    heroFallback:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80',
    sectionImages: {
      'Why High-Visibility Clothing Matters On Construction Sites': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'High-visibility clothing helps construction workers stand out around vehicles, equipment, low light, and busy jobsite backgrounds.',
      },
      'What OSHA And ANSI Require For Construction Hi-Vis': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'Construction hi-vis buying should connect OSHA traffic exposure, ANSI/ISEA 107 class, and the actual work zone.',
      },
      'ANSI/ISEA 107 Types And Classes Explained': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'ANSI/ISEA 107 type and performance class determine whether a garment fits the construction visibility exposure.',
      },
      'EN ISO 20471 Classes For International Projects': {
        url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
        caption:
          'International construction projects often need EN ISO 20471 documentation in addition to ANSI-style performance expectations.',
      },
      'Class 1, Class 2, Or Class 3: Which One Fits The Job?': {
        url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80',
        caption:
          'Hi-vis class selection should follow the construction task, traffic exposure, light level, and equipment movement pattern.',
      },
      'Color, Reflective Tape, And Day/Night Visibility': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'Fluorescent background material supports daytime visibility while retroreflective tape supports low-light recognition.',
      },
      'High-Visibility Clothing By Construction Task': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'Different construction roles need different hi-vis garment systems, from visitor vests to Class 3 roadwork clothing.',
      },
      'Compatibility With Other Construction PPE': {
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
        caption:
          'High-visibility clothing must remain visible when workers wear hard hats, harnesses, tool belts, respirators, and rainwear.',
      },
      'Weather, Flame, And Wash Durability Considerations': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'Rain, cold, heat, flame exposure, washing, dirt, and wear all change how long high-visibility clothing remains effective.',
      },
      'Bulk Buying Checklist For Construction Hi-Vis': {
        url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
        caption:
          'Bulk hi-vis procurement should specify class, standard, size range, garment type, climate needs, documentation, and replacement stock.',
      },
    },
  },
  {
    slug: 'construction-safety-helmet-vs-hard-hat',
    markdownPath: join(process.cwd(), 'construction-safety-helmet-vs-hard-hat.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.construction-safety-helmet-vs-hard-hat.generated.json',
    ),
    title: 'Safety Helmet vs Hard Hat for Construction: When Buyers Should Upgrade',
    excerpt:
      'A buyer-focused comparison of construction safety helmets and traditional hard hats: when to upgrade for Type II side impact, chin straps, Class E/G/C ratings, accessory compatibility, and bulk PPE RFQs.',
    seoTitle:
      'Safety Helmet vs Hard Hat for Construction | Buyer Guide',
    seoDescription:
      'Compare safety helmets vs hard hats for construction buyers. Learn when to upgrade for Type II side impact, chin straps, Class E/G/C, height work, and bulk PPE RFQs.',
    seoKeywords:
      'safety helmet vs hard hat construction, safety helmet vs hard hat, construction safety helmet, hard hat vs safety helmet, when to upgrade hard hats, Type II safety helmet construction, chin strap hard hat construction, construction helmet vs hard hat, safety helmet for scaffolding, hard hat upgrade, construction helmet upgrade',
    heroFallback:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80',
    sectionImages: {
      'Quick Answer: Safety Helmet Or Hard Hat?': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'The right construction head protection depends on impact direction, retention needs, electrical exposure, and task movement.',
      },
      'What OSHA Actually Requires': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'OSHA construction head protection decisions should start with the actual head injury hazard and recognized consensus standards.',
      },
      'Safety Helmet vs Hard Hat: Practical Differences': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'Hard hats and safety helmets differ by shell style, retention, side-impact options, and accessory integration.',
      },
      'Type I vs Type II Matters More Than The Name': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'Type I and Type II impact protection matter more than whether a product is marketed as a hard hat or safety helmet.',
      },
      'Chin Straps: When Retention Becomes A Safety Feature': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'Chin straps help head protection stay in place during climbing, height work, wind, leaning, and fall exposure.',
      },
      'Electrical Class Still Matters': {
        url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
        caption:
          'Safety helmet upgrades still have to account for Class G, Class E, or Class C electrical protection.',
      },
      'Which Construction Tasks Should Consider Safety Helmets?': {
        url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80',
        caption:
          'Scaffolding, steel work, bridge work, demolition, roofing, and congested structures often make retention and side impact more important.',
      },
      'Compatibility With The Rest Of The PPE System': {
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
        caption:
          'Head protection must work with eyewear, hearing protection, respirators, face shields, lamps, fall protection, and weather layers.',
      },
      'Buying Specification: Better Than "Safety Helmet"': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'A strong helmet RFQ specifies type, class, retention, accessories, fit range, replacement parts, labels, and documentation.',
      },
    },
  },
  {
    slug: 'heavy-equipment-operator-ppe-checklist',
    markdownPath: join(process.cwd(), 'heavy-equipment-operator-ppe-checklist.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.heavy-equipment-operator-ppe-checklist.generated.json',
    ),
    title:
      'Heavy Equipment Operator PPE Checklist for Construction Sites',
    excerpt:
      'A field-ready PPE checklist for excavator, loader, dozer, roller, crane support, dump truck, and compact-equipment operators covering hi-vis, hearing protection, boots, eye protection, gloves, helmets, respirators, roadwork, demolition, and cab kits.',
    seoTitle:
      'Heavy Equipment Operator PPE Checklist | Construction Machinery Safety Gear',
    seoDescription:
      'Use this heavy equipment operator PPE checklist for construction sites. Covers excavator, loader, dozer, roller, and dump truck operator PPE including hi-vis, hearing protection, safety boots, eye protection, gloves, helmets, respirators, roadwork, and demolition.',
    seoKeywords:
      'heavy equipment operator PPE checklist, construction equipment operator PPE, excavator operator PPE, loader operator PPE, dozer operator PPE, road construction operator PPE, demolition equipment operator PPE, heavy machinery safety gear, operator PPE kit',
    heroFallback:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80',
    sectionImages: {
      'Quick Heavy Equipment Operator PPE Checklist': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'A practical operator PPE checklist should cover the cab, the machine access points, the walk-around inspection, and the active work zone around the equipment.',
      },
      'Why Equipment Operators Need A Separate PPE Checklist': {
        url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80',
        caption:
          'Heavy equipment operators move between protected cabs and high-risk ground zones, so their PPE routine needs its own checklist.',
      },
      'In-Cab PPE And Controls Checklist': {
        url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80',
        caption:
          'The cab is part of the safety system, but operators still need clean, reachable PPE for inspections, communication, and emergency exit.',
      },
      'Outside-Cab PPE Checklist': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'When operators leave the cab, hi-vis clothing, head protection, eye protection, gloves, boots, and hearing protection become immediate field requirements.',
      },
      'Mounting And Dismounting PPE Checklist': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'Mounting and dismounting expose operators to slips, worn steps, mud, oil, poor lighting, and uneven ground.',
      },
      'Walk-Around Inspection PPE Checklist': {
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
        caption:
          'Daily walk-around inspections require eye, hand, foot, head, and visibility protection because operators work close to attachments, hydraulic lines, and damaged surfaces.',
      },
      'Hearing Protection Checklist For Equipment Operators': {
        url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&q=80',
        caption:
          'Equipment noise should be handled with exposure assessment, feasible controls, and hearing protection that remains compatible with communication.',
      },
      'High-Visibility Checklist Around Heavy Equipment': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'High-visibility clothing helps operators remain visible when they become pedestrians around haul roads, blind spots, traffic, and moving machinery.',
      },
      'Eye And Face Protection Checklist': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'Operators need eyewear that works for dust, wind, flying particles, walk-around checks, and open-cab conditions.',
      },
      'Footwear Checklist For Operators': {
        url: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=1200&q=80',
        caption:
          'Operator footwear must work on machine steps, pedals, gravel, mud, asphalt, bridge decks, and oily service areas.',
      },
      'Task-Based Operator PPE Matrix': {
        url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80',
        caption:
          'A task-based matrix helps supervisors adjust operator PPE when the work moves from cab operation to roadwork, demolition, inspection, or night work.',
      },
      'Procurement Checklist For Operator PPE Kits': {
        url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
        caption:
          'Operator PPE procurement should package baseline cab kits, task modules, sizing, replacement stock, and documentation together.',
      },
    },
  },
  {
    slug: 'demolition-concrete-cutting-ppe-checklist',
    markdownPath: join(process.cwd(), 'demolition-concrete-cutting-ppe-checklist.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.demolition-concrete-cutting-ppe-checklist.generated.json',
    ),
    title:
      'Demolition and Concrete Cutting PPE Checklist: What Crews Need Before Work Starts',
    excerpt:
      'A field-ready PPE checklist for demolition and concrete cutting crews covering silica dust, respirators, eye and face protection, hearing PPE, gloves, footwear, hi-vis, head protection, fall hazards, and procurement checks.',
    seoTitle:
      'Demolition and Concrete Cutting PPE Checklist | Silica, Noise and Impact PPE',
    seoDescription:
      'Use this demolition and concrete cutting PPE checklist before work starts. Covers silica dust respirators, eye/face protection, hearing PPE, gloves, boots, helmets, hi-vis, fall hazards, and bulk procurement.',
    seoKeywords:
      'demolition PPE checklist, concrete cutting PPE checklist, demolition safety checklist, concrete saw PPE, silica dust PPE checklist, jackhammer PPE, demolition worker PPE, concrete cutting safety gear',
    heroFallback:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80',
    sectionImages: {
      'Quick PPE Checklist Before Demolition Starts': {
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80',
        caption:
          'A demolition PPE checklist should confirm silica controls, impact protection, hearing protection, gloves, footwear, visibility, and fall exposure before work starts.',
      },
      'Why Demolition PPE Needs Its Own Checklist': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'Demolition changes the jobsite while workers are inside it, so the PPE routine has to adjust by task and exposure.',
      },
      'Section 1: Pre-Demolition Hazard Review': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'PPE selection should follow a demolition hazard review, structural survey, utility control, and legacy-material check.',
      },
      'Section 2: Respiratory Protection Checklist': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'Concrete cutting and demolition dust require respiratory protection planning around silica controls, fit testing, filters, and replacement stock.',
      },
      'Section 3: Eye and Face Protection Checklist': {
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
        caption:
          'Goggles, safety glasses, and face shields should be selected around flying fragments, dust, slurry, and cutting exposure.',
      },
      'Section 4: Hearing Protection Checklist': {
        url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80',
        caption:
          'Demolition noise from saws, breakers, drills, and equipment has to be planned with hearing protection that fits the rest of the PPE system.',
      },
      'Section 5: Hand Protection Checklist': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'Demolition gloves should be selected by task: cut risk, wet grip, vibration, impact, chemicals, and tool control.',
      },
      'Section 6: Foot Protection Checklist': {
        url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
        caption:
          'Demolition footwear should cover toe impact, puncture hazards, slip risk, metatarsal exposure, wet slurry, and uneven debris.',
      },
      'Section 7: Head Protection, Hi-Vis and Body Protection Checklist': {
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
        caption:
          'Head protection, hi-vis clothing, and protective workwear help crews stay visible and protected as demolition conditions change.',
      },
      'Section 8: Fall Protection and Access Checklist': {
        url: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&q=80',
        caption:
          'Demolition fall protection should be planned around access, edge exposure, anchorage, debris movement, and rescue readiness.',
      },
      'Task-Based Demolition PPE Matrix': {
        url: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&q=80',
        caption:
          'Task-based PPE matrices help supervisors separate concrete cutting, jackhammering, strip-out, debris handling, and elevated demolition.',
      },
      'Procurement Checklist for Demolition PPE': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'Demolition PPE procurement should specify role-based kits, replacement stock, compatibility, documentation, and reorder rules.',
      },
      'Common Demolition PPE Mistakes': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'Most demolition PPE mistakes come from weak compatibility checks, missing replacement stock, and using baseline PPE for task-specific hazards.',
      },
    },
  },
  {
    slug: 'trenching-excavation-ppe-checklist',
    markdownPath: join(process.cwd(), 'trenching-excavation-ppe-checklist.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.trenching-excavation-ppe-checklist.generated.json',
    ),
    title:
      'Trenching and Excavation PPE Checklist for Construction Crews',
    excerpt:
      'A field-ready PPE checklist for trenching and excavation crews covering helmets, hi-vis, boots, gloves, eye protection, respirators, hearing PPE, fall and edge exposure, equipment zones, and procurement kits.',
    seoTitle:
      'Trenching and Excavation PPE Checklist | Construction Safety Gear',
    seoDescription:
      'Use this trenching and excavation PPE checklist for construction crews: helmets, hi-vis, boots, gloves, eye protection, respirators, fall protection, and emergency planning.',
    seoKeywords:
      'trenching PPE checklist, excavation PPE checklist, trench safety PPE, PPE for trenching and excavation, excavation safety gear, OSHA trenching PPE, construction excavation PPE, trench worker PPE kit',
    heroFallback:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80',
    sectionImages: {
      'Quick Trenching and Excavation PPE Checklist': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'A trenching PPE checklist should cover baseline site entry, equipment zones, ground conditions, access, and rescue readiness.',
      },
      'OSHA and NIOSH Context for Trenching Work': {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80',
        caption:
          'Trenching PPE planning should sit inside a broader excavation safety program that includes protective systems and competent-person review.',
      },
      'Head Protection for Trenching and Excavation': {
        url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80',
        caption:
          'Head protection has to account for equipment movement, spoil piles, pipe handling, ladders, shoring, and edge work.',
      },
      'High-Visibility Clothing Around Excavators and Traffic': {
        url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80',
        caption:
          'High-visibility clothing helps trench crews remain visible around excavators, loaders, dump trucks, spotters, and traffic.',
      },
      'Footwear for Mud, Water, Edges, and Puncture Hazards': {
        url: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=1200&q=80',
        caption:
          'Excavation footwear needs traction, toe protection, puncture resistance, and wet-ground performance.',
      },
      'Respiratory Protection and Atmospheric Hazards': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'Dust, fumes, utility work, and confined or low-lying areas can make respiratory and atmospheric review part of trench planning.',
      },
      'Task-Based Trenching PPE Matrix': {
        url: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&q=80',
        caption:
          'A task-based PPE matrix helps supervisors separate excavation setup, pipe work, shoring, equipment spotting, and backfill.',
      },
      'Procurement Checklist for Trenching PPE Kits': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'Trenching PPE procurement should package baseline kits, mud and utility modules, replacement stock, and documentation together.',
      },
    },
  },
  {
    slug: 'scaffolding-ppe-checklist',
    markdownPath: join(process.cwd(), 'scaffolding-ppe-checklist.md'),
    generatedImagesPath: join(
      __dirname,
      'blog-images.scaffolding-ppe-checklist.generated.json',
    ),
    title: 'Scaffolding PPE Checklist for Construction Crews',
    excerpt:
      'A practical scaffolding PPE checklist for scaffold erectors, users, inspectors, and ground support covering harnesses, helmets, anti-slip boots, gloves, eye protection, hi-vis, and tool lanyards.',
    seoTitle:
      'Scaffolding PPE Checklist | Harness, Helmet, Boots and Tool Tethering',
    seoDescription:
      'Use this scaffolding PPE checklist for erectors, users, inspectors, and ground support: harnesses, helmets, boots, gloves, eye protection, hi-vis, and tool lanyards.',
    seoKeywords:
      'scaffolding PPE checklist, scaffolding PPE, PPE for scaffolding, scaffold PPE kit, scaffold safety harness, scaffold helmet chin strap, anti slip scaffold boots, tool lanyard scaffolding',
    heroFallback:
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1600&q=80',
    sectionImages: {
      'Quick Scaffolding PPE Checklist': {
        url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
        caption:
          'A scaffolding PPE checklist should cover baseline site entry plus fall exposure, climbing, retention, grip, and dropped-object control.',
      },
      'PPE by Scaffolding Role': {
        url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80',
        caption:
          'Scaffold erectors, users, inspectors, and ground crews do not always need the same PPE package.',
      },
      'Fall Protection and Harness Checks': {
        url: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&q=80',
        caption:
          'Fall protection for scaffold work depends on the scaffold type, erection phase, access route, anchorage, and rescue plan.',
      },
      'Head Protection and Chin Strap Retention': {
        url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80',
        caption:
          'Head protection for scaffolding should account for overhead work, dropped objects, climbing, wind, and retention.',
      },
      'Footwear for Ladders, Platforms, and Wet Planks': {
        url: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=1200&q=80',
        caption:
          'Scaffold footwear needs reliable grip on ladders, platforms, planks, mud, wet decks, and uneven access points.',
      },
      'Gloves for Scaffold Tubes, Couplers, and Tools': {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
        caption:
          'Scaffolding gloves should balance grip, abrasion resistance, cut resistance, impact protection, and tool dexterity.',
      },
      'Tool Tethering and Dropped-Object Prevention': {
        url: 'https://images.unsplash.com/photo-1581092160607-ee22731d8db8?w=1200&q=80',
        caption:
          'Tool tethering helps reduce dropped-object risk when scaffold work happens above other workers or public areas.',
      },
      'Scaffolding PPE Kit Examples': {
        url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
        caption:
          'Scaffolding PPE kits should separate erector, user, inspector, and replacement modules instead of forcing one generic kit.',
      },
    },
  },
]

function loadGeneratedImages(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {}

  try {
    const raw = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).filter(
          ([, value]) => typeof value === 'string' && value.length > 0,
        ) as [string, string][],
      )
    }
  } catch (err) {
    console.warn(`Could not parse generated blog image file: ${filePath}`, err)
  }

  return {}
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

type EditorBlock =
  | { type: 'header'; data: { text: string; level: 1 | 2 | 3 | 4 } }
  | { type: 'paragraph'; data: { text: string } }
  | { type: 'list'; data: { style: 'unordered' | 'ordered'; items: string[] } }
  | { type: 'delimiter'; data: Record<string, never> }
  | {
      type: 'image'
      data: {
        file: { url: string }
        caption: string
        withBorder: boolean
        stretched: boolean
        withBackground: boolean
      }
    }
  | { type: 'table'; data: { withHeadings: boolean; content: string[][] } }
  | { type: 'quote'; data: { text: string; caption: string; alignment: 'left' } }

type BlockWithId = EditorBlock & { id: string }

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function inlineMarkdownToHtml(raw: string): string {
  let text = escapeHtml(raw)

  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label: string, url: string) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  )

  text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')

  return text
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 12)
}

function parseTableRow(line: string): string[] {
  const trimmed = line.replace(/^\|/, '').replace(/\|$/, '').trim()
  return trimmed.split('|').map((cell) => cell.trim())
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function parseMarkdown(md: string): BlockWithId[] {
  const lines = md.split(/\r?\n/)
  const blocks: BlockWithId[] = []

  let startIdx = lines.findIndex((line) => /^#\s+/.test(line))
  if (startIdx === -1) startIdx = 0

  let listBuffer: { style: 'unordered' | 'ordered'; items: string[] } | null = null
  let paragraphBuffer: string[] = []
  let quoteBuffer: string[] = []

  const flushList = () => {
    if (listBuffer && listBuffer.items.length > 0) {
      blocks.push({
        id: makeId(),
        type: 'list',
        data: {
          style: listBuffer.style,
          items: listBuffer.items.map((item) => inlineMarkdownToHtml(item)),
        },
      })
    }
    listBuffer = null
  }

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const text = inlineMarkdownToHtml(paragraphBuffer.join(' ').trim())
      if (text) {
        blocks.push({
          id: makeId(),
          type: 'paragraph',
          data: { text },
        })
      }
      paragraphBuffer = []
    }
  }

  const flushQuote = () => {
    if (quoteBuffer.length > 0) {
      const text = inlineMarkdownToHtml(quoteBuffer.join(' ').trim())
      if (text) {
        blocks.push({
          id: makeId(),
          type: 'quote',
          data: {
            text,
            caption: '',
            alignment: 'left',
          },
        })
      }
      quoteBuffer = []
    }
  }

  const flushAll = () => {
    flushList()
    flushParagraph()
    flushQuote()
  }

  for (let i = startIdx; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()

    if (line === '') {
      flushAll()
      continue
    }

    if (/^-{3,}$/.test(line)) {
      flushAll()
      blocks.push({ id: makeId(), type: 'delimiter', data: {} })
      continue
    }

    const nextLine = (lines[i + 1] || '').trim()
    if (
      line.startsWith('|') &&
      /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(nextLine)
    ) {
      flushAll()
      const tableRows: string[][] = []
      tableRows.push(parseTableRow(line))
      i += 2
      while (i < lines.length) {
        const rowLine = lines[i].trim()
        if (!rowLine.startsWith('|')) break
        tableRows.push(parseTableRow(rowLine))
        i++
      }
      i--
      if (tableRows.length > 0) {
        blocks.push({
          id: makeId(),
          type: 'table',
          data: {
            withHeadings: true,
            content: tableRows.map((row) =>
              row.map((cell) => inlineMarkdownToHtml(cell)),
            ),
          },
        })
      }
      continue
    }

    const headerMatch = /^(#{1,4})\s+(.+)$/.exec(line)
    if (headerMatch) {
      flushAll()
      const level = headerMatch[1].length as 1 | 2 | 3 | 4
      const text = inlineMarkdownToHtml(headerMatch[2].trim())
      blocks.push({ id: makeId(), type: 'header', data: { text, level } })
      continue
    }

    const quoteMatch = /^>\s?(.*)$/.exec(line)
    if (quoteMatch) {
      flushList()
      flushParagraph()
      quoteBuffer.push(quoteMatch[1].trim())
      continue
    }

    const unorderedListMatch = /^[-*]\s+(.+)$/.exec(line)
    if (unorderedListMatch) {
      flushParagraph()
      flushQuote()
      if (!listBuffer || listBuffer.style !== 'unordered') {
        flushList()
        listBuffer = { style: 'unordered', items: [] }
      }
      listBuffer.items.push(unorderedListMatch[1].trim())
      continue
    }

    const orderedListMatch = /^\d+\.\s+(.+)$/.exec(line)
    if (orderedListMatch) {
      flushParagraph()
      flushQuote()
      if (!listBuffer || listBuffer.style !== 'ordered') {
        flushList()
        listBuffer = { style: 'ordered', items: [] }
      }
      listBuffer.items.push(orderedListMatch[1].trim())
      continue
    }

    flushList()
    flushQuote()
    paragraphBuffer.push(line)
  }

  flushAll()
  return blocks
}

function injectSectionImages(
  blocks: BlockWithId[],
  sectionImages?: SectionImageMap,
  generatedImages?: Record<string, string>,
): BlockWithId[] {
  if (!sectionImages || Object.keys(sectionImages).length === 0) {
    return blocks
  }

  const effectiveSectionImages: SectionImageMap = Object.fromEntries(
    Object.entries(sectionImages).map(([title, image]) => {
      const override = generatedImages?.[slugifyHeading(title)]
      return [
        title,
        {
          ...image,
          url: override || image.url,
        },
      ]
    }),
  )

  const output: BlockWithId[] = []
  let injectedForH2: string | null = null
  let waitingParagraphAfterH2: string | null = null

  for (const block of blocks) {
    output.push(block)

    if (block.type === 'header' && block.data.level === 2) {
      const plainTitle = stripHtml(block.data.text).trim()
      if (effectiveSectionImages[plainTitle] && injectedForH2 !== plainTitle) {
        waitingParagraphAfterH2 = plainTitle
      } else {
        waitingParagraphAfterH2 = null
      }
      continue
    }

    if (waitingParagraphAfterH2 && block.type === 'paragraph') {
      const meta = effectiveSectionImages[waitingParagraphAfterH2]
      if (meta) {
        output.push({
          id: makeId(),
          type: 'image',
          data: {
            file: { url: meta.url },
            caption: meta.caption,
            withBorder: true,
            stretched: false,
            withBackground: false,
          },
        })
        injectedForH2 = waitingParagraphAfterH2
      }
      waitingParagraphAfterH2 = null
    }
  }

  return output
}

function buildEditorContent(md: string, config: BlogSeedConfig): { blocks: BlockWithId[] } & {
  time: number
  version: string
} {
  const generatedImages = loadGeneratedImages(config.generatedImagesPath)
  const rawBlocks = parseMarkdown(md)
  const blocksWithImages = injectSectionImages(
    rawBlocks,
    config.sectionImages,
    generatedImages,
  )

  const h1Index = blocksWithImages.findIndex(
    (block) => block.type === 'header' && block.data.level === 1,
  )
  const afterH1 =
    h1Index === -1 ? blocksWithImages : blocksWithImages.slice(h1Index + 1)

  const firstDelimiterIdx = afterH1.findIndex((block) => block.type === 'delimiter')
  const metaBlockIsMeta =
    firstDelimiterIdx !== -1 &&
    afterH1.slice(0, firstDelimiterIdx).every(
      (block) =>
        block.type === 'paragraph' &&
        /Meta Title|Meta Description|Target URL|Target Keywords/i.test(
          (block.data as { text: string }).text,
        ),
    )

  const bodyBlocks = metaBlockIsMeta
    ? afterH1.slice(firstDelimiterIdx + 1)
    : afterH1

  return {
    time: Date.now(),
    version: '2.31.1',
    blocks: bodyBlocks,
  }
}

async function seedPost(config: BlogSeedConfig) {
  const md = await readFile(config.markdownPath, 'utf8')
  const generatedImages = loadGeneratedImages(config.generatedImagesPath)
  const content = buildEditorContent(md, config)
  const coverImage = generatedImages.hero || config.heroFallback

  const post = await prisma.blogPost.upsert({
    where: { slug: config.slug },
    update: {
      title: config.title,
      excerpt: config.excerpt,
      coverImage,
      content,
      seoTitle: config.seoTitle,
      seoDescription: config.seoDescription,
      seoKeywords: config.seoKeywords,
    },
    create: {
      slug: config.slug,
      title: config.title,
      excerpt: config.excerpt,
      coverImage,
      content,
      isPublished: true,
      publishedAt: new Date(),
      seoTitle: config.seoTitle,
      seoDescription: config.seoDescription,
      seoKeywords: config.seoKeywords,
    },
  })

  console.log(`Seeded blog post: ${post.slug} (${content.blocks.length} blocks)`)
}

async function main() {
  const slugArg = process.argv
    .slice(2)
    .find((arg) => arg.startsWith('--slug='))
    ?.slice('--slug='.length)
    .trim()

  const postsToSeed = slugArg
    ? BLOG_POSTS.filter((post) => post.slug === slugArg)
    : BLOG_POSTS

  if (slugArg && postsToSeed.length === 0) {
    throw new Error(`Unknown blog slug: ${slugArg}`)
  }

  for (const post of postsToSeed) {
    await seedPost(post)
  }
}

main()
  .catch((err) => {
    console.error('Blog seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
