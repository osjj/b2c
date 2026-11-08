import type { Solution } from '@prisma/client'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import styles from './blog-layout.module.css'

type SolutionSummary = Pick<Solution, 'id' | 'slug' | 'title' | 'excerpt' | 'coverImage'>

const PRIORITY_HUBS = [
  {
    slug: 'construction-site-ppe-solution',
    title: 'Construction PPE hub',
    description:
      'Review construction hazards, PPE categories, task checklists and bulk procurement requirements.',
    features: ['Solution overview', 'Task checklists', 'Product categories', 'RFQ resources'],
    action: 'Open construction hub',
  },
  {
    slug: 'ppe-safety-equipment-for-mining-quarrying',
    title: 'Mining & quarrying PPE hub',
    description:
      'Compare task, work-area, dust, noise and footwear decisions before preparing a mine or quarry PPE enquiry.',
    features: ['Task checklist', 'Work-area guide', 'Exposure guides', 'Buyer resources'],
    action: 'Open mining hub',
  },
] as const

export function BlogIndustrySolutions({ solutions }: { solutions: SolutionSummary[] }) {
  if (solutions.length === 0) return null

  const hubs = PRIORITY_HUBS.flatMap((hub) => {
    const solution = solutions.find((item) => item.slug === hub.slug)
    return solution ? [{ ...hub, solution }] : []
  })
  const otherSolutions = solutions.filter(
    (solution) => !hubs.some((hub) => hub.slug === solution.slug),
  )

  return (
    <section
      id="industry-solutions"
      aria-labelledby="industry-solutions-heading"
      className={styles.industrySection}
    >
      <div className={styles.sectionHeader}>
        <div>
          <h2 id="industry-solutions-heading" className={styles.sectionTitle}>Industry solutions</h2>
          <p className={styles.sectionDescription}>
            Select a work setting to review hazards, PPE options and procurement requirements.
          </p>
        </div>
        <span className={styles.sectionMeta}>
          {solutions.length} industry guide{solutions.length === 1 ? '' : 's'}
        </span>
      </div>

      {hubs.length > 0 ? (
        <div className={styles.hubGrid}>
          {hubs.map((hub) => (
            <Link
              key={hub.slug}
              href={`/solutions/${hub.slug}`}
              aria-label={hub.title}
              className={styles.hubCard}
              data-with-image={Boolean(hub.solution.coverImage)}
            >
              {hub.solution.coverImage ? (
                <div className={styles.hubMedia}>
                  <Image
                    src={hub.solution.coverImage}
                    alt={hub.solution.title}
                    fill
                    sizes="(max-width: 639px) 94vw, (max-width: 1199px) 46vw, 22vw"
                    className={styles.coverImage}
                  />
                </div>
              ) : null}
              <div className={styles.hubCopy}>
                <p className={styles.sectionMeta}>Industry hub</p>
                <h3 className={styles.hubTitle}>{hub.title}</h3>
                <p className={styles.hubDescription}>{hub.description}</p>
                <ul className={styles.hubFeatures}>
                  {hub.features.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <span className={styles.textAction}>
                  {hub.action}
                  <ArrowRight size={16} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {otherSolutions.length > 0 ? (
        <details className={styles.moreGuides} open={hubs.length === 0}>
          <summary>
            {hubs.length > 0 ? 'More industry guides' : 'Browse industry guides'}
            <span>({otherSolutions.length})</span>
          </summary>
          <div className={styles.solutionGrid}>
            {otherSolutions.map((solution) => (
              <Link
                key={solution.id}
                href={`/solutions/${solution.slug}`}
                className={styles.solutionLink}
              >
                <h3 className={styles.solutionTitle}>{solution.title}</h3>
                {solution.excerpt ? <p className={styles.solutionExcerpt}>{solution.excerpt}</p> : null}
                <span className={styles.textAction}>
                  View solution
                  <ArrowRight size={16} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  )
}
