// Reference summaries checked 2026-10-03; these interpret labels, not certificates.
export interface ComplianceCode {
  code: string
  name: string
  description: string
  standard: 'EN-CLASS' | 'EN-ADDON' | 'ASTM' | 'SLIP'
}
const entry = (code: string, name: string, description: string, standard: ComplianceCode['standard']): ComplianceCode => ({ code, name, description, standard })
const cls = (code: string, name: string, description: string) => entry(code, name, description, 'EN-CLASS')
const addon = (code: string, name: string, description: string) => entry(code, name, description, 'EN-ADDON')
const astm = (code: string, name: string, description: string) => entry(code, name, description, 'ASTM')

// Class descriptions use 2022; the parser adds the 2011 differences.
export const EN_CLASSES: ComplianceCode[] = [
  cls('SB', 'Safety basic', 'Protective toecap tested at 200 J impact and 15 kN compression, with basic safety-footwear requirements. This code does not specify toecap material.'),
  cls('S1', 'Safety class 1', 'SB plus closed heel, antistatic properties (A) and heel energy absorption (E). FO is additional in 2022.'),
  cls('S1P', 'S1 with P', 'S1 plus penetration resistance with a metal insert under the 2022 edition.'),
  cls('S1PL', 'S1 with PL (2022)', 'S1 plus non-metal penetration-resistant insert tested with a 4.5 mm nail.'),
  cls('S1PS', 'S1 with PS (2022)', 'S1 plus non-metal penetration-resistant insert tested with a 3.0 mm nail.'),
  cls('S2', 'Safety class 2', 'S1 plus upper water penetration and absorption resistance (WPA); not whole-footwear water resistance.'),
  cls('S3', 'Safety class 3', 'S2 plus penetration resistance with a metal insert and a cleated outsole under the 2022 edition.'),
  cls('S3L', 'S3 with PL (2022)', 'S2 plus cleated outsole and non-metal insert tested with a 4.5 mm nail.'),
  cls('S3S', 'S3 with PS (2022)', 'S2 plus cleated outsole and non-metal insert tested with a 3.0 mm nail.'),
  cls('S4', 'Safety class 4', 'All-rubber or all-polymeric footwear with basic requirements, closed heel, antistatic properties and heel energy absorption.'),
  cls('S5', 'Safety class 5', 'S4 plus penetration resistance with a metal insert and cleated outsole under the 2022 edition.'),
  cls('S5L', 'S5 with PL (2022)', 'S4 plus cleated outsole and non-metal insert tested with a 4.5 mm nail.'),
  cls('S5S', 'S5 with PS (2022)', 'S4 plus cleated outsole and non-metal insert tested with a 3.0 mm nail.'),
  cls('S6', 'Safety class 6 (2022)', 'S2 plus whole-footwear water resistance (WR). Laboratory water resistance is not an unlimited waterproof guarantee.'),
  cls('S7', 'Safety class 7 (2022)', 'S3 plus whole-footwear water resistance (WR).'),
  cls('S7L', 'S7 with PL (2022)', 'S3L plus whole-footwear water resistance (WR).'),
  cls('S7S', 'S7 with PS (2022)', 'S3S plus whole-footwear water resistance (WR).'),
]
export const EN_ADDONS: ComplianceCode[] = [
  addon('P', 'Penetration resistance', '2022: metal insert with a 4.5 mm test nail. The 2011 P code does not distinguish insert materials.'),
  addon('PL', 'Non-metal penetration resistance (2022)', 'Non-metal insert with a 4.5 mm test nail; not a replacement for a metal insert code.'),
  addon('PS', 'Non-metal penetration resistance (2022)', 'Non-metal insert with a 3.0 mm test nail. Do not assume equivalence to PL or ASTM PR.'),
  addon('A', 'Antistatic', 'Electrical resistance controlled to reduce static buildup. Not electrical insulation.'),
  addon('C', 'Partly conductive', 'Partly conductive footwear; not electrical insulation.'),
  addon('E', 'Heel energy absorption', 'Energy absorption of the seat region.'),
  addon('FO', 'Fuel oil resistance', 'Fuel oil resistance of the outsole; optional additional requirement in 2022.'),
  addon('WR', 'Whole-footwear water resistance', 'Whole-footwear water resistance under the stated edition test; not an unlimited waterproof guarantee.'),
  addon('WRU', 'Upper water resistance (2011)', 'Upper water penetration and absorption resistance; replaced by WPA in 2022.'),
  addon('WPA', 'Upper water resistance (2022)', 'Upper water penetration and absorption resistance; not whole-footwear WR.'),
  addon('HI', 'Heat insulation', 'Heat insulation of the sole complex.'),
  addon('CI', 'Cold insulation', 'Cold insulation of the sole complex.'),
  addon('HRO', 'Heat-resistant outsole', 'Outsole hot-contact resistance under the standard test; not a safe workplace exposure temperature.'),
  addon('M', 'Metatarsal protection', 'EN additional protection for the top of the foot. ASTM M has a different meaning.'),
  addon('AN', 'Ankle protection', 'Ankle impact protection.'),
  addon('CR', 'Upper cut resistance', 'Cut resistance of the upper.'),
  addon('SC', 'Scuff-cap abrasion resistance (2022)', 'Abrasion resistance of an optional overcap; not a slip code.'),
  addon('LG', 'Ladder grip (2022)', 'Additional outsole ladder-grip requirement.'),
]
export const SLIP_CODES: ComplianceCode[] = [
  entry('SRA', 'Ceramic tile with SLS (2011)', 'Legacy ceramic-tile slip test with sodium lauryl sulphate solution.', 'SLIP'),
  entry('SRB', 'Steel with glycerol (2011)', 'Legacy steel-floor slip test with glycerol.', 'SLIP'),
  entry('SRC', 'Both SRA and SRB (2011)', 'Both legacy slip tests. SRC is not a 2022 marking or a direct ranking against SR.', 'SLIP'),
  entry('SR', 'Additional slip resistance (2022)', 'Optional additional test on ceramic tile with glycerol. Basic slip resistance is normally required without an SR marking.', 'SLIP'),
  entry('Ø', 'Slip test exception (2022)', 'Slip testing cannot be performed for this specialised footwear, such as footwear with spikes.', 'SLIP'),
]
export const ASTM_CODES: ComplianceCode[] = [
  astm('M', 'Men’s footwear designation', 'ASTM M identifies male footwear sizing/designation, not EN metatarsal protection.'),
  astm('F', 'Women’s footwear designation', 'ASTM F identifies female footwear sizing/designation.'),
  astm('I', 'Toe impact resistance', 'Impact protection marking; confirm the edition and model test report.'),
  astm('C', 'Toe compression resistance', 'Compression protection marking; confirm the edition and model test report.'),
  astm('I/75', 'Legacy toe impact rating', '75 ft·lbf toe impact rating format; label text alone does not verify certification.'),
  astm('C/75', 'Legacy toe compression rating', '2,500 lbf toe compression rating format; confirm the edition and model report.'),
  astm('Mt', 'Metatarsal protection', 'ASTM metatarsal protection marking, distinct from M.'),
  astm('Mt/75', 'Legacy metatarsal rating', 'Legacy metatarsal impact rating format; confirm the edition and report.'),
  astm('PR', 'Puncture resistance', 'Footwear-bottom puncture resistance; not automatically equivalent to EN P, PL or PS.'),
  astm('EH', 'Electrical hazard', 'Secondary electric shock resistance under test conditions. Not primary live-line insulation; wetness, wear and damage can reduce protection.'),
  astm('SD', 'Static dissipative', 'Static dissipative footwear; confirm category and resistance range in the model report.'),
  astm('SD10', 'Static dissipative category 10', 'Edition-specific category; confirm in the model report.'),
  astm('SD35', 'Static dissipative category 35', 'Edition-specific category; confirm in the model report.'),
  astm('SD100', 'Static dissipative category 100', 'Edition-specific category; confirm in the model report.'),
  astm('CD', 'Conductive', 'Conductive properties to reduce static accumulation. Not live electrical-contact protection.'),
  astm('DI', 'Dielectric insulation', 'Specialised dielectric insulation; confirm standard, report and intended use with the manufacturer.'),
]
export const STANDARD_LABEL: Record<ComplianceCode['standard'], string> = {
  'EN-CLASS': 'EN ISO 20345 class', 'EN-ADDON': 'EN additional code', SLIP: 'EN slip resistance', ASTM: 'ASTM F2413',
}
export const STANDARD_COMPARISON = [
  { property: 'Standard editions', en: '2011 and 2022 use different markings', astm: 'F2413-24 is active; F2413-18 is historical (checked 2026-10-03)' },
  { property: 'Toe protection', en: '200 J impact and 15 kN compression; does not specify material', astm: 'Different test methods; confirm edition and report' },
  { property: 'Penetration resistance', en: '2022: metal P; non-metal PL (4.5 mm nail) or PS (3.0 mm)', astm: 'PR; not directly equivalent to EN codes' },
  { property: 'Metatarsal', en: 'M means metatarsal protection', astm: 'Mt means metatarsal; M means male footwear designation' },
  { property: 'Electrical properties', en: 'A is antistatic; C partly conductive; neither is insulation', astm: 'EH is secondary shock resistance; CD and SD serve different purposes' },
  { property: 'Slip resistance', en: '2011: SRA/SRB/SRC; 2022: basic test normally unmarked, optional SR, exception Ø', astm: 'Request separate model-specific slip evidence' },
  { property: 'Water resistance', en: 'Upper: WRU (2011), WPA (2022). Whole footwear: WR', astm: 'Request separate model-specific water-resistance evidence' },
]
