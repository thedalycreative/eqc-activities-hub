import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAbnnEv2VI0ApqviiqrSB2QYmj0lkDtQ2w",
  authDomain: "eqc-26b-yearbook.firebaseapp.com",
  databaseURL: "https://eqc-26b-yearbook-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "eqc-26b-yearbook",
  storageBucket: "eqc-26b-yearbook.firebasestorage.app",
  messagingSenderId: "456073643885",
  appId: "1:456073643885:web:8cee09be079d4b1e0ebc64"
};

const app = initializeApp(firebaseConfig, "eqc-activities");
const db = getDatabase(app);

export const paths = {
  yearbook: "eqcActivities/yearbook/tiles",
  truths: "eqcActivities/truths",
  slot: "eqcActivities/slot/names",
  emoji: "eqcActivities/emoji"
};

export const listen = (path, callback) => onValue(ref(db, path), snapshot => callback(snapshot.val() || {}));
export const write = (path, value) => set(ref(db, path), value);
export const updateAt = (path, value) => update(ref(db, path), value);
export const removeAt = path => remove(ref(db, path));
export const id = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

