/**
 * app.js — Main application entry point (ES Module)
 * XSKT Lô Tô Nam Định
 */

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { signIn, signOut, registerUser, getUserProfile, ROLES } from './auth.js';
import { initRouter, navigate } from './router.js?v=20261018_FINAL_FIX';
import { formatDate, formatDateDisplay, getCurrentTime, today, showToast } from './utils.js';

// ─────────────────────────────────────────────────────────
// MODULE-LEVEL STATE
// ─────────────────────────────────────────────────────────
export let currentUser    = null;
export let currentProfile = null;
export let currentNgay    = sessionStorage.getItem('xskt_ngay') || new Date().toISOString().slice(0, 10);

let _clockInterval = null;

// ─────────────────────────────────────────────────────────
// DOM REFERENCES
// ─────────────────────────────────────────────────────────
const $loadingOverlay  = document.getElementById('loading-overlay');
const $loginScreen     = document.getElementById('login-screen');
const $appShell        = document.getElementById('app-shell');
const $loginForm       = document.getElementById('login-form');
const $loginEmail      = document.getElementById('login-email');
const $loginPassword   = document.getElementById('login-password');
const $loginError      = document.getElementById('login-error');
const $loginBtnText    = document.getElementById('login-btn-text');
const $loginBtnSpinner = document.getElementById('login-btn-spinner');
const $togglePassword  = document.getElementById('toggle-password');
const $clock           = document.getElementById('clock');

// Info bar
const $infoMaMay  = document.getElementById('info-ma-may');
const $infoNgay   = document.getElementById('info-ngay');
const $infoMaDl   = document.getElementById('info-ma-dl');
const $infoTenDl  = document.getElementById('info-ten-dl');
const $infoToSo   = document.getElementById('info-to-so');

// Date modal
const $dateModal      = document.getElementById('date-modal');
const $datePicker     = document.getElementById('date-picker-input');
const $dateConfirmBtn = document.getElementById('date-confirm-btn');
const $dateCancelBtn  = document.getElementById('date-cancel-btn');

// Sidebar & bottom toolbar
const $logoutBtn       = document.getElementById('logout-btn');
const $logoutBottomBtn = document.getElementById('logout-bottom-btn');
const $sidebarNav      = document.getElementById('sidebar-nav');

// ─────────────────────────────────────────────────────────
// LOADING HELPERS
// ─────────────────────────────────────────────────────────
function showLoading() { $loadingOverlay.classList.remove('hidden'); }
function hideLoading() { $loadingOverlay.classList.add('hidden'); }

// ─────────────────────────────────────────────────────────
// CLOCK
// ─────────────────────────────────────────────────────────
function startClock() {
  if (_clockInterval) clearInterval(_clockInterval);
  const tick = () => {
    if ($clock) $clock.textContent = getCurrentTime();
  };
  tick();
  _clockInterval = setInterval(tick, 1000);
}

function stopClock() {
  if (_clockInterval) { clearInterval(_clockInterval); _clockInterval = null; }
}

// ─────────────────────────────────────────────────────────
// INFO BAR
// ─────────────────────────────────────────────────────────
export function updateInfoBar({ maMay, maDL, tenDL, toSo } = {}) {
  if ($infoMaMay) $infoMaMay.textContent = maMay  || currentProfile?.maMay  || '—';
  if ($infoNgay)  $infoNgay.textContent  = currentNgay ? formatDateDisplay(currentNgay) : '—';
  if ($infoMaDl)  $infoMaDl.textContent  = maDL   || currentProfile?.maDL   || '—';
  if ($infoTenDl) $infoTenDl.textContent = tenDL  || currentProfile?.tenDL  || '—';
  if ($infoToSo)  $infoToSo.textContent  = toSo   || currentProfile?.toSo   || '—';
}

// ─────────────────────────────────────────────────────────
// SIDEBAR — active highlight & admin visibility
// ─────────────────────────────────────────────────────────
export function syncSidebarActive(hash) {
  const items = $sidebarNav ? $sidebarNav.querySelectorAll('.nav-item[data-route]') : [];
  items.forEach(li => {
    const route = li.getAttribute('data-route');
    li.classList.toggle('active', route === hash);
  });
}

function applySidebarRoles(profile) {
  const adminItems = document.querySelectorAll('.admin-only');
  const isAdmin = profile?.role === ROLES.ADMIN || profile?.role === ROLES.SUPER;
  adminItems.forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });
}

// ─────────────────────────────────────────────────────────
// DATE MODAL
// ─────────────────────────────────────────────────────────
function openDateModal() {
  $datePicker.value = (typeof currentNgay === 'string' && currentNgay.length === 10)
    ? currentNgay
    : new Date().toISOString().slice(0, 10);
  $dateModal.classList.remove('hidden');
  $datePicker.focus();
}

function closeDateModal() {
  $dateModal.classList.add('hidden');
}

$dateConfirmBtn.addEventListener('click', () => {
  const chosen = $datePicker.value;
  if (!chosen) {
    showToast('Vui lòng chọn ngày mở thưởng.', 'warning');
    return;
  }
  currentNgay = chosen;
  sessionStorage.setItem('xskt_ngay', chosen);
  closeDateModal();
  updateInfoBar();
  navigate('#/dashboard');
  showToast(`Đã chọn ngày: ${formatDateDisplay(chosen)}`, 'success');
});

$dateCancelBtn.addEventListener('click', closeDateModal);

// Close modal when clicking the backdrop
$dateModal.addEventListener('click', (e) => {
  if (e.target === $dateModal) closeDateModal();
});

// ─────────────────────────────────────────────────────────
// PASSWORD TOGGLE
// ─────────────────────────────────────────────────────────
if ($togglePassword) {
  $togglePassword.addEventListener('click', () => {
    const isText = $loginPassword.type === 'text';
    $loginPassword.type = isText ? 'password' : 'text';
    $togglePassword.textContent = isText ? '👁' : '🙈';
  });
}

// ─────────────────────────────────────────────────────────
// LOGIN FORM SUBMIT
// ─────────────────────────────────────────────────────────
$loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = $loginEmail.value.trim();
  const password = $loginPassword.value;

  if (!email || !password) {
    showLoginError('Vui lòng nhập đầy đủ email và mật khẩu.');
    return;
  }

  setLoginLoading(true);
  clearLoginError();

  try {
    await signIn(email, password);
    // onAuthStateChanged will handle the rest
    openDateModal();
  } catch (err) {
    setLoginLoading(false);
    const msg = mapAuthError(err.code);
    showLoginError(msg);
  }
});

// QUICK REGISTER BUTTON
const $btnQuickRegister = document.getElementById('btn-quick-register');
if ($btnQuickRegister) {
  $btnQuickRegister.addEventListener('click', async () => {
    const email = $loginEmail.value.trim();
    const password = $loginPassword.value;
    if (!email || !password) {
      showLoginError('Vui lòng nhập Email và Mật khẩu vào 2 ô trên trước khi nhấn Đăng ký.');
      return;
    }
    if (password.length < 6) {
      showLoginError('Mật khẩu Firebase yêu cầu tối thiểu 6 ký tự.');
      return;
    }

    setLoginLoading(true);
    clearLoginError();
    try {
      await registerUser(email, password, {
        displayName: 'Quản trị viên',
        role: ROLES.ADMIN,
        maMay: 'A00'
      });
      showToast('Đăng ký tài khoản Admin thành công!', 'success');
      openDateModal();
    } catch (err) {
      setLoginLoading(false);
      showLoginError(mapAuthError(err.code) || err.message);
    }
  });
}

function setLoginLoading(loading) {
  const btn = document.getElementById('login-btn');
  if (btn) btn.disabled = loading;
  $loginBtnText.textContent   = loading ? 'Đang đăng nhập...' : 'Đăng nhập';
  $loginBtnSpinner.classList.toggle('hidden', !loading);
}

function showLoginError(msg) {
  $loginError.textContent = msg;
  $loginError.classList.remove('hidden');
}

function clearLoginError() {
  $loginError.textContent = '';
  $loginError.classList.add('hidden');
}

function mapAuthError(code) {
  const map = {
    'auth/user-not-found':    'Tài khoản không tồn tại.',
    'auth/wrong-password':    'Mật khẩu không đúng.',
    'auth/invalid-email':     'Email không hợp lệ.',
    'auth/user-disabled':     'Tài khoản đã bị vô hiệu hóa.',
    'auth/too-many-requests': 'Quá nhiều lần thử. Vui lòng thử lại sau.',
    'auth/network-request-failed': 'Lỗi kết nối mạng.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
  };
  return map[code] || `Lỗi đăng nhập (${code}).`;
}

// ─────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────
async function handleLogout() {
  if (!confirm('Bạn có chắc muốn đăng xuất?')) return;
  stopClock();
  try {
    await signOut();
    sessionStorage.removeItem('xskt_ngay');
    currentNgay    = today();
    currentUser    = null;
    currentProfile = null;
  } catch (err) {
    showToast('Lỗi đăng xuất: ' + err.message, 'error');
  }
}

if ($logoutBtn)       $logoutBtn.addEventListener('click', handleLogout);
if ($logoutBottomBtn) $logoutBottomBtn.addEventListener('click', handleLogout);

// ─────────────────────────────────────────────────────────
// SIDEBAR NAV CLICKS
// ─────────────────────────────────────────────────────────
if ($sidebarNav) {
  $sidebarNav.addEventListener('click', (e) => {
    const li = e.target.closest('.nav-item[data-route]');
    if (!li) return;
    const route = li.getAttribute('data-route');
    navigate(route);
  });
}

// SIDEBAR COLLAPSE / EXPAND MANAGEMENT
const $sidebar = document.getElementById('sidebar');
const $btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const $sidebarEdgeTab = document.getElementById('sidebar-edge-tab');
const $btnCloseSidebar = document.getElementById('btn-close-sidebar');
const $btnPinSidebar = document.getElementById('btn-pin-sidebar');

// Khôi phục trạng thái thu gọn từ localStorage (mặc định mở trên desktop)
let isCollapsed = localStorage.getItem('xskt_sidebar_collapsed') === 'true';

function updateSidebarState() {
  if (!$sidebar) return;
  if (isCollapsed) {
    $sidebar.classList.add('collapsed');
    if ($btnPinSidebar) {
      $btnPinSidebar.style.color = '#90caf9';
      $btnPinSidebar.title = 'Mở rộng và Ghim Menu cố định';
    }
    const arrow = document.getElementById('edge-tab-arrow');
    if (arrow) arrow.textContent = '▶';
  } else {
    $sidebar.classList.remove('collapsed');
    if ($btnPinSidebar) {
      $btnPinSidebar.style.color = '#ffeb3b';
      $btnPinSidebar.title = 'Menu đang mở cố định bên cạnh bảng';
    }
    const arrow = document.getElementById('edge-tab-arrow');
    if (arrow) arrow.textContent = '◀';
  }
  localStorage.setItem('xskt_sidebar_collapsed', isCollapsed ? 'true' : 'false');
}

// Khởi chạy trạng thái ban đầu
updateSidebarState();

// Bấm nút ☰ MENU trên thanh tiêu đề
$btnToggleSidebar?.addEventListener('click', () => {
  isCollapsed = !isCollapsed;
  updateSidebarState();
  showToast(isCollapsed ? 'Đã thu gọn Menu (toàn màn hình)' : 'Đã mở Menu', 'info', 2000);
});

// Bấm tab ở mép trái
$sidebarEdgeTab?.addEventListener('click', () => {
  isCollapsed = !isCollapsed;
  updateSidebarState();
});

// Bấm nút ◀ trên đầu sidebar
$btnCloseSidebar?.addEventListener('click', (e) => {
  e.stopPropagation();
  isCollapsed = true;
  updateSidebarState();
  showToast('Đã thu gọn Menu vào mép trái. Bấm ☰ MENU hoặc tab mép trái để mở lại.', 'info', 2500);
});

// Bấm nút Ghim 📌
$btnPinSidebar?.addEventListener('click', (e) => {
  e.stopPropagation();
  isCollapsed = !isCollapsed;
  updateSidebarState();
  showToast(isCollapsed ? 'Đã thu gọn Menu' : '📌 Menu được mở cố định bên cạnh nội dung', 'info', 2000);
});

// Phím tắt Ctrl+M để đóng/mở menu nhanh
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && (e.key === 'm' || e.key === 'M')) {
    e.preventDefault();
    isCollapsed = !isCollapsed;
    updateSidebarState();
  }
});

// BOTTOM TOOLBAR
const $bottomToolbar = document.getElementById('bottom-toolbar');
if ($bottomToolbar) {
  $bottomToolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('.toolbar-btn[data-route]');
    if (!btn) return;
    navigate(btn.getAttribute('data-route'));
  });
}

// ─────────────────────────────────────────────────────────
// AUTH STATE LISTENER
// ─────────────────────────────────────────────────────────
showLoading();

onAuthStateChanged(auth, async (user) => {
  setLoginLoading(false);

  if (user) {
    currentUser = user;

    try {
      currentProfile = await getUserProfile(user.uid);
    } catch (err) {
      console.warn('Could not load user profile:', err);
      currentProfile = { displayName: user.email, role: ROLES.USER };
    }

    // Show app, hide login
    $loginScreen.classList.add('hidden');
    $appShell.classList.remove('hidden');

    // Update info bar
    updateInfoBar();

    // Apply role-based visibility
    applySidebarRoles(currentProfile);

    // Start clock
    startClock();

    // Init router (handles URL hash routing)
    initRouter({
      onNavigate: (hash) => syncSidebarActive(hash),
    });

    // If no ngay selected yet, open date picker
    const savedNgay = sessionStorage.getItem('xskt_ngay');
    if (!savedNgay) {
      openDateModal();
    } else {
      navigate(window.location.hash || '#/dashboard');
    }

  } else {
    // Not logged in
    currentUser    = null;
    currentProfile = null;
    stopClock();

    $appShell.classList.add('hidden');
    $loginScreen.classList.remove('hidden');
    closeDateModal();
  }

  hideLoading();
});
