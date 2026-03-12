// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAxA1J7VskFBv0hu1pZCQuk52AvUQGDPn0",
  authDomain: "titilove-f91d4.firebaseapp.com",
  projectId: "titilove-f91d4",
  storageBucket: "titilove-f91d4.firebasestorage.app",
  messagingSenderId: "647091408364",
  appId: "1:647091408364:web:5f822f61ee3173206d84c9",
  measurementId: "G-66PJ37CENT"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Inicializar Firestore
export const db = getFirestore(app);  // ✅ IMPORTANTE: exportar db