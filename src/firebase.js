import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD4Musjw5YatQsx9zfQXuGGEDDMNAo5nW4",
  authDomain: "camseltry.firebaseapp.com",
  projectId: "camseltry",
  storageBucket: "camseltry.appspot.com",
  messagingSenderId: "855349177144",
  appId: "1:855349177144:web:6e895c4a636031e41eefcd"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});

export { db };
