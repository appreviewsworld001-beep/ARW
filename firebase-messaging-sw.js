importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyBeWSt0-J-i23SeXFD5Gg9z5QNhI-Qn7Pk",
    authDomain: "arw-comment-generator.firebaseapp.com",
    projectId: "arw-comment-generator",
    storageBucket: "arw-comment-generator.firebasestorage.app",
    messagingSenderId: "91084347519",
    appId: "1:91084347519:web:b23c5b5879191a0add074a"
  };

// 🔥 YE LINE MISSING THI
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();