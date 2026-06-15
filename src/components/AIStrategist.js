import styles from './AIStrategist.module.css';
import { 
  BrainCircuit, 
  Target, 
  TrendingUp, 
  Briefcase, 
  Award, 
  MapPin,
  ArrowRight
} from 'lucide-react';

const features = [
  { icon: Target, title: "Admission Probability", desc: "Data-driven scoring for your target colleges." },
  { icon: MapPin, title: "College Fit Analysis", desc: "Matching based on culture, location, and academics." },
  { icon: TrendingUp, title: "ROI Prediction", desc: "Calculate the real return on your education investment." },
  { icon: Briefcase, title: "Placement Comparison", desc: "Compare average salaries and top recruiters." },
  { icon: Award, title: "Scholarship Matching", desc: "Discover financial aid opportunities tailored to you." },
  { icon: ArrowRight, title: "Career Pathway Mapping", desc: "Visualize your journey from admission to employment." },
];

export default function AIStrategist() {
  return (
    <section className={`section ${styles.aiSection}`}>
      <div className={`container ${styles.container}`}>
        <div className={styles.content}>
          <div className={styles.badge}>
            <BrainCircuit size={16} />
            <span>AI-Powered Insights</span>
          </div>
          <h2 className={styles.title}>Meet Your Personal AI Admission Strategist</h2>
          <p className={styles.subtitle}>
            Stop guessing. Our AI engine processes thousands of data points to give you a clear, actionable roadmap to your dream career.
          </p>

          <div className={styles.featureGrid}>
            {features.map((feat, index) => {
              const Icon = feat.icon;
              return (
                <div key={index} className={styles.featureCard}>
                  <div className={styles.iconWrapper}>
                    <Icon size={20} className={styles.icon} />
                  </div>
                  <div>
                    <h3 className={styles.featureTitle}>{feat.title}</h3>
                    <p className={styles.featureDesc}>{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.visual}>
          <div className={styles.flowCard}>
            <div className={styles.flowStep}>
              <div className={styles.stepCircle}>1</div>
              <div className={styles.stepContent}>Student Profile</div>
            </div>
            <div className={styles.flowLine}></div>
            <div className={styles.flowStep} style={{ transform: 'translateX(20px)' }}>
              <div className={`${styles.stepCircle} ${styles.aiStep}`}>
                <BrainCircuit size={18} />
              </div>
              <div className={styles.stepContent}>AI Analysis</div>
            </div>
            <div className={styles.flowLine}></div>
            <div className={styles.flowStep} style={{ transform: 'translateX(40px)' }}>
              <div className={styles.stepCircle}>3</div>
              <div className={styles.stepContent}>College Match</div>
            </div>
            <div className={styles.flowLine}></div>
            <div className={styles.flowStep} style={{ transform: 'translateX(60px)' }}>
              <div className={styles.stepCircle}>4</div>
              <div className={styles.stepContent}>Admission Plan</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
