"use client";

import { useState } from 'react';
import styles from './ExploreFuture.module.css';
import { ArrowRight, Compass } from 'lucide-react';

const tabs = [
  "MBA",
  "Engineering",
  "Medical",
  "Study Abroad",
  "Executive Education",
  "Upskilling"
];

const contentData = {
  "MBA": {
    title: "Master of Business Administration",
    desc: "Discover top B-schools, analyze average placements, and map your path to executive leadership.",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    stats: [
      { label: "Avg. ROI", value: "140%" },
      { label: "Top Colleges", value: "50+" },
      { label: "Placement Time", value: "3 mos" }
    ]
  },
  "Engineering": {
    title: "Engineering & Technology",
    desc: "Find specialized programs in CS, AI, and cutting-edge tech with the highest industry demand.",
    image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    stats: [
      { label: "Avg. ROI", value: "125%" },
      { label: "Top Colleges", value: "100+" },
      { label: "Demand Growth", value: "22%" }
    ]
  },
  "Medical": {
    title: "Medical & Healthcare",
    desc: "Navigate complex admission processes for top medical colleges and specialized healthcare degrees.",
    image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    stats: [
      { label: "Avg. ROI", value: "110%" },
      { label: "Top Colleges", value: "40+" },
      { label: "Job Security", value: "High" }
    ]
  },
  "Study Abroad": {
    title: "International Education",
    desc: "Unlock global opportunities with detailed guides on visas, scholarships, and international ROI.",
    image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    stats: [
      { label: "Countries", value: "15+" },
      { label: "Scholarships", value: "$2M+" },
      { label: "Visa Success", value: "94%" }
    ]
  },
  "Executive Education": {
    title: "Executive Programs",
    desc: "Accelerate your career without hitting pause. Find programs designed for working professionals.",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    stats: [
      { label: "Avg Exp Req", value: "5+ Yrs" },
      { label: "Format", value: "Hybrid" },
      { label: "Network", value: "Global" }
    ]
  },
  "Upskilling": {
    title: "Certifications & Upskilling",
    desc: "Stay relevant with short-term, high-impact courses in data science, AI, and digital marketing.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    stats: [
      { label: "Duration", value: "3-6 mos" },
      { label: "Skill Jump", value: "High" },
      { label: "Flexibility", value: "100%" }
    ]
  }
};

export default function ExploreFuture() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const activeContent = contentData[activeTab];

  return (
    <section className={`section ${styles.exploreSection}`}>
      <div className="container">
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <Compass className={styles.icon} size={24} />
          </div>
          <h2 className={styles.title}>Explore Your Future</h2>
          <p className={styles.subtitle}>
            Dive deep into specialized domains. Access AI-curated intelligence to find the path that aligns perfectly with your goals.
          </p>
        </div>

        <div className={styles.tabsContainer}>
          <div className={styles.tabsList}>
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`${styles.tabBtn} ${activeTab === tab ? styles.activeTab : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.contentCard}>
          <div className={styles.contentImage}>
            <img src={activeContent.image} alt={activeContent.title} />
            <div className={styles.imageOverlay}></div>
          </div>
          <div className={styles.contentBody}>
            <h3 className={styles.contentTitle}>{activeContent.title}</h3>
            <p className={styles.contentDesc}>{activeContent.desc}</p>
            
            <div className={styles.statsGrid}>
              {activeContent.stats.map((stat, idx) => (
                <div key={idx} className={styles.statBox}>
                  <div className={styles.statValue}>{stat.value}</div>
                  <div className={styles.statLabel}>{stat.label}</div>
                </div>
              ))}
            </div>

            <button className={`btn btn-secondary ${styles.actionBtn}`}>
              Explore {activeTab} Pathways
              <ArrowRight size={18} style={{ marginLeft: '8px' }} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
