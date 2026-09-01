"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './AdmissionCalculator.module.css';
import { X } from 'lucide-react';
import { getUniversitiesByCountryAndCategory } from '@/lib/collegeData';

const MAX_RESULTS = 8;

export default function UniversityCombobox({ value, onChange, country, degreeType, placeholder }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(() => value || [], [value]);

  const options = useMemo(
    () => getUniversitiesByCountryAndCategory(country, degreeType),
    [country, degreeType]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? options.filter(u =>
          u.name.toLowerCase().includes(q) || u.shortName?.toLowerCase().includes(q)
        )
      : options;
    return base.filter(u => !selected.includes(u.name)).slice(0, MAX_RESULTS);
  }, [options, query, selected]);

  const trimmedQuery = query.trim();
  const showAddCustom =
    trimmedQuery.length > 0 &&
    !selected.includes(trimmedQuery) &&
    !filtered.some(u => u.name.toLowerCase() === trimmedQuery.toLowerCase());

  const rowCount = filtered.length + (showAddCustom ? 1 : 0);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectUniversity(name) {
    if (!selected.includes(name)) onChange([...selected, name]);
    setQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  }

  function removeUniversity(name) {
    onChange(selected.filter(v => v !== name));
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(i => Math.min(i + 1, rowCount - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        selectUniversity(filtered[highlightedIndex].name);
      } else if (highlightedIndex === filtered.length && showAddCustom) {
        selectUniversity(trimmedQuery);
      } else if (showAddCustom) {
        selectUniversity(trimmedQuery);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Backspace' && !query && selected.length) {
      removeUniversity(selected[selected.length - 1]);
    }
  }

  return (
    <div className={styles.combobox} ref={wrapperRef} role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" aria-controls="university-combobox-listbox">
      {selected.length > 0 && (
        <div className={styles.chipsRow}>
          {selected.map(name => (
            <span key={name} className={styles.chip}>
              {name}
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => removeUniversity(name)}
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
          !country || !degreeType
            ? 'Select target degree and country first'
            : placeholder || 'Search universities...'
        }
        onChange={e => { setQuery(e.target.value); setIsOpen(true); setHighlightedIndex(-1); }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        aria-autocomplete="list"
        role="textbox"
      />
      {isOpen && (
        <div id="university-combobox-listbox" className={styles.listbox} role="listbox">
          {!country || !degreeType ? (
            <div className={styles.listboxEmpty}>
              Select a target degree and country to search curated universities.
            </div>
          ) : filtered.length === 0 && !showAddCustom ? (
            <div className={styles.listboxEmpty}>No matches in our curated list yet.</div>
          ) : (
            <>
              {filtered.map((u, i) => (
                <div
                  key={u.id}
                  role="option"
                  aria-selected={i === highlightedIndex}
                  className={`${styles.listboxOption} ${i === highlightedIndex ? styles.listboxOptionActive : ''}`}
                  onMouseDown={e => { e.preventDefault(); selectUniversity(u.name); }}
                  onMouseEnter={() => setHighlightedIndex(i)}
                >
                  <span>{u.name}</span>
                  <span className={styles.listboxOptionMeta}>{u.city}, {u.country}</span>
                </div>
              ))}
              {showAddCustom && (
                <div
                  role="option"
                  aria-selected={highlightedIndex === filtered.length}
                  className={`${styles.listboxOption} ${styles.addCustomOption} ${highlightedIndex === filtered.length ? styles.listboxOptionActive : ''}`}
                  onMouseDown={e => { e.preventDefault(); selectUniversity(trimmedQuery); }}
                  onMouseEnter={() => setHighlightedIndex(filtered.length)}
                >
                  Add &quot;{trimmedQuery}&quot; as a custom university
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
