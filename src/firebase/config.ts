// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDBAvWob0IID1Aac8LeyD9KJXDZaZJMn5g",
  authDomain: "qubes-3672d.firebaseapp.com",
  databaseURL: "https://qubes-3672d.firebaseio.com",
  projectId: "qubes-3672d",
  storageBucket: "qubes-3672d.firebasestorage.app",
  messagingSenderId: "354945774057",
  appId: "1:354945774057:web:57c3229822eb4847af1b78"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const database = getDatabase(app);

export default app;
