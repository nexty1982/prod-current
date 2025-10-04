import React, { useEffect, useState } from 'react';
import './OrthodoxBanner.css';

/**
 * Orthodox Metrics Banner Component
 *
 * A multilingual banner displaying the Orthodox Metrics logo with translations
 * in English, Greek, Russian, Romanian, and Georgian.
 *
 * @param {Object} props
 * @param {string} props.subtitle - Optional subtitle to display under the banner (e.g., "Administration Panel")
 * @param {boolean} props.showTagline - Whether to show the tagline (default: true)
 */
const OrthodoxBanner = ({ subtitle, showTagline = true }) => {
  const [currentLangIndex, setCurrentLangIndex] = useState(0);
  const languages = ['en', 'el', 'ru', 'ro', 'ka'];

  useEffect(() => {
    // Start rotation after 3 seconds, then every 4 seconds
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setCurrentLangIndex(prevIndex => (prevIndex + 1) % languages.length);
      }, 4000);

      return () => clearInterval(interval);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="om-header">
      <div className="banner-container">
        <div className="main-content">
          <div className="left-text">
            Orthodox<br />Metrics
          </div>

          <div className="orthodox-cross">
            <div className="cross-bar vertical-beam"></div>
            <div className="cross-bar top-bar"></div>
            <div className="cross-bar main-bar"></div>
            <div className="cross-bar bottom-bar"></div>
          </div>

          <div className="right-text">
            <div className={`text-transition ${currentLangIndex === 0 ? 'active' : ''}`} data-lang="en">Orthodox<br />Metrics</div>
            <div className={`text-transition ${currentLangIndex === 1 ? 'active' : ''}`} data-lang="el">Ορθόδοξες<br />Μετρήσεις</div>
            <div className={`text-transition ${currentLangIndex === 2 ? 'active' : ''}`} data-lang="ru">Православные<br />Метрики</div>
            <div className={`text-transition ${currentLangIndex === 3 ? 'active' : ''}`} data-lang="ro">Metrici<br />Ortodoxe</div>
            <div className={`text-transition ${currentLangIndex === 4 ? 'active' : ''}`} data-lang="ka">მართმადიდებლური<br />მეტრიკა</div>
          </div>
        </div>

        {showTagline && (
          <div className="tagline">
            <div className={`text-transition ${currentLangIndex === 0 ? 'active' : ''}`} data-lang="en">Recording the Saints Amongst Us!</div>
            <div className={`text-transition ${currentLangIndex === 1 ? 'active' : ''}`} data-lang="el">Καταγράφοντας τοὺς Ἁγίους ἀνάμεσά μας!</div>
            <div className={`text-transition ${currentLangIndex === 2 ? 'active' : ''}`} data-lang="ru">Записывая святых среди нас!</div>
            <div className={`text-transition ${currentLangIndex === 3 ? 'active' : ''}`} data-lang="ro">Înregistrăm sfinții din mijlocul nostru!</div>
            <div className={`text-transition ${currentLangIndex === 4 ? 'active' : ''}`} data-lang="ka">ვაკონწილებთ ჩვენ შორის წმინდანებს!</div>
          </div>
        )}

        {subtitle && (
          <div className="admin-subtitle">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrthodoxBanner;
