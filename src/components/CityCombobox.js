"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './AdmissionCalculator.module.css';
import { X } from 'lucide-react';

const MAX_RESULTS = 8;
const GEO_API_URL = 'https://wft-geo-db.p.rapidapi.com/v1/geo/cities';

// RapidAPI key comes from the environment variable
const GEO_API_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;

export default function CityCombobox({ value, onChange, country, placeholder }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(() => value || [], [value]);

  // Fetch cities from GeoDB API
  useEffect(() => {
    const fetchCities = async () => {
      if (!query.trim() || query.length < 2) {
        setCities([]);
        return;
      }

      if (!GEO_API_KEY) {
        console.error('NEXT_PUBLIC_RAPIDAPI_KEY is not configured.');
        setCities([]);
        return;
      }

      setLoading(true);

      try {
        const countryParam =
          country && country !== 'India'
            ? `&countryIds=${getCountryCode(country)}`
            : '';

        const response = await fetch(
          `${GEO_API_URL}?minPopulation=100000&namePrefix=${encodeURIComponent(
            query
          )}&limit=${MAX_RESULTS}${countryParam}`,
          {
            headers: {
              'X-RapidAPI-Key': GEO_API_KEY,
              'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch cities');
        }

        const data = await response.json();

        const cityList =
          data.data?.map(city => ({
            id: city.id,
            name: city.name,
            region: city.region,
            country: city.country
          })) || [];

        setCities(cityList);
      } catch (error) {
        console.error('Error fetching cities:', error);
        setCities([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchCities, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, country]);

  const filtered = useMemo(() => {
    return cities.filter(city => !selected.includes(city.name));
  }, [cities, selected]);

  const trimmedQuery = query.trim();
  const showAddCustom =
    trimmedQuery.length > 0 &&
    !selected.includes(trimmedQuery) &&
    !filtered.some(
      c => c.name.toLowerCase() === trimmedQuery.toLowerCase()
    );

  const rowCount = filtered.length + (showAddCustom ? 1 : 0);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);

    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectCity(name) {
    if (!selected.includes(name)) {
      onChange([...selected, name]);
    }
    setQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    setCities([]);
    inputRef.current?.focus();
  }

  function removeCity(name) {
    onChange(selected.filter(v => v !== name));
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(i =>
        Math.min(i + 1, rowCount - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (
        highlightedIndex >= 0 &&
        highlightedIndex < filtered.length
      ) {
        selectCity(filtered[highlightedIndex].name);
      } else if (
        highlightedIndex === filtered.length &&
        showAddCustom
      ) {
        selectCity(trimmedQuery);
      } else if (showAddCustom) {
        selectCity(trimmedQuery);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (
      e.key === 'Backspace' &&
      !query &&
      selected.length
    ) {
      removeCity(selected[selected.length - 1]);
    }
  }

  return (
    <div ref={wrapperRef} className={styles.combobox}>
      {selected.length > 0 && (
        <div className={styles.chipsRow}>
          {selected.map(name => (
            <span key={name} className={styles.chip}>
              {name}
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => removeCity(name)}
                aria-label={`Remove ${name}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="text"
        className={styles.input}
        value={query}
        placeholder={
          placeholder || 'Search cities worldwide...'
        }
        onChange={e => {
          setQuery(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        aria-autocomplete="list"
        role="textbox"
      />

      {isOpen && (
        <div
          id="city-combobox-listbox"
          className={styles.listbox}
          role="listbox"
        >
          {loading ? (
            <div className={styles.listboxEmpty}>
              Loading cities...
            </div>
          ) : filtered.length === 0 && !showAddCustom ? (
            <div className={styles.listboxEmpty}>
              {query.length < 2
                ? 'Type at least 2 characters to search'
                : 'No cities found'}
            </div>
          ) : (
            <>
              {filtered.map((city, i) => (
                <div
                  key={city.id}
                  role="option"
                  aria-selected={i === highlightedIndex}
                  className={`${styles.listboxOption} ${
                    i === highlightedIndex
                      ? styles.listboxOptionActive
                      : ''
                  }`}
                  onMouseDown={e => {
                    e.preventDefault();
                    selectCity(city.name);
                  }}
                  onMouseEnter={() =>
                    setHighlightedIndex(i)
                  }
                >
                  <span>{city.name}</span>

                  <span className={styles.listboxOptionMeta}>
                    {city.region ? `${city.region}, ` : ''}
                    {city.country}
                  </span>
                </div>
              ))}

              {showAddCustom && (
                <div
                  role="option"
                  aria-selected={
                    highlightedIndex === filtered.length
                  }
                  className={`${styles.listboxOption} ${
                    styles.addCustomOption
                  } ${
                    highlightedIndex === filtered.length
                      ? styles.listboxOptionActive
                      : ''
                  }`}
                  onMouseDown={e => {
                    e.preventDefault();
                    selectCity(trimmedQuery);
                  }}
                  onMouseEnter={() =>
                    setHighlightedIndex(filtered.length)
                  }
                >
                  Add &quot;{trimmedQuery}&quot; as a custom city
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to convert country name to ISO code
function getCountryCode(countryName) {
  const countryMap = {
    'United States': 'US',
    'United Kingdom': 'GB',
    Canada: 'CA',
    Australia: 'AU',
    Germany: 'DE',
    France: 'FR',
    India: 'IN',
    Singapore: 'SG',
    Netherlands: 'NL',
    Sweden: 'SE',
    Switzerland: 'CH',
    Spain: 'ES',
    Italy: 'IT',
    Japan: 'JP',
    China: 'CN',
    'South Korea': 'KR',
    'New Zealand': 'NZ',
    Ireland: 'IE',
    Denmark: 'DK',
    Norway: 'NO',
    Finland: 'FI',
    Belgium: 'BE',
    Austria: 'AT',
    'United Arab Emirates': 'AE',
    'Hong Kong': 'HK',
    Malaysia: 'MY',
    Thailand: 'TH',
    Brazil: 'BR',
    Mexico: 'MX',
    'South Africa': 'ZA',
    Russia: 'RU',
    Turkey: 'TR',
    Poland: 'PL',
    'Czech Republic': 'CZ',
    Hungary: 'HU',
    Greece: 'GR',
    Portugal: 'PT',
    Israel: 'IL'
  };
  return countryMap[countryName] || '';
}