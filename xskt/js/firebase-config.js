// ============================================================
// firebase-config.js – Khởi tạo Firebase (ES Module, CDN)
// ============================================================
import { initializeApp }        from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getFirestore }         from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getAuth }              from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const firebaseConfig = {
  apiKey:            "AIzaSyAMRhfJ1Wc0FKhTiqDBknTqhL7E7Gd3XLw",
  authDomain:        "nhapdulieu-221a7.firebaseapp.com",
  projectId:         "nhapdulieu-221a7",
  storageBucket:     "nhapdulieu-221a7.firebasestorage.app",
  messagingSenderId: "992088324206",
  appId:             "1:992088324206:web:0cef057a5a0a581cadce7f",
  measurementId:     "G-J6C73S5NT6"
};

const app = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);
export default app;
