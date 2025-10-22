// js/firebase-config.js

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD-eVswb9ZtRl3nMuHXBTyfKMDsiAWiZKg",
  authDomain: "projek-servis-jubah.firebaseapp.com",
  projectId: "projek-servis-jubah",
  storageBucket: "projek-servis-jubah.firebasestorage.app",
  messagingSenderId: "451948492185",
  appId: "1:451948492185:web:4eec944a220444a3474f08"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Inisialkan db untuk digunakan oleh script.js
// Pastikan anda telah memuatkan <script src=".../firebase-firestore.js"></script> SEBELUM fail ini.
const db = firebase.firestore();