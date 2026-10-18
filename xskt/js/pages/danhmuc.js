/**
 * danhmuc.js — Master Data Management Page (M2)
 * Tabs: Đơn vị | Đại lý | Tổ số
 * XSKT Lô Tô Nam Định
 */

import { db } from '../firebase-config.js';
import {
  collection, doc,
  addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, where,
  serverTimestamp, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { formatDateDisplay, showToast, escapeHtml } from '../utils.js';

// ─────────────────────────────────────────────────────────
// UNSUBSCRIBE REGISTRY — clean up listeners on page leave
// ─────────────────────────────────────────────────────────
const _unsubs = [];
function registerUnsub(fn) { _unsubs.push(fn); }
function unsubAll() { _unsubs.forEach(fn => fn()); _unsubs.length = 0; }

// ─────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────
export async function render() {
  return /* html */ `
    <div class="page danhmuc-page" id="page-danhmuc">
      <div class="page-header">
        <h1 class="page-title">📋 Danh mục</h1>
        <p class="page-subtitle">Quản lý dữ liệu danh mục hệ thống</p>
      </div>

      <!-- TAB BAR -->
      <div class="tab-bar" id="danhmuc-tabs" role="tablist">
        <button class="tab-btn active" data-tab="don-vi"  role="tab" aria-selected="true">🏢 Đơn vị</button>
        <button class="tab-btn"        data-tab="dai-ly"  role="tab" aria-selected="false">🏪 Đại lý</button>
        <button class="tab-btn"        data-tab="to-so"   role="tab" aria-selected="false">🔢 Tổ số</button>
      </div>

      <!-- TAB PANELS -->
      <div id="tab-panels">

        <!-- ── ĐƠN VỊ ─────────────────────────────────── -->
        <div id="panel-don-vi" class="tab-panel">
          <div class="panel-toolbar">
            <button id="btn-add-don-vi" class="btn btn-primary btn-sm">＋ Thêm đơn vị</button>
          </div>

          <!-- Inline Add/Edit form (hidden by default) -->
          <div id="form-don-vi" class="inline-form hidden">
            <h3 class="form-section-title" id="form-don-vi-title">Thêm đơn vị</h3>
            <input type="hidden" id="dv-edit-id" />
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Mã đơn vị <span class="required">*</span></label>
                <input type="text" id="dv-ma" class="form-input" placeholder="VD: DV001" maxlength="20" />
              </div>
              <div class="form-group">
                <label class="form-label">Tên đơn vị <span class="required">*</span></label>
                <input type="text" id="dv-ten" class="form-input" placeholder="Tên đơn vị..." maxlength="100" />
              </div>
            </div>
            <div class="form-actions">
              <button id="dv-save-btn" class="btn btn-primary">💾 Lưu</button>
              <button id="dv-cancel-btn" class="btn btn-secondary">Hủy</button>
            </div>
          </div>

          <!-- Table -->
          <div class="table-wrapper">
            <table class="data-table" id="table-don-vi">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã đơn vị</th>
                  <th>Tên đơn vị</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody id="tbody-don-vi">
                <tr><td colspan="5" class="table-loading">Đang tải...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── ĐẠI LÝ ─────────────────────────────────── -->
        <div id="panel-dai-ly" class="tab-panel hidden">
          <div class="panel-toolbar">
            <div class="form-group filter-group">
              <label class="form-label">Lọc theo đơn vị:</label>
              <select id="filter-don-vi" class="form-select">
                <option value="">— Tất cả —</option>
              </select>
            </div>
            <button id="btn-add-dai-ly" class="btn btn-primary btn-sm">＋ Thêm đại lý</button>
          </div>

          <!-- Inline Add/Edit form -->
          <div id="form-dai-ly" class="inline-form hidden">
            <h3 class="form-section-title" id="form-dai-ly-title">Thêm đại lý</h3>
            <input type="hidden" id="dl-edit-id" />
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Mã đại lý <span class="required">*</span></label>
                <input type="text" id="dl-ma" class="form-input" placeholder="VD: DL001" maxlength="20" />
              </div>
              <div class="form-group">
                <label class="form-label">Tên đại lý <span class="required">*</span></label>
                <input type="text" id="dl-ten" class="form-input" placeholder="Tên đại lý..." maxlength="100" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Đơn vị <span class="required">*</span></label>
                <select id="dl-don-vi" class="form-select">
                  <option value="">— Chọn đơn vị —</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Điểm truyền</label>
                <input type="text" id="dl-diem-truyen" class="form-input" placeholder="Điểm truyền..." maxlength="50" />
              </div>
              <div class="form-group">
                <label class="form-label">Tổ số</label>
                <input type="text" id="dl-to-so" class="form-input" placeholder="VD: T01" maxlength="10" />
              </div>
            </div>
            <div class="form-actions">
              <button id="dl-save-btn" class="btn btn-primary">💾 Lưu</button>
              <button id="dl-cancel-btn" class="btn btn-secondary">Hủy</button>
            </div>
          </div>

          <!-- Table -->
          <div class="table-wrapper">
            <table class="data-table" id="table-dai-ly">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã ĐL</th>
                  <th>Tên đại lý</th>
                  <th>Đơn vị</th>
                  <th>Điểm truyền</th>
                  <th>Tổ số</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody id="tbody-dai-ly">
                <tr><td colspan="7" class="table-loading">Đang tải...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── TỔ SỐ ─────────────────────────────────── -->
        <div id="panel-to-so" class="tab-panel hidden">
          <div class="panel-toolbar">
            <button id="btn-add-to-so" class="btn btn-primary btn-sm">＋ Thêm tổ số</button>
          </div>

          <!-- Inline Add/Edit form -->
          <div id="form-to-so" class="inline-form hidden">
            <h3 class="form-section-title" id="form-to-so-title">Thêm tổ số</h3>
            <input type="hidden" id="ts-edit-id" />
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Mã tổ số <span class="required">*</span></label>
                <input type="text" id="ts-ma" class="form-input" placeholder="VD: T01" maxlength="10" />
              </div>
              <div class="form-group">
                <label class="form-label">Tên tổ số</label>
                <input type="text" id="ts-ten" class="form-input" placeholder="Tên tổ số..." maxlength="50" />
              </div>
            </div>
            <div class="form-actions">
              <button id="ts-save-btn" class="btn btn-primary">💾 Lưu</button>
              <button id="ts-cancel-btn" class="btn btn-secondary">Hủy</button>
            </div>
          </div>

          <!-- List -->
          <div class="to-so-list-wrapper">
            <ul id="list-to-so" class="to-so-list">
              <li class="table-loading">Đang tải...</li>
            </ul>
          </div>
        </div>

      </div><!-- /#tab-panels -->
    </div><!-- /#page-danhmuc -->
  `;
}

// ─────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────
export async function init() {
  const page = document.getElementById('page-danhmuc');
  if (!page) return;

  // Cleanup previous listeners when navigating away
  window._danhmucCleanup = unsubAll;

  // ── TAB SWITCHING ────────────────────────────────────
  const tabBar    = document.getElementById('danhmuc-tabs');
  const allPanels = page.querySelectorAll('.tab-panel');

  tabBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const tabId = btn.dataset.tab;

    tabBar.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    });
    allPanels.forEach(p => p.classList.toggle('hidden', !p.id.endsWith(tabId.replace('-', '-'))));
    // Correct mapping:
    allPanels.forEach(p => {
      const show = p.id === `panel-${tabId}`;
      p.classList.toggle('hidden', !show);
    });
  });

  // ── INIT SECTIONS ────────────────────────────────────
  initDonVi();
  initDaiLy();
  initToSo();
}

// ═══════════════════════════════════════════════════════
// SECTION: ĐƠN VỊ
// ═══════════════════════════════════════════════════════
function initDonVi() {
  const colRef  = collection(db, 'donVi');
  const q       = query(colRef, orderBy('ma', 'asc'));
  const form    = document.getElementById('form-don-vi');
  const tbody   = document.getElementById('tbody-don-vi');
  let   dvData  = [];  // local cache for other tabs

  // Real-time listener
  const unsub = onSnapshot(q, (snap) => {
    dvData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDonViTable(dvData);
    populateDonViSelects(dvData);
  }, err => {
    console.error('[danhmuc] donVi snapshot error:', err);
    tbody.innerHTML = `<tr><td colspan="5" class="table-error">Lỗi tải dữ liệu</td></tr>`;
  });
  registerUnsub(unsub);

  // Add button
  document.getElementById('btn-add-don-vi').addEventListener('click', () => {
    openDonViForm();
  });

  // Save
  document.getElementById('dv-save-btn').addEventListener('click', async () => {
    const id  = document.getElementById('dv-edit-id').value;
    const ma  = document.getElementById('dv-ma').value.trim();
    const ten = document.getElementById('dv-ten').value.trim();

    if (!ma || !ten) { showToast('Vui lòng nhập đầy đủ thông tin.', 'warning'); return; }

    try {
      if (id) {
        await updateDoc(doc(db, 'donVi', id), { ma, ten, updatedAt: serverTimestamp() });
        showToast('Cập nhật đơn vị thành công.', 'success');
      } else {
        await addDoc(colRef, { ma, ten, createdAt: serverTimestamp() });
        showToast('Thêm đơn vị thành công.', 'success');
      }
      closeDonViForm();
    } catch (err) {
      showToast('Lỗi lưu dữ liệu: ' + err.message, 'error');
    }
  });

  // Cancel
  document.getElementById('dv-cancel-btn').addEventListener('click', closeDonViForm);

  // Table delegate (edit / delete)
  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const row = dvData.find(d => d.id === id);

    if (btn.dataset.action === 'edit' && row) {
      openDonViForm(row);
    } else if (btn.dataset.action === 'delete') {
      if (!confirm(`Xóa đơn vị "${row?.ten || id}"?`)) return;
      try {
        await deleteDoc(doc(db, 'donVi', id));
        showToast('Đã xóa đơn vị.', 'success');
      } catch (err) {
        showToast('Lỗi xóa: ' + err.message, 'error');
      }
    }
  });

  function openDonViForm(row = null) {
    document.getElementById('form-don-vi-title').textContent = row ? 'Sửa đơn vị' : 'Thêm đơn vị';
    document.getElementById('dv-edit-id').value = row?.id   || '';
    document.getElementById('dv-ma').value       = row?.ma  || '';
    document.getElementById('dv-ten').value      = row?.ten || '';
    form.classList.remove('hidden');
    document.getElementById('dv-ma').focus();
  }
  function closeDonViForm() {
    form.classList.add('hidden');
    document.getElementById('dv-edit-id').value = '';
    document.getElementById('dv-ma').value       = '';
    document.getElementById('dv-ten').value      = '';
  }
}

function renderDonViTable(rows) {
  const tbody = document.getElementById('tbody-don-vi');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Chưa có dữ liệu</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map((r, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td><strong>${escapeHtml(r.ma)}</strong></td>
      <td>${escapeHtml(r.ten)}</td>
      <td class="text-muted">${r.createdAt ? formatDateDisplay(r.createdAt.toDate?.()?.toISOString?.()?.slice(0,10) || '') : '—'}</td>
      <td class="action-cell">
        <button class="btn-icon btn-edit"   data-action="edit"   data-id="${r.id}" title="Sửa">✏️</button>
        <button class="btn-icon btn-delete" data-action="delete" data-id="${r.id}" title="Xóa">🗑</button>
      </td>
    </tr>
  `).join('');
}

function populateDonViSelects(rows) {
  // Update filter dropdown in Đại lý tab
  ['filter-don-vi', 'dl-don-vi'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    const firstOpt = id === 'filter-don-vi'
      ? '<option value="">— Tất cả —</option>'
      : '<option value="">— Chọn đơn vị —</option>';
    sel.innerHTML = firstOpt + rows.map(r =>
      `<option value="${r.id}" ${r.id === current ? 'selected' : ''}>${escapeHtml(r.ma)} – ${escapeHtml(r.ten)}</option>`
    ).join('');
  });
}

// ═══════════════════════════════════════════════════════
// SECTION: ĐẠI LÝ
// ═══════════════════════════════════════════════════════
function initDaiLy() {
  const colRef  = collection(db, 'daiLy');
  const form    = document.getElementById('form-dai-ly');
  const tbody   = document.getElementById('tbody-dai-ly');
  const filter  = document.getElementById('filter-don-vi');

  let dlData   = [];
  let filterDV = '';

  function buildQuery() {
    if (filterDV) {
      return query(colRef, where('donViId', '==', filterDV), orderBy('ma', 'asc'));
    }
    return query(colRef, orderBy('ma', 'asc'));
  }

  let currentUnsub = null;

  function subscribeData() {
    if (currentUnsub) currentUnsub();
    const q = buildQuery();
    currentUnsub = onSnapshot(q, (snap) => {
      dlData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderDaiLyTable(dlData);
    }, err => {
      console.error('[danhmuc] daiLy snapshot error:', err);
      tbody.innerHTML = `<tr><td colspan="7" class="table-error">Lỗi tải dữ liệu</td></tr>`;
    });
    registerUnsub(currentUnsub);
  }

  subscribeData();

  // Filter change
  filter.addEventListener('change', () => {
    filterDV = filter.value;
    subscribeData();
  });

  // Add button
  document.getElementById('btn-add-dai-ly').addEventListener('click', () => {
    openDaiLyForm();
  });

  // Save
  document.getElementById('dl-save-btn').addEventListener('click', async () => {
    const id        = document.getElementById('dl-edit-id').value;
    const ma        = document.getElementById('dl-ma').value.trim();
    const ten       = document.getElementById('dl-ten').value.trim();
    const donViId   = document.getElementById('dl-don-vi').value;
    const diemTruyen= document.getElementById('dl-diem-truyen').value.trim();
    const toSo      = document.getElementById('dl-to-so').value.trim();

    if (!ma || !ten || !donViId) {
      showToast('Vui lòng nhập đầy đủ thông tin bắt buộc.', 'warning');
      return;
    }

    const payload = { ma, ten, donViId, diemTruyen, toSo };

    try {
      if (id) {
        await updateDoc(doc(db, 'daiLy', id), { ...payload, updatedAt: serverTimestamp() });
        showToast('Cập nhật đại lý thành công.', 'success');
      } else {
        await addDoc(colRef, { ...payload, createdAt: serverTimestamp() });
        showToast('Thêm đại lý thành công.', 'success');
      }
      closeDaiLyForm();
    } catch (err) {
      showToast('Lỗi lưu dữ liệu: ' + err.message, 'error');
    }
  });

  // Cancel
  document.getElementById('dl-cancel-btn').addEventListener('click', closeDaiLyForm);

  // Table delegate
  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id  = btn.dataset.id;
    const row = dlData.find(d => d.id === id);

    if (btn.dataset.action === 'edit' && row) {
      openDaiLyForm(row);
    } else if (btn.dataset.action === 'delete') {
      if (!confirm(`Xóa đại lý "${row?.ten || id}"?`)) return;
      try {
        await deleteDoc(doc(db, 'daiLy', id));
        showToast('Đã xóa đại lý.', 'success');
      } catch (err) {
        showToast('Lỗi xóa: ' + err.message, 'error');
      }
    }
  });

  function openDaiLyForm(row = null) {
    document.getElementById('form-dai-ly-title').textContent  = row ? 'Sửa đại lý' : 'Thêm đại lý';
    document.getElementById('dl-edit-id').value     = row?.id         || '';
    document.getElementById('dl-ma').value          = row?.ma         || '';
    document.getElementById('dl-ten').value         = row?.ten        || '';
    document.getElementById('dl-don-vi').value      = row?.donViId    || '';
    document.getElementById('dl-diem-truyen').value = row?.diemTruyen || '';
    document.getElementById('dl-to-so').value       = row?.toSo       || '';
    form.classList.remove('hidden');
    document.getElementById('dl-ma').focus();
  }
  function closeDaiLyForm() {
    form.classList.add('hidden');
    ['dl-edit-id','dl-ma','dl-ten','dl-don-vi','dl-diem-truyen','dl-to-so']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  }
}

function renderDaiLyTable(rows) {
  const tbody = document.getElementById('tbody-dai-ly');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Chưa có dữ liệu</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map((r, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td><strong>${escapeHtml(r.ma)}</strong></td>
      <td>${escapeHtml(r.ten)}</td>
      <td>${escapeHtml(r.donViId || '—')}</td>
      <td>${escapeHtml(r.diemTruyen || '—')}</td>
      <td>${escapeHtml(r.toSo || '—')}</td>
      <td class="action-cell">
        <button class="btn-icon btn-edit"   data-action="edit"   data-id="${r.id}" title="Sửa">✏️</button>
        <button class="btn-icon btn-delete" data-action="delete" data-id="${r.id}" title="Xóa">🗑</button>
      </td>
    </tr>
  `).join('');
}

// ═══════════════════════════════════════════════════════
// SECTION: TỔ SỐ
// ═══════════════════════════════════════════════════════
function initToSo() {
  const colRef = collection(db, 'toSo');
  const q      = query(colRef, orderBy('ma', 'asc'));
  const form   = document.getElementById('form-to-so');
  const list   = document.getElementById('list-to-so');
  let   tsData = [];

  const unsub = onSnapshot(q, (snap) => {
    tsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderToSoList(tsData);
  }, err => {
    console.error('[danhmuc] toSo snapshot error:', err);
    list.innerHTML = `<li class="table-error">Lỗi tải dữ liệu</li>`;
  });
  registerUnsub(unsub);

  document.getElementById('btn-add-to-so').addEventListener('click', () => openToSoForm());

  document.getElementById('ts-save-btn').addEventListener('click', async () => {
    const id  = document.getElementById('ts-edit-id').value;
    const ma  = document.getElementById('ts-ma').value.trim();
    const ten = document.getElementById('ts-ten').value.trim();

    if (!ma) { showToast('Vui lòng nhập mã tổ số.', 'warning'); return; }

    try {
      if (id) {
        await updateDoc(doc(db, 'toSo', id), { ma, ten, updatedAt: serverTimestamp() });
        showToast('Cập nhật tổ số thành công.', 'success');
      } else {
        await addDoc(colRef, { ma, ten, createdAt: serverTimestamp() });
        showToast('Thêm tổ số thành công.', 'success');
      }
      closeToSoForm();
    } catch (err) {
      showToast('Lỗi lưu: ' + err.message, 'error');
    }
  });

  document.getElementById('ts-cancel-btn').addEventListener('click', closeToSoForm);

  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id  = btn.dataset.id;
    const row = tsData.find(d => d.id === id);

    if (btn.dataset.action === 'edit' && row) {
      openToSoForm(row);
    } else if (btn.dataset.action === 'delete') {
      if (!confirm(`Xóa tổ số "${row?.ma || id}"?`)) return;
      try {
        await deleteDoc(doc(db, 'toSo', id));
        showToast('Đã xóa tổ số.', 'success');
      } catch (err) {
        showToast('Lỗi xóa: ' + err.message, 'error');
      }
    }
  });

  function openToSoForm(row = null) {
    document.getElementById('form-to-so-title').textContent = row ? 'Sửa tổ số' : 'Thêm tổ số';
    document.getElementById('ts-edit-id').value = row?.id  || '';
    document.getElementById('ts-ma').value      = row?.ma  || '';
    document.getElementById('ts-ten').value     = row?.ten || '';
    form.classList.remove('hidden');
    document.getElementById('ts-ma').focus();
  }
  function closeToSoForm() {
    form.classList.add('hidden');
    document.getElementById('ts-edit-id').value = '';
    document.getElementById('ts-ma').value      = '';
    document.getElementById('ts-ten').value     = '';
  }
}

function renderToSoList(rows) {
  const list = document.getElementById('list-to-so');
  if (!list) return;
  if (!rows.length) {
    list.innerHTML = `<li class="table-empty">Chưa có tổ số</li>`;
    return;
  }
  list.innerHTML = rows.map(r => `
    <li class="to-so-item">
      <span class="to-so-badge">${escapeHtml(r.ma)}</span>
      <span class="to-so-name">${escapeHtml(r.ten || '')}</span>
      <span class="to-so-actions">
        <button class="btn-icon btn-edit"   data-action="edit"   data-id="${r.id}" title="Sửa">✏️</button>
        <button class="btn-icon btn-delete" data-action="delete" data-id="${r.id}" title="Xóa">🗑</button>
      </span>
    </li>
  `).join('');
}
