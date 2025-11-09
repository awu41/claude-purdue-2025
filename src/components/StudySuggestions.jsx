import { useEffect, useMemo, useState } from 'react';
import { getStudySuggestions } from '../services/studyPlanner';
import { STORAGE_KEYS, readFromStorage, writeToStorage } from '../utils/storage';

const DEFAULT_ORIGIN = 'Purdue Memorial Union, West Lafayette, IN';

const StudySuggestions = ({ currentUser, activeFriend, sharedCourses = [], onMatchDrop }) => {
  const [origin, setOrigin] = useState(() => readFromStorage(STORAGE_KEYS.ORIGIN, DEFAULT_ORIGIN));
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isDropActive, setIsDropActive] = useState(false);

  useEffect(() => {
    writeToStorage(STORAGE_KEYS.ORIGIN, origin);
  }, [origin]);

  const courseSignature = useMemo(() => sharedCourses.map((course) => course.id).join('|'), [sharedCourses]);

  useEffect(() => {
    if (!currentUser || !activeFriend || !sharedCourses.length) {
      setStatus('idle');
      setSuggestions([]);
      setError('');
      return;
    }

    let cancelled = false;
    const hydrate = async () => {
      setStatus('loading');
      setError('');
      try {
        const result = await getStudySuggestions({ courses: sharedCourses, origin });
        if (!cancelled) {
          setSuggestions(result);
          setStatus('success');
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message || 'Unable to fetch suggestions right now.');
          setStatus('error');
        }
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [courseSignature, currentUser, activeFriend, origin, sharedCourses]);

  const canAcceptPayload = (event) => {
    if (!currentUser) return false;
    const types = Array.from(event?.dataTransfer?.types || []);
    return types.includes('application/json');
  };

  const handleDragOver = (event) => {
    if (!canAcceptPayload(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDropActive(true);
  };

  const handleDragLeave = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setIsDropActive(false);
  };

  const handleDrop = (event) => {
    if (!canAcceptPayload(event)) return;
    event.preventDefault();
    setIsDropActive(false);
    if (!onMatchDrop) return;
    try {
      const payload = JSON.parse(event.dataTransfer.getData('application/json') || '{}');
      if (payload.username && Array.isArray(payload.sharedCourses)) {
        onMatchDrop(payload.username, payload.sharedCourses);
      }
    } catch (dropError) {
      console.warn('Unable to parse dropped friend card', dropError);
    }
  };

  if (!currentUser) {
    return (
      <div className="rounded-3xl border border-slate-800/90 bg-slate-900/60 p-6 text-slate-300">
        Register first to view study suggestions.
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl border ${
        isDropActive ? 'border-emerald-400/60 ring-2 ring-emerald-500/40' : 'border-slate-800/80'
      } bg-gradient-to-br from-slate-900/80 to-slate-950/70 p-6 shadow-2xl shadow-slate-950/50`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Realtime concierge</p>
          <h2 className="text-2xl font-semibold text-white">Study space intel</h2>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Your starting point</label>
          <input
            type="text"
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
            className="mt-2 w-72 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            placeholder={DEFAULT_ORIGIN}
          />
        </div>
      </div>

      {!activeFriend && (
        <div
          className={`mt-6 rounded-2xl border border-dashed ${
            isDropActive ? 'border-emerald-400/60 bg-emerald-500/5 text-emerald-200' : 'border-slate-700 bg-slate-950/40 text-slate-400'
          } p-6`}
        >
          Drag a shared buddy card here to pull in contextual study spaces.
        </div>
      )}

      {activeFriend && (
        <div className="mt-6">
          <p className="text-sm text-slate-400">Friend: @{activeFriend}</p>
          <p className="text-xs uppercase tracking-wide text-emerald-300">Shared classes: {sharedCourses.length}</p>
        </div>
      )}

      {status === 'loading' && (
        <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-100">
          Fetching study spaces and walking distances…
        </div>
      )}

      {status === 'error' && (
        <div className="mt-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-100">
          {error}
        </div>
      )}

      {status === 'success' && suggestions.length === 0 && (
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-100">
          No study spots found yet. Try another friend or tweak your CSV data.
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {suggestions.map((suggestion) => (
            <article
              key={suggestion.id}
              className="flex h-full flex-col rounded-2xl border border-slate-800/60 bg-slate-950/50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{suggestion.courseName}</p>
                  <h3 className="text-xl font-semibold text-white">{suggestion.locationName}</h3>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-400">Class near {suggestion.classLocation}</p>
              <ul className="mt-3 space-y-1 text-sm text-slate-300">
                {suggestion.pros.map((pro) => (
                  <li key={pro} className="flex items-start gap-2">
                    <span className="text-emerald-300">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-4 text-sm">
                <a
                  href={suggestion.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-300 hover:text-emerald-200"
                >
                  Open in Google Maps ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudySuggestions;
