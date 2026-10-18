/**
 * router.js - Hash-based SPA Router
 * XSKT Lô Tô Management System
 *
 * No Firebase imports — pure routing logic.
 */

// ---------------------------------------------------------------------------
// Route registry
// Each value is an async factory that returns a page module with render().
// ---------------------------------------------------------------------------

const getV = () => Date.now();
/** @type {Map<string, () => Promise<{ render: (el: HTMLElement) => void|Promise<void> }>>} */
export const routes = new Map([
  ['#/login',         () => import(`./pages/login.js?v=${getV()}`)],
  ['#/dashboard',     () => import(`./pages/dashboard.js?v=${getV()}`)],
  ['#/danhmuc',       () => import(`./pages/danhmuc.js?v=${getV()}`)],
  ['#/kymotuong',     () => import(`./pages/kymotuong.js?v=${getV()}`)],
  ['#/ketqua',        () => import(`./pages/ketqua.js?v=${getV()}`)],
  ['#/nhaploto-don',  () => import(`./pages/nhaploto-don.js?v=${getV()}`)],
  ['#/nhaploto-cap',  () => import(`./pages/nhaploto-cap.js?v=${getV()}`)],
  ['#/baocao',        () => import(`./pages/baocao.js?v=${getV()}`)],
  ['#/cauhinh',       () => import(`./pages/cauhinh.js?v=${getV()}`)],
]);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** @type {string} */
let currentRoute = '';
let currentModule = null;

/**
 * beforeEach hook — set this to a function that receives the target hash and
 * returns:
 *   - null / undefined  → allow navigation
 *   - string            → redirect to that hash instead
 *   - false             → cancel navigation silently
 *
 * @type {((hash: string) => string | false | null | undefined | Promise<string | false | null | undefined>) | null}
 */
export let beforeEach = null;

/**
 * Register a global navigation guard.
 *
 * @param {(hash: string) => string | false | null | undefined | Promise<string | false | null | undefined>} fn
 */
export function setBeforeEach(fn) {
  beforeEach = fn;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** @returns {HTMLElement|null} */
function getMainContent() {
  return document.getElementById('main-content');
}

function showSpinner() {
  const el = getMainContent();
  if (!el) return;
  el.innerHTML = `
    <div class="router-loading" style="
        display:flex;
        align-items:center;
        justify-content:center;
        min-height:200px;
        flex-direction:column;
        gap:12px;
        color:#6c757d;">
      <div class="spinner-border text-primary" role="status" style="width:2.5rem;height:2.5rem;">
        <span class="visually-hidden">Đang tải...</span>
      </div>
      <span>Đang tải trang...</span>
    </div>`;
}

function show404(hash) {
  const el = getMainContent();
  if (!el) return;
  el.innerHTML = `
    <div style="
        display:flex;
        align-items:center;
        justify-content:center;
        min-height:300px;
        flex-direction:column;
        gap:16px;
        color:#6c757d;
        text-align:center;">
      <i class="bi bi-exclamation-triangle" style="font-size:3rem;color:#ffc107;"></i>
      <h4>404 – Không tìm thấy trang</h4>
      <p>Đường dẫn <code>${hash}</code> không tồn tại.</p>
      <a href="#/dashboard" class="btn btn-primary">Về Tổng quan</a>
    </div>`;
}

// ---------------------------------------------------------------------------
// Core navigation
// ---------------------------------------------------------------------------

/**
 * Navigate to a given hash, respecting the beforeEach guard.
 *
 * @param {string} [hash] - e.g. '#/dashboard'. Defaults to window.location.hash.
 * @returns {Promise<void>}
 */
export async function navigate(hash) {
  // Normalise: default to current hash, then to '#/login'
  hash = hash || window.location.hash || '#/login';
  if (!hash.startsWith('#/')) hash = '#/' + hash.replace(/^#?\/?/, '');

  // ── beforeEach guard ──────────────────────────────────────────────────────
  if (typeof beforeEach === 'function') {
    let result;
    try {
      result = await beforeEach(hash);
    } catch (err) {
      console.error('[router] beforeEach threw:', err);
    }

    if (result === false) {
      // Silent cancel — restore previous hash without re-triggering hashchange
      if (currentRoute && currentRoute !== hash) {
        history.replaceState(null, '', currentRoute);
      }
      return;
    }

    if (typeof result === 'string' && result !== hash) {
      // Redirect
      return navigate(result);
    }
  }

  // ── Resolve page module ────────────────────────────────────────────────────
  const loader = routes.get(hash);

  if (!loader) {
    currentRoute = hash;
    window.location.hash = hash;
    show404(hash);
    return;
  }

  // Update URL first (avoid double hashchange)
  if (window.location.hash !== hash) {
    history.pushState(null, '', hash);
  }
  currentRoute = hash;

  // Teardown previous module if it defined a destroy hook
  if (currentModule && typeof currentModule.destroy === 'function') {
    try {
      currentModule.destroy();
    } catch (destroyErr) {
      console.warn('[router] Error destroying previous module:', destroyErr);
    }
    currentModule = null;
  }

  // Show loading state
  showSpinner();

  try {
    const module = await loader();
    currentModule = module;

    const el = getMainContent();
    if (!el) {
      console.error('[router] #main-content element not found in DOM');
      return;
    }

    // Scroll to top on page change
    el.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (typeof module.render !== 'function') {
      console.error(`[router] Page module for "${hash}" must export a render() function.`);
      show404(hash);
      return;
    }

    const renderResult = await module.render(el);
    if (typeof renderResult === 'string') {
      el.innerHTML = renderResult;
    }

    if (typeof module.init === 'function') {
      await module.init(el);
    }
  } catch (err) {
    console.error(`[router] Failed to load module for "${hash}":`, err);
    const el = getMainContent();
    if (el) {
      el.innerHTML = `
        <div class="alert alert-danger m-4" role="alert">
          <strong>Lỗi tải trang:</strong> ${err.message || err}
        </div>`;
    }
  }
}

/**
 * Returns the hash of the currently active route.
 * @returns {string}
 */
export function getCurrentRoute() {
  return currentRoute;
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

/**
 * Initialise the router — call this once on app startup.
 * Attaches the hashchange listener and performs the initial navigation.
 */
export function initRouter(options = {}) {
  const onNav = typeof options?.onNavigate === 'function' ? options.onNavigate : null;

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash || '#/dashboard';
    if (onNav) onNav(hash);
    navigate(hash);
  });

  // Handle browser back/forward (pushState navigation)
  window.addEventListener('popstate', () => {
    const hash = window.location.hash || '#/dashboard';
    if (onNav) onNav(hash);
    navigate(hash);
  });

  // Initial load
  const initial = window.location.hash || '#/dashboard';
  if (onNav) onNav(initial);
  navigate(initial);
}
