"use client";

import { useForm } from 'react-hook-form';
import styles from './AdmissionCalculator.module.css';
import { Calculator, ChevronRight } from 'lucide-react';

export default function AdmissionCalculator() {
  const { register, handleSubmit } = useForm();

  const onSubmit = (data) => {
    console.log("Form Data:", data);
    // AI Integration will happen here
  };

  return (
    <section className={`section ${styles.calculatorSection}`}>
      <div className="container">
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <Calculator className={styles.icon} size={24} />
          </div>
          <h2 className={styles.title}>Interactive Admission Calculator</h2>
          <p className={styles.subtitle}>
            Enter your details below to generate a data-driven admission report and discover your chances.
          </p>
        </div>

        <div className={styles.calculatorCard}>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Test Score (CAT/GMAT/GRE)</label>
                <input 
                  type="text" 
                  placeholder="e.g. 99%ile or 720"
                  {...register('testScore')} 
                  className={styles.input}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Graduation %</label>
                <input 
                  type="number" 
                  placeholder="e.g. 85"
                  {...register('graduationScore')} 
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Budget (Total)</label>
                <select {...register('budget')} className={styles.input}>
                  <option value="">Select Budget</option>
                  <option value="under10">Under 10 Lakhs</option>
                  <option value="10to20">10 - 20 Lakhs</option>
                  <option value="20to30">20 - 30 Lakhs</option>
                  <option value="above30">Above 30 Lakhs</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Work Experience (Years)</label>
                <select {...register('workExperience')} className={styles.input}>
                  <option value="">Select Experience</option>
                  <option value="0">Fresher (0 years)</option>
                  <option value="1to3">1 - 3 years</option>
                  <option value="3to5">3 - 5 years</option>
                  <option value="5plus">5+ years</option>
                </select>
              </div>
              
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label>Preferred Cities</label>
                <input 
                  type="text" 
                  placeholder="e.g. Mumbai, Delhi, Bangalore"
                  {...register('preferredCities')} 
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.submitContainer}>
              <button type="submit" className={`btn btn-primary ${styles.submitBtn}`}>
                Generate My Admission Report
                <ChevronRight size={20} />
              </button>
              <p className={styles.secureText}>🔒 Your data is secure and will only be used for analysis.</p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
