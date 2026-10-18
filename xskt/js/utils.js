/**
 * utils.js - Pure Utility Functions
 * XSKT Lô Tô Management System
 *
 * No Firebase imports — zero external dependencies.
 */

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/**
 * Format a Date object to 'DD/MM/YYYY'.
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  if (typeof date === 'string') {
    if (date.includes('-')) {
      const [yyyy, mm, dd] = date.split('-');
      return `${dd}/${mm}/${yyyy}`;
    }
    return date;
  }
  if (!(date instanceof Date) || isNaN(date)) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDateDisplay(date) {
  return formatDate(date);
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parse a 'DD/MM/YYYY' string to a Date object (local time, midnight).
 *
 * @param {string} str
 * @returns {Date}
 */
export function parseDate(str) {
  if (!str || typeof str !== 'string') return new Date(NaN);
  const [dd, mm, yyyy] = str.split('/');
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

/**
 * Format a Date object to 'YYYYMMDD' — used as Firestore document keys.
 *
 * @param {Date} date
 * @returns {string}
 */
export function toDateKey(date) {
  if (!(date instanceof Date) || isNaN(date)) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${yyyy}${mm}${dd}`;
}

/**
 * Returns today's Date at midnight local time.
 *
 * @returns {Date}
 */
export function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the current time as 'HH:MM:SS'.
 *
 * @returns {string}
 */
export function getCurrentTime() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

// ---------------------------------------------------------------------------
// Number helpers
// ---------------------------------------------------------------------------

/**
 * Format a number with dot-separated thousands (Vietnamese convention).
 * e.g. 1000000 → '1.000.000'
 *
 * @param {number} n
 * @returns {string}
 */
export function formatCurrency(n) {
  if (n === null || n === undefined || isNaN(Number(n))) return '0';
  return Number(n)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Pad a number with leading zeros to a given length.
 * e.g. padZero(7, 3) → '007'
 *
 * @param {number} n
 * @param {number} len
 * @returns {string}
 */
export function padZero(n, len) {
  return String(n).padStart(len, '0');
}

// ---------------------------------------------------------------------------
// Array helpers
// ---------------------------------------------------------------------------

/**
 * Sum an array of objects by a numeric key.
 *
 * @param {object[]} arr
 * @param {string}   key
 * @returns {number}
 */
export function sumArray(arr, key) {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
}

// ---------------------------------------------------------------------------
// Function helpers
// ---------------------------------------------------------------------------

/**
 * Debounce a function — delays invocation until `delay` ms have elapsed
 * since the last call.
 *
 * @template {(...args: any[]) => any} T
 * @param {T}      fn
 * @param {number} delay - milliseconds
 * @returns {(...args: Parameters<T>) => void}
 */
export function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Deep-clone a plain object / array using structured clone (with JSON fallback).
 *
 * @template T
 * @param {T} obj
 * @returns {T}
 */
export function deepClone(obj) {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}

// ---------------------------------------------------------------------------
// Toast notifications
// ---------------------------------------------------------------------------

/** @type {HTMLElement|null} */
let toastContainer = null;

function getToastContainer() {
  if (toastContainer && document.body.contains(toastContainer)) {
    return toastContainer;
  }
  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  Object.assign(toastContainer.style, {
    position:      'fixed',
    top:           '20px',
    right:         '20px',
    zIndex:        '99999',
    display:       'flex',
    flexDirection: 'column',
    gap:           '8px',
    pointerEvents: 'none',
  });
  document.body.appendChild(toastContainer);
  return toastContainer;
}

const TOAST_COLORS = {
  success: { bg: '#198754', icon: '✓' },
  error:   { bg: '#dc3545', icon: '✕' },
  warning: { bg: '#ffc107', icon: '⚠' },
  info:    { bg: '#0dcaf0', icon: 'ℹ' },
};

let lastToastMsg = '';
let lastToastTime = 0;

export function showToast(message, type = 'success', duration = 3000) {
  const now = Date.now();
  if (message === lastToastMsg && now - lastToastTime < 1000) return;
  lastToastMsg = message;
  lastToastTime = now;

  const container = getToastContainer();
  const { bg, icon } = TOAST_COLORS[type] || TOAST_COLORS.info;

  const toast = document.createElement('div');
  Object.assign(toast.style, {
    background:   bg,
    color:        type === 'warning' ? '#212529' : '#fff',
    padding:      '12px 18px',
    borderRadius: '8px',
    boxShadow:    '0 4px 12px rgba(0,0,0,0.25)',
    fontSize:     '14px',
    maxWidth:     '320px',
    display:      'flex',
    alignItems:   'center',
    gap:          '10px',
    pointerEvents:'auto',
    opacity:      '0',
    transform:    'translateX(40px)',
    transition:   'opacity 0.25s ease, transform 0.25s ease',
  });

  toast.innerHTML = `<span style="font-weight:bold;font-size:16px;">${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });
  });

  // Auto-dismiss
  const dismiss = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  };

  const timer = setTimeout(dismiss, duration);

  // Click to dismiss early
  toast.addEventListener('click', () => {
    clearTimeout(timer);
    dismiss();
  });
}

// ---------------------------------------------------------------------------
// Full-screen loading overlay
// ---------------------------------------------------------------------------

let loadingOverlay = null;

function ensureLoadingOverlay() {
  // Prefer an existing overlay in the DOM (e.g. from HTML template)
  let el = document.getElementById('loading-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loading-overlay';
    Object.assign(el.style, {
      position:       'fixed',
      inset:          '0',
      zIndex:         '99998',
      background:     'rgba(255,255,255,0.75)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      flexDirection:  'column',
      gap:            '12px',
      backdropFilter: 'blur(2px)',
    });
    el.innerHTML = `
      <div style="
          width:48px;height:48px;
          border:5px solid #dee2e6;
          border-top-color:#0d6efd;
          border-radius:50%;
          animation:xskt-spin 0.7s linear infinite;">
      </div>
      <span style="color:#495057;font-size:14px;">Đang xử lý...</span>`;

    // Inject keyframe if not present
    if (!document.getElementById('xskt-spin-style')) {
      const style = document.createElement('style');
      style.id = 'xskt-spin-style';
      style.textContent = '@keyframes xskt-spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }

    document.body.appendChild(el);
  }
  loadingOverlay = el;
  return el;
}

/**
 * Show or hide the full-screen loading overlay.
 *
 * @param {boolean} [show=true]
 */
export function showLoading(show = true) {
  const el = ensureLoadingOverlay();
  el.style.display = show ? 'flex' : 'none';
}

// ---------------------------------------------------------------------------
// Custom confirm modal
// ---------------------------------------------------------------------------

/**
 * Show a custom confirm dialog.
 * Returns a Promise that resolves to true (confirmed) or false (cancelled).
 *
 * @param {string} message
 * @param {{ title?: string, confirmText?: string, cancelText?: string, type?: 'danger'|'warning'|'primary' }} [options]
 * @returns {Promise<boolean>}
 */
export function confirm(
  message,
  {
    title       = 'Xác nhận',
    confirmText = 'Xác nhận',
    cancelText  = 'Huỷ',
    type        = 'primary',
  } = {},
) {
  return new Promise(resolve => {
    // Backdrop
    const backdrop = document.createElement('div');
    Object.assign(backdrop.style, {
      position:   'fixed',
      inset:      '0',
      zIndex:     '99997',
      background: 'rgba(0,0,0,0.45)',
      display:    'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation:  'xskt-fade-in 0.15s ease',
    });

    // Inject fade-in keyframe once
    if (!document.getElementById('xskt-fadein-style')) {
      const s = document.createElement('style');
      s.id = 'xskt-fadein-style';
      s.textContent = '@keyframes xskt-fade-in { from { opacity:0; } to { opacity:1; } }';
      document.head.appendChild(s);
    }

    const btnClass = type === 'danger'  ? '#dc3545' :
                     type === 'warning' ? '#ffc107' : '#0d6efd';
    const btnText  = type === 'warning' ? '#212529' : '#fff';

    backdrop.innerHTML = `
      <div style="
          background:#fff;
          border-radius:12px;
          box-shadow:0 8px 32px rgba(0,0,0,0.25);
          max-width:420px;
          width:90%;
          padding:28px 24px 20px;
          font-family:inherit;">
        <h5 style="margin:0 0 12px;font-size:17px;font-weight:600;color:#212529;">${title}</h5>
        <p  style="margin:0 0 24px;font-size:14px;color:#495057;line-height:1.6;">${message}</p>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button id="_confirm-cancel" style="
              padding:8px 20px;border:1px solid #dee2e6;border-radius:6px;
              background:#fff;color:#495057;cursor:pointer;font-size:14px;">
            ${cancelText}
          </button>
          <button id="_confirm-ok" style="
              padding:8px 20px;border:none;border-radius:6px;
              background:${btnClass};color:${btnText};cursor:pointer;font-size:14px;font-weight:500;">
            ${confirmText}
          </button>
        </div>
      </div>`;

    document.body.appendChild(backdrop);

    const close = result => {
      backdrop.style.opacity = '0';
      backdrop.style.transition = 'opacity 0.15s ease';
      backdrop.addEventListener('transitionend', () => {
        backdrop.remove();
        resolve(result);
      }, { once: true });
    };

    backdrop.querySelector('#_confirm-ok').addEventListener('click',     () => close(true));
    backdrop.querySelector('#_confirm-cancel').addEventListener('click',  () => close(false));

    // Click outside modal content closes as false
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) close(false);
    });

    // ESC key
    const onKeyDown = e => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', onKeyDown);
        close(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
  });
}
