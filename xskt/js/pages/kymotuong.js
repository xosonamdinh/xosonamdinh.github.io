// M3 - Kỳ Mở Thưởng
import { getKyMoThuong, createKyMoThuong, lockKyMoThuong, unlockKyMoThuong } from '../db.js';
import { formatDate, showToast, showLoading } from '../utils.js';

let _unsubscribe = null;

export async function render() {
  const todayStr = new Date().toISOString().slice(0, 10);
  return /* html */ `
    <div class="page-kymotuong max-w-5xl mx-auto">
      <div class="flex flex-wrap justify-between items-center mb-4 pb-2 border-b bg-white p-3 rounded shadow-sm gap-2">
        <div>
          <h2 class="text-xl font-bold text-blue-900 flex items-center gap-2">
            <span>📅</span> QUẢN LÝ KỲ MỞ THƯỞNG XỔ SỐ
          </h2>
          <p class="text-xs text-gray-500 mt-0.5">Tạo kỳ mở thưởng, khóa số liệu hoặc mở khóa cho phép máy tiếp tục nhận số</p>
        </div>
        <div class="flex flex-wrap gap-2 items-center">
          <input type="date" id="input-kmt-ngay-custom" class="border border-blue-400 px-2.5 py-1.5 rounded text-xs font-bold outline-none" value="${todayStr}" />
          <button id="btn-tao-ky" class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold shadow transition">
            ＋ Tạo kỳ mới
          </button>
          <button id="btn-mo-khoa-nhanh" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-bold shadow transition">
            🔓 Mở khóa ngày này
          </button>
          <button id="btn-khoa-nhanh" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold shadow transition">
            🔒 Khóa ngày này
          </button>
        </div>
      </div>

      <div id="kmt-loading" class="text-center py-6">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        <p class="text-xs text-gray-500 mt-2">Đang tải danh sách kỳ...</p>
      </div>

      <div class="bg-white border rounded shadow-sm overflow-hidden d-none" id="kmt-table-wrap">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="bg-blue-100 text-blue-900 font-bold border-b text-center">
              <th class="py-2.5 px-3 w-12 border-r">#</th>
              <th class="py-2.5 px-3 border-r">Ngày mở thưởng</th>
              <th class="py-2.5 px-3 border-r">Trạng thái</th>
              <th class="py-2.5 px-3 w-64">Thao tác</th>
            </tr>
          </thead>
          <tbody id="kmt-tbody"></tbody>
        </table>
      </div>

      <div id="kmt-empty" class="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded text-sm d-none mt-3">
        Chưa có kỳ mở thưởng nào. Nhấn <strong>Tạo kỳ mới</strong> để bắt đầu.
      </div>
    </div>
  `;
}

function statusBadge(trangThai) {
  switch (trangThai) {
    case 'Đang nhập':
      return '<span class="px-2.5 py-1 rounded text-xs font-bold bg-green-100 text-green-800">Đang nhận số</span>';
    case 'Đã khóa':
      return '<span class="px-2.5 py-1 rounded text-xs font-bold bg-red-100 text-red-800">Đã khóa sổ</span>';
    case 'Đã có kết quả':
      return '<span class="px-2.5 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800">Đã có kết quả</span>';
    default:
      return `<span class="px-2.5 py-1 rounded text-xs font-bold bg-gray-100 text-gray-800">${trangThai ?? '—'}</span>`;
  }
}

function renderRows(kyList) {
  if (!kyList || kyList.length === 0) return '';
  return kyList
    .map(
      (ky, idx) => {
        const isLocked = ky.status === 'da_khoa' || ky.trangThai === 'Đã khóa';
        return /* html */ `
          <tr class="border-b hover:bg-blue-50 text-center" data-id="${ky.id}">
            <td class="py-2 px-3 border-r text-gray-500 font-bold">${idx + 1}</td>
            <td class="py-2 px-3 border-r font-bold text-gray-800">${formatDate(ky.ngay)}</td>
            <td class="py-2 px-3 border-r">${statusBadge(ky.trangThai)}</td>
            <td class="py-2 px-3 flex justify-center gap-2">
              ${
                isLocked
                  ? `<button class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-bold btn-unlock-row" data-id="${ky.id}" data-ngay="${ky.ngay}">
                      🔓 Mở khóa
                    </button>`
                  : `<button class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold btn-khoa-row" data-id="${ky.id}" data-ngay="${ky.ngay}">
                      🔒 Khóa lại
                    </button>`
              }
              <button class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold btn-chon-ngay" data-ngay="${ky.ngay}">
                👉 Chọn làm việc
              </button>
            </td>
          </tr>
        `;
      }
    )
    .join('');
}

function refreshTable(kyList) {
  const loading = document.getElementById('kmt-loading');
  const wrap = document.getElementById('kmt-table-wrap');
  const empty = document.getElementById('kmt-empty');
  const tbody = document.getElementById('kmt-tbody');

  if (!tbody) return;

  loading?.classList.add('d-none');

  if (!kyList || kyList.length === 0) {
    wrap?.classList.add('d-none');
    empty?.classList.remove('d-none');
  } else {
    empty?.classList.add('d-none');
    wrap?.classList.remove('d-none');
    tbody.innerHTML = renderRows(kyList);

    tbody.querySelectorAll('.btn-khoa-row').forEach((btn) => {
      btn.addEventListener('click', () => handleLockRow(btn.dataset.id || btn.dataset.ngay));
    });
    tbody.querySelectorAll('.btn-unlock-row').forEach((btn) => {
      btn.addEventListener('click', () => handleUnlockRow(btn.dataset.id || btn.dataset.ngay));
    });
    tbody.querySelectorAll('.btn-chon-ngay').forEach((btn) => {
      btn.addEventListener('click', () => {
        sessionStorage.setItem('xskt_ngay', btn.dataset.ngay);
        showToast(`Đã chọn ngày làm việc: ${formatDate(btn.dataset.ngay)}`, 'success');
        window.location.hash = '#/nhaploto-don';
      });
    });
  }
}

async function handleTaoKy() {
  const dateInput = document.getElementById('input-kmt-ngay-custom');
  const selectedDate = dateInput?.value || new Date().toISOString().slice(0, 10);
  const stop = showLoading('Đang tạo kỳ mới...');
  try {
    await createKyMoThuong(selectedDate);
    sessionStorage.setItem('xskt_ngay', selectedDate);
    showToast(`Tạo kỳ mới ngày ${formatDate(selectedDate)} thành công!`, 'success');
  } catch (err) {
    showToast('Thông báo: ' + err.message, 'warning');
  } finally {
    stop?.();
  }
}

async function handleQuickLock() {
  const dateInput = document.getElementById('input-kmt-ngay-custom');
  const selectedDate = dateInput?.value || new Date().toISOString().slice(0, 10);
  if (!confirm(`Xác nhận KHÓA kỳ ngày ${formatDate(selectedDate)}?`)) return;
  const stop = showLoading('Đang khóa kỳ...');
  try {
    await lockKyMoThuong(selectedDate);
    showToast(`Đã khóa kỳ ngày ${formatDate(selectedDate)} thành công.`, 'success');
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'danger');
  } finally {
    stop?.();
  }
}

async function handleQuickUnlock() {
  const dateInput = document.getElementById('input-kmt-ngay-custom');
  const selectedDate = dateInput?.value || new Date().toISOString().slice(0, 10);
  if (!confirm(`Xác nhận MỞ KHÓA kỳ ngày ${formatDate(selectedDate)} để tiếp tục nhận số?`)) return;
  const stop = showLoading('Đang mở khóa...');
  try {
    await unlockKyMoThuong(selectedDate);
    showToast(`Đã mở khóa kỳ ngày ${formatDate(selectedDate)} thành công.`, 'success');
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'danger');
  } finally {
    stop?.();
  }
}

async function handleLockRow(id) {
  if (!confirm('Xác nhận KHÓA kỳ mở thưởng này? Các máy sẽ không thể nhập thêm vé.')) return;
  const stop = showLoading('Đang khóa kỳ...');
  try {
    await lockKyMoThuong(id);
    showToast('Đã khóa kỳ thành công.', 'success');
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'danger');
  } finally {
    stop?.();
  }
}

async function handleUnlockRow(id) {
  if (!confirm('Xác nhận MỞ KHÓA kỳ mở thưởng này để tiếp tục nhận số?')) return;
  const stop = showLoading('Đang mở khóa...');
  try {
    await unlockKyMoThuong(id);
    showToast('Đã mở khóa kỳ thành công.', 'success');
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'danger');
  } finally {
    stop?.();
  }
}

export async function init() {
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }

  document.getElementById('btn-tao-ky')?.addEventListener('click', handleTaoKy);
  document.getElementById('btn-khoa-nhanh')?.addEventListener('click', handleQuickLock);
  document.getElementById('btn-mo-khoa-nhanh')?.addEventListener('click', handleQuickUnlock);

  try {
    _unsubscribe = await getKyMoThuong((kyList) => {
      refreshTable(kyList);
    });
  } catch (err) {
    document.getElementById('kmt-loading')?.classList.add('d-none');
    showToast('Lỗi tải dữ liệu: ' + err.message, 'danger');
  }
}

export function destroy() {
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }
}
