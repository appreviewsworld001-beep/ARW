// 🔥 YOUR FIREBASE CONFIG - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyBeWSt0-J-i23SeXFD5Gg9z5QNhI-Qn7Pk",
    authDomain: "arw-comment-generator.firebaseapp.com",
    projectId: "arw-comment-generator",
    storageBucket: "arw-comment-generator.firebasestorage.app",
    messagingSenderId: "91084347519",
    appId: "1:91084347519:web:b23c5b5879191a0add074a"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
// const messaging = firebase.messaging();

// Global Variables
let currentUserPin = null;
let pendingAction = null;
let appsData = {};
let cooldownEndTime = null;
let generatedCommentsCache = [];

// 🎯 INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
    showLoader(true);
    
    try {
        // Check and initialize database if empty
        await initializeDatabase();
        
        // Load all data
        await loadApps();
        await loadSettings();
        await checkMaintenanceMode();
        setupCooldownTimer();
        requestNotificationPermission();
        
        showLoader(false);
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Error initializing app. Check console for details.');
        showLoader(false);
    }
});

// 🔄 DATABASE INITIALIZATION
async function initializeDatabase() {
    const settingsDoc = await db.collection('settings').doc('config').get();
    
    if (!settingsDoc.exists) {
        console.log('First run detected. Setting up database...');
        
        // Create settings
        await db.collection('settings').doc('config').set({
            adminPin: '1234',
            bulkPin: '0000',
            maintenanceMode: false,
            createdAt: new Date()
        });

        // Create sample apps
        const sampleApps = ['TikTok', 'Instagram', 'YouTube', 'Facebook', 'Twitter'];
        for (const appName of sampleApps) {
            await db.collection('apps').doc(appName).set({ name: appName });
        }

        // Create sample comments for each app
        const sampleComments = {
            'TikTok': [
                'This is fire! 🔥 Love your content!',
                'Best video ever, keep it up!',
                'Can you do a tutorial on this?',
                'Wow, amazing editing skills!',
                'This made my day! 😊'
            ],
            'Instagram': [
                'Stunning shot! 📸',
                'Goals! 🔥',
                'Love this aesthetic!',
                'Beautiful! Who took this?',
                'Absolutely gorgeous!'
            ],
            'YouTube': [
                'Great video, subscribed!',
                'Very informative, thanks!',
                'Can you make more content like this?',
                'Liked and subscribed! 🔔',
                'This deserves more views!'
            ]
        };

        for (const [appName, comments] of Object.entries(sampleComments)) {
            for (const comment of comments) {
                await db.collection('comments').add({
                    appId: appName,
                    text: comment,
                    createdAt: new Date()
                });
            }
        }

        // Create sample live names
        const sampleNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley'];
        for (const name of sampleNames) {
            await db.collection('liveNames').add({
                appId: 'TikTok',
                name: name,
                createdAt: new Date()
            });
        }

        console.log('Database setup complete!');
    }
}

// 📱 LOAD APPS
async function loadApps() {
    const snapshot = await db.collection('apps').get();
    appsData = {};
    
    const homeSelect = document.getElementById('home-app-select');
    const bulkSelect = document.getElementById('bulk-app-select');
    const ssSelect = document.getElementById('ss-app-select');
    const lnSelect = document.getElementById('ln-app-select');
    const adminCommentSelect = document.getElementById('admin-comment-app-select');
    const adminNameSelect = document.getElementById('admin-name-app-select');
    
    const selects = [homeSelect, bulkSelect, ssSelect, lnSelect, adminCommentSelect, adminNameSelect];
    
    selects.forEach(select => {
        select.innerHTML = '<option value="">Select App</option>';
    });

    snapshot.forEach(doc => {
        const appName = doc.id;
        appsData[appName] = doc.data();
        
        selects.forEach(select => {
            const option = document.createElement('option');
                        option.value = appName;
            option.textContent = appName;
            select.appendChild(option);
        });
    });

    // Update admin apps list
    const adminAppsList = document.getElementById('admin-apps-list');
    adminAppsList.innerHTML = '';
    snapshot.forEach(doc => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${doc.id}</span> <button class="btn-secondary" onclick="deleteApp('${doc.id}')" style="padding: 5px 10px; font-size: 0.8rem;">Delete</button>`;
        adminAppsList.appendChild(li);
    });
}

// ⚙️ LOAD SETTINGS
async function loadSettings() {
    const doc = await db.collection('settings').doc('config').get();
    if (doc.exists) {
        const data = doc.data();
        document.getElementById('setting-admin-pin').value = data.adminPin;
        document.getElementById('setting-bulk-pin').value = data.bulkPin;
        document.getElementById('setting-maint').value = data.maintenanceMode.toString();
    }
}

// 🔒 MAINTENANCE MODE
async function checkMaintenanceMode() {
    const doc = await db.collection('settings').doc('config').get();
    if (doc.exists && doc.data().maintenanceMode) {
        document.getElementById('maintenance-overlay').style.display = 'flex';
        document.querySelector('.navbar').style.display = 'none';
    } else {
        document.getElementById('maintenance-overlay').style.display = 'none';
        document.querySelector('.navbar').style.display = 'flex';
    }
}

// ⏱️ COOLDOWN TIMER
function setupCooldownTimer() {
    const storedEndTime = localStorage.getItem('cooldownEndTime');
    if (storedEndTime) {
        cooldownEndTime = parseInt(storedEndTime);
        updateCooldownDisplay();
        setInterval(updateCooldownDisplay, 1000);
    }
}

function updateCooldownDisplay() {
    const now = Date.now();
    const remaining = Math.ceil((cooldownEndTime - now) / 1000);
    
    const genBtn = document.getElementById('gen-btn');
    const cooldownMsg = document.getElementById('cooldown-msg');
    const timerSpan = document.getElementById('timer');
    
    if (remaining > 0) {
        genBtn.disabled = true;
        genBtn.style.opacity = '0.5';
        cooldownMsg.style.display = 'block';
        timerSpan.textContent = remaining;
    } else {
        genBtn.disabled = false;
        genBtn.style.opacity = '1';
        cooldownMsg.style.display = 'none';
        localStorage.removeItem('cooldownEndTime');
    }
}

function startCooldown() {
    cooldownEndTime = Date.now() + 60000; // 60 seconds
    localStorage.setItem('cooldownEndTime', cooldownEndTime.toString());
    updateCooldownDisplay();
}

// 💬 GENERATE COMMENT
async function generateComment() {
    const appName = document.getElementById('home-app-select').value;
    if (!appName) {
        showNotification('Please select an app first!', 'error');
        return;
    }

    // Get all comments for this app
    const snapshot = await db.collection('comments').where('appId', '==', appName).get();
    
    if (snapshot.empty) {
        showNotification('No comments available for this app!', 'error');
        return;
    }

    const comments = [];
    snapshot.forEach(doc => comments.push(doc.data().text));

    // Get random comment not in cache
    let availableComments = comments.filter(c => !generatedCommentsCache.includes(c));
    if (availableComments.length === 0) {
        generatedCommentsCache = []; // Reset cache
        availableComments = comments;
    }

    const randomIndex = Math.floor(Math.random() * availableComments.length);
    const selectedComment = availableComments[randomIndex];
    generatedCommentsCache.push(selectedComment);

    // Display result
    document.getElementById('comment-output').value = selectedComment;
    document.getElementById('result-box').style.display = 'block';
    
    // Start cooldown
    startCooldown();
}

// 📋 COPY COMMENT
function copyComment() {
    const comment = document.getElementById('comment-output').value;
    navigator.clipboard.writeText(comment).then(() => {
        showNotification('Comment copied to clipboard!', 'success');
    });
}

// 🔐 PIN SYSTEM
function checkPin(action) {
    pendingAction = action;
    const title = action === 'admin' ? 'Admin Access' : 'Bulk Generator';
    document.getElementById('modal-title').textContent = title;
    document.getElementById('pin-modal').classList.add('active');
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-error').style.display = 'none';
    document.getElementById('pin-input').focus();
}

function closeModal() {
    document.getElementById('pin-modal').classList.remove('active');
    pendingAction = null;
}

async function verifyPin() {
    const inputPin = document.getElementById('pin-input').value;
    const errorMsg = document.getElementById('pin-error');
    
    const doc = await db.collection('settings').doc('config').get();
    const settings = doc.data();
    
    
    
    if (pendingAction === "admin") {

  if (inputPin === settings.adminPin) {
    closeModal();
    showSection("admin");
  } else {
    errorMsg.textContent = "Incorrect Admin PIN!";
    errorMsg.style.display = "block";
  }

} else if (pendingAction === "bulk") {

  if (inputPin === settings.bulkPin) {
    closeModal();
    showSection("bulk");
  } else {
    errorMsg.textContent = "Incorrect Bulk PIN!";
    errorMsg.style.display = "block";
  }

}
}

// 📦 BULK GENERATOR
async function generateBulkComments() {
    const appName = document.getElementById('bulk-app-select').value;
    const count = parseInt(document.getElementById('bulk-count').value);
    
    if (!appName) {
        showNotification('Please select an app!', 'error');
        return;
    }

    const snapshot = await db.collection('comments').where('appId', '==', appName).get();
    if (snapshot.empty) {
        showNotification('No comments available!', 'error');
        return;
    }

    const allComments = [];
    snapshot.forEach(doc => allComments.push(doc.data().text));

    // Shuffle and pick unique comments
    const shuffled = allComments.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    const container = document.getElementById('bulk-results');
    container.innerHTML = '';

    selected.forEach((comment, index) => {
        const div = document.createElement('div');
        div.className = 'bulk-item';
        div.innerHTML = `
            <p>${index + 1}. ${comment}</p>
            <button class="btn-secondary" onclick="copyText('${comment.replace(/'/g, "\\'")}')" style="padding: 5px 10px; font-size: 0.8rem;">
                <i class="fas fa-copy"></i>
            </button>
        `;
        container.appendChild(div);
    });
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied!', 'success');
    });
}

// 📸 SCREENSHOT UPLOAD
async function uploadScreenshot() {
    const appName = document.getElementById('ss-app-select').value;
    const fileInput = document.getElementById('ss-file');
    const status = document.getElementById('ss-status');
    
    if (!appName) {
        showNotification('Please select an app!', 'error');
        return;
    }
    
    if (!fileInput.files[0]) {
        showNotification('Please select an image!', 'error');
        return;
    }

    status.textContent = 'Uploading...';
    status.style.color = 'var(--primary)';

    try {
        const file = fileInput.files[0];
        const fileName = `${appName}_${Date.now()}_${file.name}`;
        const storageRef = storage.ref(`screenshots/${fileName}`);
        
        await storageRef.put(file);
        const downloadURL = await storageRef.getDownloadURL();

        await db.collection('screenshots').add({
            appId: appName,
            imageURL: downloadURL,
            timestamp: new Date()
        });

        status.textContent = 'Upload successful!';
        status.style.color = 'var(--success)';
        fileInput.value = '';
        
        showNotification('Screenshot uploaded successfully!', 'success');
    } catch (error) {
        console.error('Upload error:', error);
        status.textContent = 'Upload failed!';
        status.style.color = 'var(--danger)';
    }
}

// 👥 LIVE NAMES
async function loadLiveNames() {
    const appName = document.getElementById('ln-app-select').value;
    const container = document.getElementById('names-list');
    container.innerHTML = '';

    if (!appName) return;

    const snapshot = await db.collection('liveNames').where('appId', '==', appName).get();
    
    if (snapshot.empty) {
        container.innerHTML = '<p>No names found for this app.</p>';
        return;
    }

    snapshot.forEach(doc => {
        const div = document.createElement('div');
        div.className = 'name-card';
        div.textContent = doc.data().name;
        div.onclick = () => {
            navigator.clipboard.writeText(doc.data().name);
            showNotification('Name copied!', 'success');
        };
        container.appendChild(div);
    });
}

// 👨‍💼 ADMIN FUNCTIONS
async function addApp() {
    const name = document.getElementById('new-app-name').value.trim();
    if (!name) {
        showNotification('Please enter app name!', 'error');
        return;
    }

    await db.collection('apps').doc(name).set({ name: name });
    document.getElementById('new-app-name').value = '';
    await loadApps();
    showNotification('App added successfully!', 'success');
}

async function deleteApp(appName) {
    if (confirm(`Delete ${appName}?`)) {
        await db.collection('apps').doc(appName).delete();
        await loadApps();
        showNotification('App deleted!', 'success');
    }
}

async function addComment() {
    const appName = document.getElementById('admin-comment-app-select').value;
    const text = document.getElementById('new-comment-text').value.trim();
    
    if (!appName || !text) {
        showNotification('Please fill all fields!', 'error');
        return;
    }

    await db.collection('comments').add({
        appId: appName,
        text: text,
        createdAt: new Date()
    });

    document.getElementById('new-comment-text').value = '';
    showNotification('Comment added!', 'success');
}

async function addName() {
    const appName = document.getElementById('admin-name-app-select').value;
    const name = document.getElementById('new-name-text').value.trim();
    
    if (!appName || !name) {
        showNotification('Please fill all fields!', 'error');
        return;
    }

    await db.collection('liveNames').add({
        appId: appName,
        name: name,
        createdAt: new Date()
    });

    document.getElementById('new-name-text').value = '';
    showNotification('Name added!', 'success');
}

async function saveSettings() {
    const adminPin = document.getElementById('setting-admin-pin').value;
    const bulkPin = document.getElementById('setting-bulk-pin').value;
    const maintMode = document.getElementById('setting-maint').value === 'true';

    await db.collection('settings').doc('config').update({
        adminPin: adminPin,
        bulkPin: bulkPin,
        maintenanceMode: maintMode
    });

    await checkMaintenanceMode();
    showNotification('Settings saved!', 'success');
}

// 📑 TABS
function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).style.display = 'block';
    event.target.classList.add('active');
}

// 🔔 NOTIFICATIONS
function requestNotificationPermission() {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            messaging.getToken().then(token => {
                console.log('FCM Token:', token);
            });
        }
    });
}

function showNotifications() {
    const modal = document.getElementById('notif-modal');
    const list = document.getElementById('notif-list');
    list.innerHTML = '<p>Loading...</p>';
    modal.classList.add('active');
    
    db.collection('notifications').orderBy('timestamp', 'desc').limit(10).get().then(snapshot => {
        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<p>No notifications.</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.style.padding = '10px';
            div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            div.innerHTML = `
                <p>${data.message}</p>
                <small style="color: var(--text-light)">${data.timestamp.toDate().toLocaleString()}</small>
            `;
            list.appendChild(div);
        });
    });
}

function closeNotifModal(e) {
    if (e.target.id === 'notif-modal') {
        document.getElementById('notif-modal').classList.remove('active');
    }
}

function showNotification(message, type = 'info') {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? 'var(--danger)' : 'var(--success)'};
        color: white;
        padding: 15px 30px;
        border-radius: 10px;
        box-shadow: var(--shadow);
        z-index: 4000;
        animation: slideUp 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 🎨 UI FUNCTIONS
function showSection(sectionId) {
    document.querySelectorAll('section').forEach(s => s.classList.remove('active-section'));
    document.getElementById(sectionId).classList.add('active-section');
    
    // Close mobile menu
    document.querySelector('.nav-list').classList.remove('active');
}

function showLoader(show) {
    const loader = document.getElementById('loader');
    if (show) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

// 🌙 DARK MODE
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const icon = document.querySelector('#theme-toggle i');
    if (document.body.classList.contains('dark-mode')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
});

// 🍔 MOBILE MENU
document.getElementById('mobile-menu').addEventListener('click', () => {
    document.querySelector('.nav-list').classList.toggle('active');
});

// 🔄 REAL-TIME LISTENERS
db.collection('settings').doc('config').onSnapshot(() => {
    checkMaintenanceMode();
    loadSettings();
});

db.collection('notifications').onSnapshot(snapshot => {
    document.getElementById('notif-count').textContent = snapshot.size;
});

// ⌨️ ENTER KEY SUPPORT
document.getElementById('pin-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') verifyPin();
});

// Handle Enter key for modals
document.querySelectorAll('.modal-card input').forEach(input => {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyPin();
    });

});
