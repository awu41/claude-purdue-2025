import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseAuth, getFirebaseDb, getFirebaseStorage, isFirebaseReady } from './firebaseClient';

let persistenceSet = false;
const getAuthInstance = () => {
  if (!isFirebaseReady()) {
    throw new Error('Firebase environment variables are missing. Add them to .env to enable backend sync.');
  }
  const auth = getFirebaseAuth();
  if (!persistenceSet) {
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.warn('Unable to persist Firebase auth session', error);
    });
    persistenceSet = true;
  }
  return auth;
};

const getDbInstance = () => {
  if (!isFirebaseReady()) {
    throw new Error('Firebase environment variables are missing. Add them to .env to enable backend sync.');
  }
  return getFirebaseDb();
};

const getStorageInstance = () => {
  if (!isFirebaseReady()) {
    throw new Error('Firebase environment variables are missing. Add them to .env to enable backend sync.');
  }
  return getFirebaseStorage();
};

export const listenToAuth = (callback) => onAuthStateChanged(getAuthInstance(), callback);

export const registerOrSignIn = async ({ email, password, username }) => {
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const prepareUser = async (credential, isNew) => {
    const profileData = {
      username: username || credential.user.displayName || email.split('@')[0],
      email: credential.user.email,
      updatedAt: serverTimestamp()
    };

    if (username) {
      await updateProfile(credential.user, { displayName: username }).catch(() => {});
    }

    await setDoc(
      doc(getDbInstance(), 'users', credential.user.uid),
      {
        ...profileData,
        createdAt: credential.user.metadata?.creationTime || serverTimestamp(),
        uid: credential.user.uid,
        csvFileName: null,
        csvUrl: null,
        courses: []
      },
      { merge: true }
    );

    return {
      uid: credential.user.uid,
      email: credential.user.email,
      username: profileData.username,
      isNew
    };
  };

  try {
    const credential = await createUserWithEmailAndPassword(getAuthInstance(), email, password);
    return await prepareUser(credential, true);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      const credential = await signInWithEmailAndPassword(getAuthInstance(), email, password);
      const fallbackUsername = username || credential.user.displayName || email.split('@')[0];
      return {
        uid: credential.user.uid,
        email: credential.user.email,
        username: fallbackUsername,
        isNew: false
      };
    }
    throw error;
  }
};

export const logout = () => signOut(getAuthInstance());

export const subscribeToProfiles = (callback) => {
  const colRef = collection(getDbInstance(), 'users');
  return onSnapshot(colRef, (snapshot) => {
    const profiles = snapshot.docs.map((docSnap) => ({
      uid: docSnap.id,
      ...docSnap.data()
    }));
    callback(profiles);
  });
};

const uploadCsvAttachment = async (uid, file) => {
  if (!file) return {};
  const path = `schedules/${uid}/${Date.now()}-${file.name}`;
  const fileRef = ref(getStorageInstance(), path);
  await uploadBytes(fileRef, file, { contentType: file.type || 'text/csv' });
  const url = await getDownloadURL(fileRef);
  return {
    csvFileName: file.name,
    csvUrl: url,
    csvUploadedAt: serverTimestamp()
  };
};

export const saveCoursesForUser = async ({ uid, username, email, courses, file }) => {
  if (!uid) {
    throw new Error('User not authenticated');
  }

  const attachment = await uploadCsvAttachment(uid, file);

  await setDoc(
    doc(getDbInstance(), 'users', uid),
    {
      username,
      email,
      courses,
      ...attachment,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return attachment;
};
