// ===== Firebase Setup =====
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL }
  from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js';

const firebaseConfig = {
  apiKey: "AIzaSyCN9_jqhNxErudZrPbeQJmAwzZPe54i6UM",
  authDomain: "microjef-30443.firebaseapp.com",
  projectId: "microjef-30443",
  storageBucket: "microjef-30443.firebasestorage.app",
  messagingSenderId: "636289733336",
  appId: "1:636289733336:web:fe96bf758e5847568a7dad",
  measurementId: "G-XP49MHNR7L"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

// ===== DOM References =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Gate
const jefImg = $('#jef-img');
const passwordPrompt = $('#password-prompt');
const passwordInput = $('#password-input');
const passwordBtn = $('#password-btn');
const passwordError = $('#password-error');
const agePrompt = $('#age-prompt');
const ageYes = $('#age-yes');
const ageNo = $('#age-no');

// Main grid
const tilesGrid = $('#tiles-grid');
const createBtn = $('#create-btn');

// Create form
const entryForm = $('#entry-form');
const entryTitle = $('#entry-title');
const entryBody = $('#entry-body');
const entryAuthor = $('#entry-author');
const entryImage = $('#entry-image');
const imagePreview = $('#image-preview');
const previewImg = $('#preview-img');
const removeImageBtn = $('#remove-image');
const submitBtn = $('#submit-btn');
const uploadProgress = $('#upload-progress');
const progressBar = $('#progress-bar');

// Detail overlay
const detailOverlay = $('#detail-overlay');
const closeDetail = $('#close-detail');
const detailTitle = $('#detail-title');
const detailAuthor = $('#detail-author');
const detailImage = $('#detail-image');
const detailImageContainer = $('#detail-image-container');
const detailBody = $('#detail-body');
const backToGrid = $('#back-to-grid');

// ===== View Navigation =====
function showView(viewId) {
  $$('.view').forEach(v => v.classList.remove('active'));
  $(viewId).classList.add('active');
  window.scrollTo(0, 0);
}

// ===== Gate Logic =====
const logoutBtn = $('#logout-btn');

window.addEventListener('DOMContentLoaded', () => {
  // Skip gate if already authenticated
  if (localStorage.getItem('microjef_auth')) {
    showView('#main');
    loadEntries();
    return;
  }

  setTimeout(() => {
    jefImg.classList.add('entrance');
  }, 500);

  jefImg.addEventListener('animationend', (e) => {
    if (e.animationName === 'jef-entrance') {
      jefImg.classList.remove('entrance');
      jefImg.classList.add('idle');
      passwordPrompt.classList.remove('hidden');
      passwordInput.focus();
    }

    if (e.animationName === 'jef-exit') {
      localStorage.setItem('microjef_auth', '1');
      showView('#main');
      loadEntries();
    }
  });
});

// Password check
passwordBtn.addEventListener('click', checkPassword);
passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') checkPassword();
});

function checkPassword() {
  const pw = passwordInput.value.trim().toLowerCase();
  if (pw === 'pussycat') {
    passwordPrompt.classList.add('hidden');
    agePrompt.classList.remove('hidden');
  } else {
    passwordError.classList.remove('hidden');
    passwordInput.value = '';
    passwordInput.focus();
    passwordInput.style.animation = 'shake 0.4s ease-out';
    passwordInput.addEventListener('animationend', () => {
      passwordInput.style.animation = '';
    }, { once: true });
  }
}

// Age verification
ageYes.addEventListener('click', () => {
  jefImg.classList.remove('idle');
  jefImg.classList.add('exit');
  agePrompt.classList.add('hidden');
});

ageNo.addEventListener('click', () => {
  window.location.href = 'https://www.pbskids.org/';
});

// Logout
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('microjef_auth');
  location.reload();
});

// ===== Load Entries =====
async function loadEntries() {
  tilesGrid.innerHTML = '';

  try {
    const q = query(collection(db, 'entries'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      tilesGrid.innerHTML = `
        <div id="empty-state">
          <span>No entries yet!</span>
          Hit the + button to be the first.
        </div>
      `;
      return;
    }

    let index = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const tile = createTileElement(doc.id, data);
      tile.style.animationDelay = `${index * 0.08}s`;
      tilesGrid.appendChild(tile);
      index++;
    });
  } catch (err) {
    console.error('Error loading entries:', err);
    tilesGrid.innerHTML = `
      <div id="empty-state">
        <span>Oops!</span>
        Couldn't load entries. Check your connection.
      </div>
    `;
  }
}

function createTileElement(id, data) {
  const tile = document.createElement('div');
  tile.className = 'tile';
  tile.dataset.id = id;

  let imageHTML = '';
  if (data.imageURL) {
    imageHTML = `<img class="tile-image" src="${escapeAttr(data.imageURL)}" alt="" loading="lazy">`;
  } else {
    imageHTML = '<div class="tile-no-image"></div>';
  }

  const snippet = data.body.length > 100 ? data.body.substring(0, 100) + '...' : data.body;

  tile.innerHTML = `
    ${imageHTML}
    <div class="tile-info">
      <div class="tile-title">${escapeHTML(data.title)}</div>
      <div class="tile-snippet">${escapeHTML(snippet)}</div>
      <div class="tile-author">by ${escapeHTML(data.author)}</div>
    </div>
  `;

  tile.addEventListener('click', () => openDetail(data));
  return tile;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ===== Detail View =====
function openDetail(data) {
  detailTitle.textContent = data.title;
  detailAuthor.textContent = `by ${data.author}`;
  detailBody.textContent = data.body;

  if (data.imageURL) {
    detailImage.src = data.imageURL;
    detailImageContainer.classList.remove('hidden');
  } else {
    detailImageContainer.classList.add('hidden');
  }

  detailOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

closeDetail.addEventListener('click', closeDetailView);
detailOverlay.addEventListener('click', (e) => {
  if (e.target === detailOverlay) closeDetailView();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !detailOverlay.classList.contains('hidden')) {
    closeDetailView();
  }
});

function closeDetailView() {
  detailOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

// ===== Create Entry =====
createBtn.addEventListener('click', () => showView('#create'));
backToGrid.addEventListener('click', () => {
  resetForm();
  showView('#main');
});

// Image preview
let selectedImageBlob = null;

entryImage.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  selectedImageBlob = await resizeImage(file, 1200, 0.7);
  previewImg.src = URL.createObjectURL(selectedImageBlob);
  imagePreview.classList.remove('hidden');
});

removeImageBtn.addEventListener('click', () => {
  selectedImageBlob = null;
  entryImage.value = '';
  imagePreview.classList.add('hidden');
});

// Form submit
entryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Posting...';

  try {
    let imageURL = null;

    if (selectedImageBlob) {
      imageURL = await uploadImage(selectedImageBlob);
    }

    await addDoc(collection(db, 'entries'), {
      title: entryTitle.value.trim(),
      body: entryBody.value.trim(),
      author: entryAuthor.value.trim(),
      imageURL: imageURL,
      createdAt: serverTimestamp()
    });

    resetForm();
    showView('#main');
    loadEntries();
  } catch (err) {
    console.error('Error creating entry:', err);
    alert('Something went wrong. Try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Post It';
  }
});

function resetForm() {
  entryForm.reset();
  selectedImageBlob = null;
  imagePreview.classList.add('hidden');
  uploadProgress.classList.add('hidden');
  progressBar.style.width = '0%';
}

// ===== Image Upload =====
function uploadImage(blob) {
  return new Promise((resolve, reject) => {
    const filename = `entries/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const storageRef = ref(storage, filename);
    const uploadTask = uploadBytesResumable(storageRef, blob);

    uploadProgress.classList.remove('hidden');

    uploadTask.on('state_changed',
      (snapshot) => {
        const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        progressBar.style.width = pct + '%';
      },
      (error) => {
        uploadProgress.classList.add('hidden');
        reject(error);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        uploadProgress.classList.add('hidden');
        resolve(url);
      }
    );
  });
}

// ===== Image Resize Utility =====
function resizeImage(file, maxWidth, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    img.src = URL.createObjectURL(file);
  });
}
