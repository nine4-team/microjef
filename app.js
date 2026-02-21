// ===== Firebase Setup =====
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc }
  from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL }
  from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js';
import { initializeAppCheck, ReCaptchaV3Provider }
  from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app-check.js';

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

// Use App Check debug mode on localhost
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

initializeAppCheck(firebaseApp, {
  provider: new ReCaptchaV3Provider('6LdJgHIsAAAAAGJzxrS5dFACwpCQw52WiNYuRVnl'),
  isTokenAutoRefreshEnabled: true
});
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
const imagePreviewList = $('#image-preview-list');
const submitBtn = $('#submit-btn');
const uploadProgress = $('#upload-progress');
const progressBar = $('#progress-bar');

// Detail overlay
const detailOverlay = $('#detail-overlay');
const closeDetail = $('#close-detail');
const detailTitle = $('#detail-title');
const detailAuthor = $('#detail-author');
const detailImagesGrid = $('#detail-images-grid');
const detailBody = $('#detail-body');

// Gallery lightbox
const galleryOverlay = $('#gallery-overlay');
const galleryClose = $('#gallery-close');
const galleryPrev = $('#gallery-prev');
const galleryNext = $('#gallery-next');
const galleryImgWrap = $('#gallery-img-wrap');
const galleryImg = $('#gallery-img');
const galleryCounter = $('#gallery-counter');
const editEntryBtn = $('#edit-entry-btn');
const deleteEntryBtn = $('#delete-entry-btn');
const backToGrid = $('#back-to-grid');
const formHeading = $('#form-heading');

// Editing state
let editingId = null;
let editingImageURLs = [];

// Gallery state
let galleryURLs = [];
let galleryIndex = 0;

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
// SHA-256 of the password (generate with: crypto.subtle or https://emn178.github.io/online-tools/sha256.html)
const PW_HASH = '02d32f28a881b6966e7fcfd58b6b261a0cc5f50fda0e43f637cb6f087bdf3ed8';

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

passwordBtn.addEventListener('click', checkPassword);
passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') checkPassword();
});

async function checkPassword() {
  const pw = passwordInput.value.trim().toLowerCase();
  const hash = await sha256(pw);
  if (hash === PW_HASH) {
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

  const imageCount = data.imageURLs ? data.imageURLs.length : (data.imageURL ? 1 : 0);
  const snippet = data.body.length > 100 ? data.body.substring(0, 100) + '...' : data.body;
  const badge = imageCount > 0 ? `<span class="tile-image-badge">\uD83D\uDCF7${imageCount > 1 ? ' ' + imageCount : ''}</span>` : '';

  tile.innerHTML = `
    <div class="tile-no-image"></div>
    <div class="tile-info">
      <div class="tile-title">${escapeHTML(data.title)}</div>
      <div class="tile-snippet">${escapeHTML(snippet)}</div>
      <div class="tile-author">by ${escapeHTML(data.author)}</div>
      ${badge}
    </div>
  `;

  tile.addEventListener('click', () => openDetail(id, data));
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
function openDetail(id, data) {
  detailTitle.textContent = data.title;
  detailAuthor.textContent = `by ${data.author}`;
  detailBody.textContent = data.body;

  const urls = data.imageURLs || (data.imageURL ? [data.imageURL] : []);
  detailImagesGrid.innerHTML = '';
  urls.forEach((url, i) => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.loading = 'lazy';
    img.addEventListener('click', () => openGallery(urls, i));
    detailImagesGrid.appendChild(img);
  });

  editEntryBtn.onclick = () => startEdit(id, data);
  deleteEntryBtn.onclick = () => confirmDelete(id);
  deleteEntryBtn.textContent = 'Delete';
  deleteEntryBtn.disabled = false;

  detailOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function startEdit(id, data) {
  editingId = id;
  editingImageURLs = data.imageURLs || (data.imageURL ? [data.imageURL] : []);

  entryTitle.value = data.title;
  entryBody.value = data.body;
  entryAuthor.value = data.author;

  renderPreviewList();

  formHeading.textContent = 'Edit Entry';
  submitBtn.textContent = 'Save Changes';

  closeDetailView();
  showView('#create');
}

async function confirmDelete(id) {
  if (!confirm('Delete this entry? This cannot be undone.')) return;
  deleteEntryBtn.disabled = true;
  deleteEntryBtn.textContent = 'Deleting...';
  try {
    await deleteDoc(doc(db, 'entries', id));
    closeDetailView();
    loadEntries();
  } catch (err) {
    console.error('Error deleting entry:', err);
    alert('Could not delete. Try again.');
    deleteEntryBtn.disabled = false;
    deleteEntryBtn.textContent = 'Delete';
  }
}

closeDetail.addEventListener('click', closeDetailView);
detailOverlay.addEventListener('click', (e) => {
  if (e.target === detailOverlay) closeDetailView();
});

document.addEventListener('keydown', (e) => {
  if (!galleryOverlay.classList.contains('hidden')) {
    if (e.key === 'Escape') { closeGallery(); return; }
    if (e.key === 'ArrowLeft') { galleryIndex = (galleryIndex - 1 + galleryURLs.length) % galleryURLs.length; updateGalleryView(); return; }
    if (e.key === 'ArrowRight') { galleryIndex = (galleryIndex + 1) % galleryURLs.length; updateGalleryView(); return; }
    return;
  }
  if (e.key === 'Escape' && !detailOverlay.classList.contains('hidden')) {
    closeDetailView();
  }
});

function closeDetailView() {
  closeGallery();
  detailOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

// ===== Gallery Lightbox =====
function openGallery(urls, index) {
  galleryURLs = urls;
  galleryIndex = index;
  updateGalleryView();
  galleryOverlay.classList.remove('hidden');
}

function closeGallery() {
  galleryOverlay.classList.add('hidden');
}

function updateGalleryView() {
  galleryImg.src = galleryURLs[galleryIndex];
  const multi = galleryURLs.length > 1;
  galleryCounter.textContent = multi ? `${galleryIndex + 1} / ${galleryURLs.length}` : '';
  galleryPrev.classList.toggle('hidden', !multi);
  galleryNext.classList.toggle('hidden', !multi);
}

galleryClose.addEventListener('click', closeGallery);
galleryOverlay.addEventListener('click', (e) => {
  if (e.target === galleryOverlay) closeGallery();
});
galleryImgWrap.addEventListener('click', (e) => {
  if (e.target === galleryImgWrap) closeGallery();
});
galleryPrev.addEventListener('click', () => {
  galleryIndex = (galleryIndex - 1 + galleryURLs.length) % galleryURLs.length;
  updateGalleryView();
});
galleryNext.addEventListener('click', () => {
  galleryIndex = (galleryIndex + 1) % galleryURLs.length;
  updateGalleryView();
});

// ===== Create Entry =====
createBtn.addEventListener('click', () => showView('#create'));
backToGrid.addEventListener('click', () => {
  resetForm();
  showView('#main');
});

// Image preview
let selectedImageBlobs = [];

entryImage.addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const blob = await resizeImage(file, 1200, 0.7);
    selectedImageBlobs.push(blob);
  }
  entryImage.value = '';
  renderPreviewList();
});

function renderPreviewList() {
  imagePreviewList.innerHTML = '';

  editingImageURLs.forEach((url, i) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.innerHTML = `<img src="${escapeAttr(url)}" alt=""><button type="button" class="remove-preview-btn">&times;</button>`;
    item.querySelector('.remove-preview-btn').addEventListener('click', () => {
      editingImageURLs.splice(i, 1);
      renderPreviewList();
    });
    imagePreviewList.appendChild(item);
  });

  selectedImageBlobs.forEach((blob, i) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    const objectURL = URL.createObjectURL(blob);
    item.innerHTML = `<img src="${objectURL}" alt=""><button type="button" class="remove-preview-btn">&times;</button>`;
    item.querySelector('.remove-preview-btn').addEventListener('click', () => {
      selectedImageBlobs.splice(i, 1);
      renderPreviewList();
    });
    imagePreviewList.appendChild(item);
  });
}

// Form submit
entryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = editingId ? 'Saving...' : 'Posting...';

  try {
    const newURLs = [];
    for (const blob of selectedImageBlobs) {
      newURLs.push(await uploadImage(blob));
    }
    const imageURLs = [...editingImageURLs, ...newURLs];

    if (editingId) {
      await updateDoc(doc(db, 'entries', editingId), {
        title: entryTitle.value.trim(),
        body: entryBody.value.trim(),
        author: entryAuthor.value.trim(),
        imageURLs,
      });
    } else {
      await addDoc(collection(db, 'entries'), {
        title: entryTitle.value.trim(),
        body: entryBody.value.trim(),
        author: entryAuthor.value.trim(),
        imageURLs,
        createdAt: serverTimestamp()
      });
    }

    resetForm();
    showView('#main');
    loadEntries();
  } catch (err) {
    console.error('Error saving entry:', err);
    alert('Something went wrong. Try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editingId ? 'Save Changes' : 'Post It';
  }
});

function resetForm() {
  entryForm.reset();
  selectedImageBlobs = [];
  editingId = null;
  editingImageURLs = [];
  imagePreviewList.innerHTML = '';
  uploadProgress.classList.add('hidden');
  progressBar.style.width = '0%';
  formHeading.textContent = 'New Entry';
  submitBtn.textContent = 'Post It';
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
