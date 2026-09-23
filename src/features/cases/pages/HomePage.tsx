import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { CASES } from '../data/cases'
import { CaseCard } from '../components/CaseCard'
import { CelestiaMascot } from '../../../shared/components/brand/CelestiaMascot'

export function HomePage() {
  return (
    <div className="page home-page">
      <motion.section
        className="home-hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
      >
        <div className="home-hero__content">
          <motion.div
            className="home-hero__mascot-wrap"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <CelestiaMascot className="home-hero__mascot" />
          </motion.div>

          <motion.div
            className="home-hero__copy"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.55 }}
          >
            <p className="home-hero__brand">Celestia Wish</p>
            <h1 className="home-hero__title">Сделай желание. Поймай 5★.</h1>
            <p className="home-hero__lead">
              Элементальные баннеры Тейвата: соло-открытие или Case Battle.
              Побеждает высшая сумма дропа.
            </p>
            <div className="home-hero__actions">
              <Link to="/upgrade" className="btn btn--primary">
                Апгрейд
              </Link>
              <Link to="/battles" className="btn btn--ghost btn--on-hero">
                Баттлы
              </Link>
            </div>
          </motion.div>
        </div>
      </motion.section>

      <section className="cases-grid" aria-label="Список баннеров">
        {CASES.map((caseDef, index) => (
          <motion.div
            key={caseDef.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + index * 0.05, duration: 0.4 }}
          >
            <CaseCard caseDef={caseDef} />
          </motion.div>
        ))}
      </section>
    </div>
  )
}
