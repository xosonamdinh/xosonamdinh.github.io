/**
 * dashboard.js — Dashboard / Home page module
 * XSKT Lô Tô Nam Định
 */

import { db } from '../firebase-config.js';
import {
  collection, query, where, getDocs, doc, getDoc,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { navigate } from '../router.js?v=20261018_SYNC_ALL';

// We import state from app.js (lazy to avoid circular deps at parse time)
function getAppState() {
  // Dynamic import avoids circular at module load time
  return import('../app.js').then(m => ({
    currentNgay:    m.currentNgay,
    currentUser:    m.currentUser,
    currentProfile: m.currentProfile,
  }));
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

/** Load summary stats for the chosen date */
async function loadStats(ngay) {
  const stats = {
    soDaiLy:      0,
    trangThaiKy:  'Không xác định',
    kyId:         null,
  };

  if (!ngay) return stats;

  try {
    // Count distinct dai ly that entered data for this ngay
    const nhapRef = collection(db, 'nhatKyNhapLoto');
    const q = query(nhapRef, where('ngayMoThuong', '==', ngay));
    const snap = await getDocs(q);

    const daiLySet = new Set();
    snap.forEach(d => {
      const maDL = d.data().maDL;
      if (maDL) daiLySet.add(maDL);
    });
    stats.soDaiLy = daiLySet.size;

    // Check ky mo thuong status
    const kyRef = collection(db, 'kyMoThuong');
    const kyQ   = query(kyRef, where('ngay', '==', ngay));
    const kySnap = await getDocs(kyQ);
    if (!kySnap.empty) {
      const kyData = kySnap.docs[0].data();
      stats.kyId = kySnap.docs[0].id;
      if (kyData.daCoKetQua)  stats.trangThaiKy = 'Đã có kết quả';
      else if (kyData.daKhoa) stats.trangThaiKy = 'Đã khóa';
      else                    stats.trangThaiKy = 'Đang mở';
    }
  } catch (err) {
    console.warn('[dashboard] loadStats error:', err);
  }

  return stats;
}

/** Status badge HTML */
function statusBadge(status) {
  const map = {
    'Đang mở':        { cls: 'badge-open',    icon: '🟢' },
    'Đã khóa':        { cls: 'badge-locked',  icon: '🔒' },
    'Đã có kết quả':  { cls: 'badge-done',    icon: '✅' },
    'Không xác định': { cls: 'badge-unknown', icon: '❓' },
  };
  const { cls, icon } = map[status] || map['Không xác định'];
  return `<span class="status-badge ${cls}">${icon} ${status}</span>`;
}

// ─────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────
export async function render() {
  const { currentNgay, currentUser, currentProfile } = await getAppState();
  const ngayDisplay = currentNgay ? formatDateDisplay(currentNgay) : '—';
  const userName    = currentProfile?.displayName || currentProfile?.tenDL || currentUser?.email || 'Người dùng';

  // Load stats in background — will be refreshed in init()
  const stats = await loadStats(currentNgay);

  return /* html */ `
    <div class="page dashboard-page" id="page-dashboard">

      <!-- Welcome banner -->
      <div class="page-header">
        <div>
          <h1 class="page-title">🏠 Trang chủ</h1>
          <p class="page-subtitle">Xin chào, <strong>${userName}</strong>! Chào mừng đến với hệ thống quản lý Lô Tô XSKT Nam Định.</p>
        </div>
        <button id="dashboard-reload-btn" class="btn btn-secondary btn-sm" title="Tải lại">
          🔄 Tải lại
        </button>
      </div>

      <!-- Summary cards -->
      <div class="card-grid" id="dashboard-cards">
        <!-- Card: Ngày MT -->
        <div class="summary-card summary-card--date">
          <div class="card-icon">📅</div>
          <div class="card-content">
            <div class="card-label">Ngày mở thưởng</div>
            <div class="card-value" id="dash-ngay">${ngayDisplay}</div>
          </div>
          <button class="card-action-btn" id="change-date-btn" title="Đổi ngày">✎</button>
        </div>

        <!-- Card: Đại lý -->
        <div class="summary-card summary-card--agents">
          <div class="card-icon">🏪</div>
          <div class="card-content">
            <div class="card-label">Đại lý đã nhập</div>
            <div class="card-value" id="dash-so-dai-ly">${stats.soDaiLy}</div>
          </div>
        </div>

        <!-- Card: Trạng thái kỳ -->
        <div class="summary-card summary-card--status">
          <div class="card-icon">📋</div>
          <div class="card-content">
            <div class="card-label">Trạng thái kỳ</div>
            <div class="card-value" id="dash-trang-thai">${statusBadge(stats.trangThaiKy)}</div>
          </div>
        </div>

        <!-- Card: Người dùng -->
        <div class="summary-card summary-card--user">
          <div class="card-icon">👤</div>
          <div class="card-content">
            <div class="card-label">Tài khoản</div>
            <div class="card-value user-info-card">
              <span>${userName}</span>
              <small class="text-muted">${currentProfile?.role || 'user'}</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick action buttons -->
      <div class="section-title">Thao tác nhanh</div>
      <div class="quick-actions">
        <button class="quick-action-btn" data-route="#/nhaploto-don">
          <span class="qa-icon">🎫</span>
          <span>Nhập Lô Tô Đặc biệt</span>
        </button>
        <button class="quick-action-btn" data-route="#/nhaploto-cap">
          <span class="qa-icon">🎟</span>
          <span>Nhập Lô Tô Cặp Số</span>
        </button>
        <button class="quick-action-btn" data-route="#/ketqua">
          <span class="qa-icon">🎰</span>
          <span>Kết quả XS</span>
        </button>
        <button class="quick-action-btn" data-route="#/baocao">
          <span class="qa-icon">📊</span>
          <span>Báo cáo</span>
        </button>
        <button class="quick-action-btn" data-route="#/danhmuc">
          <span class="qa-icon">📋</span>
          <span>Danh mục</span>
        </button>
        <button class="quick-action-btn" data-route="#/kymotuong">
          <span class="qa-icon">📅</span>
          <span>Kỳ mở thưởng</span>
        </button>
      </div>

      <!-- System info footer -->
      <div class="dashboard-footer">
        <p>Hệ thống Quản lý Lô Tô — XSKT Nam Định &copy; 2025</p>
        <p class="text-muted">Phiên bản 1.0.0</p>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────
// INIT (attach event listeners after render)
// ─────────────────────────────────────────────────────────
export async function init() {
  // Quick action buttons → navigate
  const container = document.getElementById('page-dashboard');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-route]');
    if (btn) {
      navigate(btn.getAttribute('data-route'));
    }
  });

  // Reload button
  const reloadBtn = document.getElementById('dashboard-reload-btn');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', async () => {
      reloadBtn.disabled = true;
      reloadBtn.textContent = '⏳';
      try {
        await refreshDashboardStats();
      } finally {
        reloadBtn.disabled = false;
        reloadBtn.textContent = '🔄 Tải lại';
      }
    });
  }

  // Change date button → open date modal in app shell
  const changeDateBtn = document.getElementById('change-date-btn');
  if (changeDateBtn) {
    changeDateBtn.addEventListener('click', () => {
      const modal = document.getElementById('date-modal');
      if (modal) modal.classList.remove('hidden');
    });
  }
}

/** Re-fetch and update cards without full page re-render */
async function refreshDashboardStats() {
  const { currentNgay } = await getAppState();
  const stats = await loadStats(currentNgay);

  const elSoDL     = document.getElementById('dash-so-dai-ly');
  const elStatus   = document.getElementById('dash-trang-thai');
  const elNgay     = document.getElementById('dash-ngay');

  if (elSoDL)   elSoDL.textContent  = stats.soDaiLy;
  if (elStatus) elStatus.innerHTML  = statusBadge(stats.trangThaiKy);
  if (elNgay)   elNgay.textContent  = currentNgay ? formatDateDisplay(currentNgay) : '—';

  showToast('Đã cập nhật thống kê.', 'success');
}
