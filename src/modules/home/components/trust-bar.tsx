"use client"

import {
  Truck,
  Clock,
  Headphones,
  Palette,
  Globe,
  Factory,
  Users,
  Package,
} from "lucide-react"

// CE 认证徽章
function CEBadge() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <circle cx="40" cy="40" r="38" fill="#003399" stroke="#FFD700" strokeWidth="2" />
      <text x="40" y="52" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" fontFamily="Arial">
        CE
      </text>
      <text x="40" y="68" textAnchor="middle" fill="#FFD700" fontSize="8" fontFamily="Arial">
        CERTIFIED
      </text>
    </svg>
  )
}

// ISO 认证徽章
function ISOBadge() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <rect x="4" y="4" width="72" height="72" rx="8" fill="#1E5631" stroke="#90EE90" strokeWidth="2" />
      <text x="40" y="32" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">
        ISO
      </text>
      <text x="40" y="50" textAnchor="middle" fill="#90EE90" fontSize="12" fontWeight="bold" fontFamily="Arial">
        9001
      </text>
      <text x="40" y="65" textAnchor="middle" fill="white" fontSize="8" fontFamily="Arial">
        CERTIFIED
      </text>
    </svg>
  )
}

// ANSI 认证徽章
function ANSIBadge() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <polygon points="40,4 76,40 40,76 4,40" fill="#B22234" stroke="#FFFFFF" strokeWidth="2" />
      <text x="40" y="38" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="Arial">
        ANSI
      </text>
      <text x="40" y="50" textAnchor="middle" fill="#FFD700" fontSize="8" fontFamily="Arial">
        APPROVED
      </text>
    </svg>
  )
}

// EN 标准徽章
function ENBadge() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <circle cx="40" cy="40" r="38" fill="#4B0082" stroke="#DDA0DD" strokeWidth="2" />
      <text x="40" y="35" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="Arial">
        EN
      </text>
      <text x="40" y="50" textAnchor="middle" fill="#DDA0DD" fontSize="12" fontWeight="bold" fontFamily="Arial">
        388
      </text>
      <text x="40" y="65" textAnchor="middle" fill="white" fontSize="7" fontFamily="Arial">
        STANDARD
      </text>
    </svg>
  )
}

// OEKO-TEX 徽章
function OekoTexBadge() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <ellipse cx="40" cy="40" rx="36" ry="30" fill="#008B8B" stroke="#AFEEEE" strokeWidth="2" />
      <text x="40" y="35" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial">
        OEKO-TEX
      </text>
      <text x="40" y="48" textAnchor="middle" fill="#AFEEEE" fontSize="8" fontFamily="Arial">
        STANDARD 100
      </text>
      <path d="M20 55 Q40 65 60 55" stroke="#AFEEEE" strokeWidth="1" fill="none" />
    </svg>
  )
}

// BSCI 徽章
function BSCIBadge() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <rect x="6" y="12" width="68" height="56" rx="6" fill="#FF6B35" stroke="#FFE4B5" strokeWidth="2" />
      <text x="40" y="38" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="Arial">
        BSCI
      </text>
      <text x="40" y="52" textAnchor="middle" fill="#FFE4B5" fontSize="7" fontFamily="Arial">
        SOCIAL AUDIT
      </text>
      <circle cx="40" cy="62" r="3" fill="#FFE4B5" />
    </svg>
  )
}

// SGS 徽章
function SGSBadge() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <rect x="4" y="4" width="72" height="72" rx="4" fill="#E31937" stroke="#FFFFFF" strokeWidth="2" />
      <text x="40" y="45" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold" fontFamily="Arial">
        SGS
      </text>
      <text x="40" y="62" textAnchor="middle" fill="white" fontSize="8" fontFamily="Arial">
        TESTED
      </text>
    </svg>
  )
}

// TUV 徽章
function TUVBadge() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <circle cx="40" cy="40" r="38" fill="#0066B3" stroke="#FFFFFF" strokeWidth="2" />
      <text x="40" y="38" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="Arial">
        TÜV
      </text>
      <text x="40" y="55" textAnchor="middle" fill="#87CEEB" fontSize="9" fontFamily="Arial">
        CERTIFIED
      </text>
      <path d="M15 65 L65 65" stroke="white" strokeWidth="1" />
    </svg>
  )
}

// 奖杯徽章 - Top Supplier
function TopSupplierAward() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      {/* 外圈 */}
      <circle cx="40" cy="40" r="38" fill="linear-gradient(#FFD700, #FFA500)" stroke="#DAA520" strokeWidth="2" />
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFA500" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="38" fill="url(#goldGrad)" />
      {/* 奖杯 */}
      <path d="M30 25 L50 25 L48 45 L32 45 Z" fill="#8B4513" stroke="#DAA520" strokeWidth="1" />
      <rect x="35" y="45" width="10" height="8" fill="#8B4513" />
      <rect x="30" y="53" width="20" height="4" rx="1" fill="#8B4513" />
      <ellipse cx="40" cy="25" rx="12" ry="4" fill="#DAA520" />
      {/* 文字 */}
      <text x="40" y="72" textAnchor="middle" fill="#8B4513" fontSize="7" fontWeight="bold" fontFamily="Arial">
        TOP SUPPLIER
      </text>
    </svg>
  )
}

// 金牌供应商
function GoldSupplierAward() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <defs>
        <linearGradient id="goldMedal" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFE135" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#DAA520" />
        </linearGradient>
      </defs>
      {/* 缎带 */}
      <path d="M25 10 L35 35 L40 30 L45 35 L55 10" fill="#E31937" />
      {/* 奖牌 */}
      <circle cx="40" cy="50" r="24" fill="url(#goldMedal)" stroke="#B8860B" strokeWidth="2" />
      <circle cx="40" cy="50" r="18" fill="none" stroke="#B8860B" strokeWidth="1" />
      {/* 星星 */}
      <polygon points="40,35 43,44 52,44 45,50 48,59 40,54 32,59 35,50 28,44 37,44" fill="#B8860B" />
      <text x="40" y="75" textAnchor="middle" fill="#8B4513" fontSize="7" fontWeight="bold" fontFamily="Arial">
        GOLD SUPPLIER
      </text>
    </svg>
  )
}

// 品质奖
function QualityAward() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      {/* 盾牌 */}
      <path d="M40 8 L70 18 L70 45 Q70 65 40 75 Q10 65 10 45 L10 18 Z" fill="#1E3A5F" stroke="#4A90D9" strokeWidth="2" />
      <path d="M40 15 L62 23 L62 43 Q62 58 40 67 Q18 58 18 43 L18 23 Z" fill="#2E5A8F" />
      {/* 勾选 */}
      <path d="M28 42 L36 50 L52 32" stroke="#4ADE80" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="40" y="78" textAnchor="middle" fill="#1E3A5F" fontSize="7" fontWeight="bold" fontFamily="Arial">
        QUALITY AWARD
      </text>
    </svg>
  )
}

// 5星评级
function FiveStarAward() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <rect x="4" y="15" width="72" height="50" rx="6" fill="#1a1a2e" stroke="#FFD700" strokeWidth="2" />
      {/* 5颗星 */}
      <g fill="#FFD700">
        <polygon points="16,35 18,41 24,41 19,45 21,51 16,47 11,51 13,45 8,41 14,41" />
        <polygon points="28,35 30,41 36,41 31,45 33,51 28,47 23,51 25,45 20,41 26,41" />
        <polygon points="40,35 42,41 48,41 43,45 45,51 40,47 35,51 37,45 32,41 38,41" />
        <polygon points="52,35 54,41 60,41 55,45 57,51 52,47 47,51 49,45 44,41 50,41" />
        <polygon points="64,35 66,41 72,41 67,45 69,51 64,47 59,51 61,45 56,41 62,41" />
      </g>
      <text x="40" y="60" textAnchor="middle" fill="#FFD700" fontSize="8" fontWeight="bold" fontFamily="Arial">
        5-STAR RATED
      </text>
    </svg>
  )
}

// 行业优选
function IndustryChoiceAward() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <defs>
        <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#9B59B6" />
          <stop offset="100%" stopColor="#6C3483" />
        </linearGradient>
      </defs>
      {/* 六边形 */}
      <polygon points="40,5 70,22 70,58 40,75 10,58 10,22" fill="url(#purpleGrad)" stroke="#D7BDE2" strokeWidth="2" />
      {/* 皇冠 */}
      <path d="M25 45 L30 30 L35 40 L40 28 L45 40 L50 30 L55 45 Z" fill="#FFD700" stroke="#DAA520" strokeWidth="1" />
      <rect x="27" y="45" width="26" height="6" rx="1" fill="#FFD700" stroke="#DAA520" strokeWidth="1" />
      <text x="40" y="65" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="Arial">
        INDUSTRY CHOICE
      </text>
    </svg>
  )
}

// 认证列表
const certifications = [
  { component: CEBadge, name: "CE Mark", tooltip: "European Conformity" },
  { component: ISOBadge, name: "ISO 9001", tooltip: "Quality Management System" },
  { component: ANSIBadge, name: "ANSI", tooltip: "US Safety Standards" },
  { component: ENBadge, name: "EN 388", tooltip: "Protective Gloves Standard" },
  { component: OekoTexBadge, name: "OEKO-TEX", tooltip: "Tested for Harmful Substances" },
  { component: BSCIBadge, name: "BSCI", tooltip: "Business Social Compliance" },
  { component: SGSBadge, name: "SGS", tooltip: "Inspection & Verification" },
  { component: TUVBadge, name: "TÜV", tooltip: "Technical Inspection" },
]

// 奖项列表
const awards = [
  { component: TopSupplierAward, name: "Top 10 Supplier", tooltip: "Global Trade 2024" },
  { component: GoldSupplierAward, name: "Gold Supplier", tooltip: "Alibaba Verified" },
  { component: QualityAward, name: "Quality Award", tooltip: "Excellence in Manufacturing" },
  { component: FiveStarAward, name: "5-Star Rating", tooltip: "Customer Satisfaction" },
  { component: IndustryChoiceAward, name: "Industry Choice", tooltip: "PPE Industry Awards 2024" },
]

// 服务特性
const services = [
  { icon: Truck, title: "Global Logistics", desc: "DDP/FOB/CIF to 50+ countries" },
  { icon: Clock, title: "Fast Production", desc: "2-4 weeks standard lead time" },
  { icon: Headphones, title: "24/7 Support", desc: "Dedicated account manager" },
  { icon: Palette, title: "OEM/ODM", desc: "Custom design & branding" },
]

// 统计数据
const stats = [
  { icon: Factory, value: "15+", label: "Years" },
  { icon: Globe, value: "50+", label: "Countries" },
  { icon: Users, value: "500+", label: "Clients" },
  { icon: Package, value: "10M+", label: "Units/Year" },
]

export default function TrustBar() {
  return (
    <section className="bg-gradient-to-b from-secondary/60 to-secondary/20 py-10">
      <div className="container mx-auto px-6 lg:px-8">
        {/* 第一行：认证徽章 */}
        <div className="mb-8">
          <p className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            International Certifications
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {certifications.map((cert) => (
              <div key={cert.name} className="group relative">
                <div className="transform hover:scale-110 transition-transform cursor-default">
                  <cert.component />
                </div>
                {/* Tooltip */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100
                  transition-opacity bg-foreground text-background text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                  {cert.tooltip}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 第二行：奖项荣誉 */}
        <div className="mb-8">
          <p className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Awards & Recognition
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {awards.map((award) => (
              <div key={award.name} className="group relative">
                <div className="transform hover:scale-110 transition-transform cursor-default">
                  <award.component />
                </div>
                {/* Tooltip */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100
                  transition-opacity bg-foreground text-background text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                  {award.tooltip}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-border/60 mb-6" />

        {/* 第三行：服务特性 + 统计数据 */}
        <div className="grid grid-cols-2 lg:grid-cols-8 gap-4">
          {services.map((service) => (
            <div
              key={service.title}
              className="flex items-center gap-3 bg-card/80 rounded-lg px-4 py-3 border border-border/50 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <service.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{service.title}</p>
                <p className="text-xs text-muted-foreground truncate">{service.desc}</p>
              </div>
            </div>
          ))}

          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 bg-primary/5 rounded-lg px-4 py-3 border border-primary/10 hover:shadow-md transition-shadow"
            >
              <stat.icon className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-lg font-bold text-primary leading-none">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
