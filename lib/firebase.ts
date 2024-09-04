// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // If you're using Firestore

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBUAJUOFZ8DaYiMTULz-IdblJhgCA0J9q4",
  authDomain: "flashyai-9bb97.firebaseapp.com",
  projectId: "flashyai-9bb97",
  storageBucket: "flashyai-9bb97.appspot.com",
  messagingSenderId: "31962754096",
  appId: "1:31962754096:web:3716c7ec185be1106f91f5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // If you're using Firestore

export { db };
