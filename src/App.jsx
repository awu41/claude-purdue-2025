import { Tab } from '@headlessui/react';
import { useEffect, useMemo, useState } from 'react';
import RegisterForm from './components/RegisterForm';
import CourseUpload from './components/CourseUpload';
import MatchList from './components/MatchList';
import StudySuggestions from './components/StudySuggestions';
import { readFromStorage, STORAGE_KEYS, writeToStorage } from './utils/storage';
import {
  listenToAuth,
  logout,
  registerOrSignIn,
  saveCoursesForUser,
  subscribeToProfiles
} from './services/profileService';
import { isFirebaseReady } from './services/firebaseClient';

const heroStats = [
  { label: 'Students onboarded', value: 'Firebase Auth' },
  { label: 'Matches found', value: 'Realtime' },
  { label: 'Assets stored', value: 'CSV + Firestore' }
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
  const currentCourses = currentUser ? courseMap[currentUser] || [] : [];
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
  const [friendships, setFriendships] = useState(() => readFromStorage(STORAGE_KEYS.FRIENDSHIPS, {}));
  const [activeFriend, setActiveFriend] = useState(null);
  const [activeSharedCourses, setActiveSharedCourses] = useState([]);
  const [authUser, setAuthUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const firebaseEnabled = isFirebaseReady();

  useEffect(() => {
    writeToStorage(STORAGE_KEYS.FRIENDSHIPS, friendships);
  }, [friendships]);

  useEffect(() => {
    if (!firebaseEnabled) {
      setAuthLoading(false);
      return undefined;
    }
    const unsubscribe = listenToAuth((user) => {
      if (user) {
        setAuthUser({
          uid: user.uid,
          email: user.email,
          username: user.displayName || user.email?.split('@')[0] || 'Boilermaker'
        });
      } else {
        setAuthUser(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, [firebaseEnabled]);

  useEffect(() => {
    if (!firebaseEnabled || !authUser) {
      setProfiles([]);
      return;
    }
    const unsubscribe = subscribeToProfiles((records) => {
      setProfiles(records);
    });
    return unsubscribe;
  }, [authUser]);

  const currentProfile = useMemo(
    () => profiles.find((entry) => entry.uid === authUser?.uid) || null,
    [profiles, authUser]
  );

  const currentUserKey = useMemo(() => {
    if (currentProfile) {
      return currentProfile.username || currentProfile.email || currentProfile.uid;
    }
    if (authUser) {
      return authUser.username || authUser.email || authUser.uid;
    }
    return '';
  }, [authUser, currentProfile]);

  const courseMap = useMemo(() => {
    return profiles.reduce((acc, profile) => {
      const key = profile.username || profile.email || profile.uid;
      acc[key] = profile.courses || [];
      return acc;
    }, {});
  }, [profiles]);

  const matches = useMemo(() => computeMatches(currentUserKey, courseMap), [currentUserKey, courseMap]);
  const storedCourses = currentProfile?.courses || [];

  const handleRegister = async ({ username, email, password }) => {
    if (!firebaseEnabled) {
      throw new Error('Firebase is not configured. Fill in .env to enable backend sync.');
    }
    const result = await registerOrSignIn({ username, email, password });
    return {
      ...result,
      message: result.isNew ? 'Firebase profile created.' : 'Signed in successfully.'
    };
  };

  const handleCoursesParsed = async (courses, file) => {
    if (!firebaseEnabled || !currentProfile) {
      throw new Error('Please sign in before uploading a schedule.');
    }
    await saveCoursesForUser({
      uid: currentProfile.uid,
      username: currentProfile.username,
      email: currentProfile.email,
      courses,
      file
    });
  };

  const handleFriend = (friendUsername, sharedCourses) => {
    if (!currentUserKey) return;
    setFriendships((prev) => {
      const currentFriends = Array.from(new Set([...(prev[currentUserKey] || []), friendUsername]));
      const reciprocol = Array.from(new Set([...(prev[friendUsername] || []), currentUserKey]));
      return {
        ...prev,
        [currentUserKey]: currentFriends,
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
            Match classmates. Unlock study spaces. <span className="text-emerald-300">Firebase-backed.</span>
          </h1>
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
              <RegisterForm
                onRegister={handleRegister}
                onSignOut={logout}
                currentProfile={currentProfile}
                isLoading={authLoading}
              />
              <CourseUpload currentProfile={currentProfile} courses={storedCourses} onCoursesParsed={handleCoursesParsed} />
            </Tab.Panel>
            <Tab.Panel className="space-y-6">
              <MatchList currentUser={currentUserKey} matches={matches} friendships={friendships} onFriend={handleFriend} />
              <StudySuggestions
                currentUser={currentUserKey}
                activeFriend={activeFriend}
                sharedCourses={activeSharedCourses}
                onMatchDrop={handleFriend}
              />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </main>
    </div>
  );
}

export default App;
