import { Tab } from '@headlessui/react';
import { useEffect, useMemo, useState } from 'react';
import RegisterForm from './components/RegisterForm';
import CourseUpload from './components/CourseUpload';
import MatchList from './components/MatchList';
import StudySuggestions from './components/StudySuggestions';
import { readFromStorage, removeFromStorage, STORAGE_KEYS, writeToStorage } from './utils/storage';
import { seedCourses, seedFriendships, seedUsers } from './data/seeds';

const heroStats = [
  { label: 'Students onboarded', value: 'Frontend-only' },
  { label: 'Matches found', value: 'Realtime' },
  { label: 'API calls saved', value: '100% client' }
];

const normalize = (value) => (value || '').toLowerCase().trim();

const coursesOverlap = (a, b) => {
  const nameMatch = a.courseName && b.courseName && normalize(a.courseName) === normalize(b.courseName);
  const locationMatch = a.location && b.location && normalize(a.location) === normalize(b.location);
  const professorMatch = a.professor && b.professor && normalize(a.professor) === normalize(b.professor);
  const timeMatch = a.time && b.time && normalize(a.time) === normalize(b.time);

  return nameMatch || (locationMatch && timeMatch) || (nameMatch && professorMatch) || (locationMatch && professorMatch);
};

const findSharedCourses = (currentCourses, otherCourses) => {
  return currentCourses.reduce((shared, course) => {
    const matched = otherCourses.find((other) => coursesOverlap(course, other));
    if (matched) {
      shared.push({ ...course, matchedCourse: matched });
    }
    return shared;
  }, []);
};

const computeMatches = (currentUser, courseMap) => {
  const currentCourses = courseMap[currentUser] || [];
  if (!currentCourses.length) return [];

  return Object.entries(courseMap)
    .filter(([username]) => username !== currentUser)
    .map(([username, courses]) => {
      const sharedCourses = findSharedCourses(currentCourses, courses);
      const score = currentCourses.length ? Math.round((sharedCourses.length / currentCourses.length) * 100) : 0;
      return { username, sharedCourses, score };
    })
    .filter((entry) => entry.sharedCourses.length > 0)
    .sort((a, b) => b.sharedCourses.length - a.sharedCourses.length);
};

function App() {
  const [users, setUsers] = useState(() => readFromStorage(STORAGE_KEYS.USERS, seedUsers));
  const [coursesByUser, setCoursesByUser] = useState(() => readFromStorage(STORAGE_KEYS.COURSES, seedCourses));
  const [friendships, setFriendships] = useState(() => readFromStorage(STORAGE_KEYS.FRIENDSHIPS, seedFriendships));
  const [currentUser, setCurrentUser] = useState(() => readFromStorage(STORAGE_KEYS.CURRENT_USER, ''));
  const [activeFriend, setActiveFriend] = useState(null);
  const [activeSharedCourses, setActiveSharedCourses] = useState([]);

  useEffect(() => {
    writeToStorage(STORAGE_KEYS.USERS, users);
  }, [users]);

  useEffect(() => {
    writeToStorage(STORAGE_KEYS.COURSES, coursesByUser);
  }, [coursesByUser]);

  useEffect(() => {
    writeToStorage(STORAGE_KEYS.FRIENDSHIPS, friendships);
  }, [friendships]);

  useEffect(() => {
    if (currentUser) {
      writeToStorage(STORAGE_KEYS.CURRENT_USER, currentUser);
    } else {
      removeFromStorage(STORAGE_KEYS.CURRENT_USER);
    }
  }, [currentUser]);

  const matches = useMemo(() => computeMatches(currentUser, coursesByUser), [currentUser, coursesByUser]);
  const storedCourses = currentUser ? coursesByUser[currentUser] || [] : [];

  const handleRegister = ({ username, password }) => {
    if (!username || !password) {
      return { success: false, message: 'Username and password are required.' };
    }

    const existing = users.find((user) => user.username === username);
    if (existing && existing.password !== password) {
      return { success: false, message: 'Password mismatch. Use a different username or correct password.' };
    }

    if (!existing) {
      setUsers((prev) => [...prev.filter((user) => user.username !== username), { username, password }]);
    }

    setCurrentUser(username);
    return { success: true, message: existing ? 'Welcome back!' : 'Profile saved locally.' };
  };

  const handleCoursesParsed = (courses) => {
    if (!currentUser) return;
    setCoursesByUser((prev) => ({
      ...prev,
      [currentUser]: courses
    }));
  };

  const handleFriend = (friendUsername, sharedCourses) => {
    if (!currentUser) return;
    setFriendships((prev) => {
      const currentFriends = Array.from(new Set([...(prev[currentUser] || []), friendUsername]));
      const reciprocol = Array.from(new Set([...(prev[friendUsername] || []), currentUser]));
      return {
        ...prev,
        [currentUser]: currentFriends,
        [friendUsername]: reciprocol
      };
    });
    setActiveFriend(friendUsername);
    setActiveSharedCourses(sharedCourses);
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-emerald-500/20 blur-3xl" />
        <header className="relative mx-auto max-w-6xl px-4 pt-16 text-center text-white">
          <p className="inline-flex items-center rounded-full border border-emerald-400/40 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200">
            Purdue Study Graph
          </p>
          <h1 className="mt-6 text-4xl font-semibold leading-tight md:text-5xl">
            Match classmates. Unlock study spaces. <span className="text-emerald-300">Zero backend.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-slate-300">
            MVP starter built with React, Tailwind, HeadlessUI tabs, PapaParse, localStorage, and mocked Purdue GENAI + Google Maps integrations for frontend-only deployments.
          </p>
          <div className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur md:grid-cols-3">
            {heroStats.map((stat) => (
              <div key={stat.label}>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-300">{stat.label}</p>
                <p className="mt-2 text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        </header>
      </div>

      <main className="mx-auto mt-12 max-w-6xl px-4">
        <Tab.Group>
          <Tab.List className="grid grid-cols-2 gap-4 rounded-3xl border border-slate-800/80 bg-slate-900/70 p-2 text-sm font-semibold text-slate-400">
            {['Register & Upload', 'Matchmaking & Spaces'].map((tab) => (
              <Tab
                key={tab}
                className={({ selected }) =>
                  `rounded-2xl px-4 py-3 transition focus:outline-none ${selected ? 'bg-slate-800 text-white' : 'hover:text-white'}`
                }
              >
                {tab}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels className="mt-6 space-y-6">
            <Tab.Panel className="space-y-6">
              <RegisterForm onRegister={handleRegister} currentUser={currentUser} />
              <CourseUpload currentUser={currentUser} courses={storedCourses} onCoursesParsed={handleCoursesParsed} />
            </Tab.Panel>
            <Tab.Panel className="space-y-6">
              <MatchList currentUser={currentUser} matches={matches} friendships={friendships} onFriend={handleFriend} />
              <StudySuggestions currentUser={currentUser} activeFriend={activeFriend} sharedCourses={activeSharedCourses} />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </main>
    </div>
  );
}

export default App;
