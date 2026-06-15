import styles from './Hero.module.css';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={`container ${styles.heroContainer}`}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <Sparkles size={16} className={styles.badgeIcon} />
            <span>Intelligent Decision-Making Platform</span>
          </div>
          <h1 className={styles.title}>
            Know Where You'll Get In <br />
            <span className="gradient-text">Before You Apply</span>
          </h1>
          <p className={styles.subtitle}>
            AI-powered admission intelligence that analyzes your profile, predicts admission chances, and guides you to the colleges most likely to maximize your career outcomes.
          </p>
          <div className={styles.actions}>
            <button className="btn btn-primary">
              Check My Chances
              <ArrowRight size={18} style={{ marginLeft: '8px' }} />
            </button>
            <button className="btn btn-secondary">
              Talk to AI Strategist
            </button>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.visualCard}>
            <div className={styles.visualHeader}>
              <div className={styles.dot} style={{ backgroundColor: '#ef4444' }}></div>
              <div className={styles.dot} style={{ backgroundColor: '#eab308' }}></div>
              <div className={styles.dot} style={{ backgroundColor: '#22c55e' }}></div>
            </div>
            <div className={styles.visualBody}>
              <div className={styles.visualRow}>
                <div className={styles.avatar}></div>
                <div className={styles.lineGroup}>
                  <div className={styles.line}></div>
                  <div className={styles.line} style={{ width: '60%' }}></div>
                </div>
              </div>
              <div className={styles.analysisBox}>
                <div className={styles.progressHeader}>
                  <span>Admission Probability</span>
                  <span className={styles.percentage}>87%</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: '87%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
