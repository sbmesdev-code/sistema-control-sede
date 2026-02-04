// Import functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: REMPLAZA LUEGO CON TU CONFIGURACIÓN REAL
// 1. Ve a console.firebase.google.com
// 2. Crea un proyecto
// 3. Agrega una Web App (icono </>)
// 4. Copia el objeto firebaseConfig y pégalo abajo
const firebaseConfig = {
    apiKey: "AIzaSyB73yZp1H-MAUCaxIlLIrItOB3REc0slrE",
    authDomain: "sistema-sede.firebaseapp.com",
    projectId: "sistema-sede",
    storageBucket: "sistema-sede.firebasestorage.app",
    messagingSenderId: "767667469459",
    appId: "1:767667469459:web:19feac8ebd664ea57ee166"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
