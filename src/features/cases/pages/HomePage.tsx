import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { CASES } from '../data/cases'
import { CaseCard } from '../components/CaseCard'

export function HomePage() {
  return (
    <div className="page home-page">
      <motion.section
        className="hero"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
      >
        <p className="hero__brand">Celestia Wish</p>
        <h1 className="hero__title">Сделай желание. Поймай 5★.</h1>
        <p className="hero__lead">
          Элементальные баннеры Тейвата: соло-открытие или Case Battle. Побеждает высшая сумма дропа.
        </p>
        <div className="hero__actions">
          <Link to="/upgrade" className="btn btn--primary">
            Апгрейд
          </Link>
          <Link to="/battles" className="btn btn--ghost">
            Баттлы
          </Link>
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
