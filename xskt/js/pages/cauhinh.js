/**
 * cauhinh.js - M10: Cấu Hình Hệ Thống & Cơ Cấu Giải Thưởng
 * XSKT Lô Tô Nam Định
 */

import { db } from '../firebase-config.js';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {
  showToast,
  showLoading
} from '../utils.js';

export async function render() {
  return /* html */ `
    <div class="page-cauhinh max-w-5xl mx-auto">
      <div class="page-header mb-4">
        <h2 class="text-xl font-bold text-blue-900 flex items-center gap-2">
          <span>⚙️</span> CẤU HÌNH HỆ THỐNG
        </h2>
        <p class="text-sm text-gray-500">Thiết lập thông tin công ty, cơ cấu trả thưởng và danh sách người dùng</p>
      </div>

      <!-- TABS -->
      <div class="flex border-b mb-4">
        <button class="tab-btn px-4 py-2 font-bold text-sm border-b-2 border-blue-600 text-blue-700" data-tab="tab-congty">
          🏢 Thông tin Công ty
        </button>
        <button class="tab-btn px-4 py-2 font-bold text-sm text-gray-500 hover:text-blue-600" data-tab="tab-giathuong">
          🎯 Bảng Cơ Cấu Thưởng
        </button>
        <button class="tab-btn px-4 py-2 font-bold text-sm text-gray-500 hover:text-blue-600" data-tab="tab-users">
          👥 Quản lý Người dùng
        </button>
      </div>

      <!-- TAB 1: THÔNG TIN CÔNG TY -->
      <div id="tab-congty" class="tab-content bg-white p-4 border rounded shadow-sm">
        <h3 class="font-bold text-base text-gray-800 mb-3">Thông tin đơn vị phát hành</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label class="block font-semibold mb-1">Tên Công ty:</label>
            <input type="text" id="cfg-ten-cong-ty" class="w-full border rounded p-2" value="CÔNG TY TNHH MTV XỔ SỐ KIẾN THIẾT NAM ĐỊNH" />
          </div>
          <div>
            <label class="block font-semibold mb-1">Chi nhánh / Bộ phận:</label>
            <input type="text" id="cfg-chi-nhanh" class="w-full border rounded p-2" value="CHI NHÁNH XS TP. NAM ĐỊNH" />
          </div>
          <div class="md:col-span-2">
            <label class="block font-semibold mb-1">Địa chỉ:</label>
            <input type="text" id="cfg-dia-chi" class="w-full border rounded p-2" value="Số 157 Trần Hưng Đạo - P. Nam Định - Tỉnh Ninh Bình" />
          </div>
        </div>
        <div class="mt-4 flex justify-end">
          <button id="btn-save-cong-ty" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-sm shadow">
            💾 Lưu thông tin
          </button>
        </div>
      </div>

      <!-- TAB 2: CƠ CẤU GIẢI THƯỞNG -->
      <div id="tab-giathuong" class="tab-content bg-white p-4 border rounded shadow-sm hidden">
        <h3 class="font-bold text-base text-gray-800 mb-2">Bảng quy định hệ số trúng thưởng (Áp dụng từ 01/01/2026)</h3>
        <p class="text-xs text-gray-500 mb-3">Hệ số nhân theo mệnh giá vé mua (5.000đ, 10.000đ, 20.000đ)</p>

        <div class="overflow-x-auto text-xs">
          <table class="w-full border-collapse border border-gray-300">
            <thead>
              <tr class="bg-blue-100 text-blue-900">
                <th class="border p-2 text-left">Loại hình lô tô</th>
                <th class="border p-2 text-left">Điều kiện trúng</th>
                <th class="border p-2 text-center w-32">Hệ số thưởng (lần)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td class="border p-2 font-bold" rowspan="6">Lô tô so giải ĐB</td><td class="border p-2">Trúng 2 số cuối giải Đặc Biệt</td><td class="border p-2 text-center font-bold text-blue-700">60x</td></tr>
              <tr><td class="border p-2">Trúng 3 số cuối giải Đặc Biệt</td><td class="border p-2 text-center font-bold text-blue-700">400x</td></tr>
              <tr><td class="border p-2">Khuyến khích trúng 2 số cuối giải Đặc Biệt (vé 3 số)</td><td class="border p-2 text-center font-bold text-blue-700">5x</td></tr>
              <tr><td class="border p-2">Trúng 4 số cuối giải Đặc Biệt</td><td class="border p-2 text-center font-bold text-blue-700">1.500x</td></tr>
              <tr><td class="border p-2">Khuyến khích trúng 3 số cuối giải Đặc Biệt (vé 4 số)</td><td class="border p-2 text-center font-bold text-blue-700">10x</td></tr>
              <tr><td class="border p-2">Khuyến khích trúng 2 số cuối giải Đặc Biệt (vé 4 số)</td><td class="border p-2 text-center font-bold text-blue-700">5x</td></tr>

              <tr class="bg-gray-50"><td class="border p-2 font-bold" rowspan="6">Lô tô Cặp số</td><td class="border p-2">Trúng cả 2 cặp số</td><td class="border p-2 text-center font-bold text-blue-700">10x</td></tr>
              <tr class="bg-gray-50"><td class="border p-2">Khuyến khích trúng 2 cặp số và có cặp trùng >= 2 lần</td><td class="border p-2 text-center font-bold text-blue-700">15x</td></tr>
              <tr class="bg-gray-50"><td class="border p-2">Trúng cả 3 cặp số</td><td class="border p-2 text-center font-bold text-blue-700">42x</td></tr>
              <tr class="bg-gray-50"><td class="border p-2">Khuyến khích trúng 2/3 cặp số</td><td class="border p-2 text-center font-bold text-blue-700">1x</td></tr>
              <tr class="bg-gray-50"><td class="border p-2">Trúng cả 4 cặp số</td><td class="border p-2 text-center font-bold text-blue-700">130x</td></tr>
              <tr class="bg-gray-50"><td class="border p-2">Khuyến khích trúng 3/4 cặp số</td><td class="border p-2 text-center font-bold text-blue-700">2x</td></tr>

              <tr><td class="border p-2 font-bold" rowspan="2">Lô tô 2/27 (so 27 giải)</td><td class="border p-2">Trúng 1 lần 2 số cuối</td><td class="border p-2 text-center font-bold text-blue-700">2.25x</td></tr>
              <tr><td class="border p-2">Trúng từ 2 lần trở lên 2 số cuối</td><td class="border p-2 text-center font-bold text-blue-700">4.5x</td></tr>

              <tr class="bg-gray-50"><td class="border p-2 font-bold" rowspan="3">Lô tô 3/23 (so 23 giải)</td><td class="border p-2">Trúng 1 lần 3 số cuối (ĐB đến giải Sáu)</td><td class="border p-2 text-center font-bold text-blue-700">20x</td></tr>
              <tr class="bg-gray-50"><td class="border p-2">Trúng 2 lần 3 số cuối (ĐB đến giải Sáu)</td><td class="border p-2 text-center font-bold text-blue-700">60x</td></tr>
              <tr class="bg-gray-50"><td class="border p-2">Trúng từ 3 lần trở lên 3 số cuối</td><td class="border p-2 text-center font-bold text-blue-700">150x</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 3: QUẢN LÝ NGƯỜI DÙNG -->
      <div id="tab-users" class="tab-content bg-white p-4 border rounded shadow-sm hidden">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-bold text-base text-gray-800">Danh sách tài khoản nội bộ</h3>
          <button id="btn-add-user-modal" class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold">
            ＋ Thêm tài khoản
          </button>
        </div>

        <div class="overflow-x-auto text-xs">
          <table class="w-full border-collapse border border-gray-300">
            <thead>
              <tr class="bg-gray-100 text-left">
                <th class="border p-2">Tên</th>
                <th class="border p-2">Email</th>
                <th class="border p-2">Vai trò</th>
                <th class="border p-2">Mã máy</th>
                <th class="border p-2 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody id="tbody-users">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

export async function init() {
  setupTabs();
  await loadCompanyConfig();
  await loadUserList();

  document.getElementById('btn-save-cong-ty')?.addEventListener('click', saveCompanyConfig);
}

function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('border-b-2', 'border-blue-600', 'text-blue-700');
        t.classList.add('text-gray-500');
      });
      tab.classList.add('border-b-2', 'border-blue-600', 'text-blue-700');
      tab.classList.remove('text-gray-500');

      const targetId = tab.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById(targetId)?.classList.remove('hidden');
    });
  });
}

async function loadCompanyConfig() {
  try {
    const docSnap = await getDoc(doc(db, 'config', 'congTy'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.ten) document.getElementById('cfg-ten-cong-ty').value = data.ten;
      if (data.chiNhanh) document.getElementById('cfg-chi-nhanh').value = data.chiNhanh;
      if (data.diaChi) document.getElementById('cfg-dia-chi').value = data.diaChi;
    }
  } catch (err) {
    console.error(err);
  }
}

async function saveCompanyConfig() {
  const ten = document.getElementById('cfg-ten-cong-ty')?.value;
  const chiNhanh = document.getElementById('cfg-chi-nhanh')?.value;
  const diaChi = document.getElementById('cfg-dia-chi')?.value;

  const stop = showLoading('Đang lưu thông tin...');
  try {
    await setDoc(doc(db, 'config', 'congTy'), {
      ten,
      chiNhanh,
      diaChi,
      updatedAt: serverTimestamp()
    }, { merge: true });
    showToast('Đã lưu cấu hình công ty!', 'success');
  } catch (err) {
    console.error(err);
    showToast('Lỗi lưu cấu hình: ' + err.message, 'danger');
  } finally {
    stop?.();
  }
}

async function loadUserList() {
  const tbody = document.getElementById('tbody-users');
  if (!tbody) return;

  try {
    const snap = await getDocs(collection(db, 'users'));
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-gray-500">Chưa có người dùng nào được tạo.</td></tr>`;
      return;
    }

    tbody.innerHTML = snap.docs.map(d => {
      const u = d.data();
      return `
        <tr class="hover:bg-blue-50 border-b">
          <td class="border p-2 font-bold">${u.displayName || u.ten || '—'}</td>
          <td class="border p-2">${u.email || d.id}</td>
          <td class="border p-2"><span class="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 font-semibold">${u.role || 'user'}</span></td>
          <td class="border p-2 font-mono">${u.maMay || 'A00'}</td>
          <td class="border p-2 text-center">
            <button class="text-red-600 hover:text-red-800 font-semibold" onclick="alert('Vui lòng quản lý tài khoản qua Firebase Authentication!')">Xóa</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
  }
}
