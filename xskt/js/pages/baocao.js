/**
 * baocao.js - M7: Báo Cáo Doanh Thu & Rút Thưởng Lô Tô
 * XSKT Lô Tô Nam Định
 */

import { db } from '../firebase-config.js';
import {
  getDonViList,
  getDaiLyList,
  getKyMoThuong,
  getKetQuaByKy,
  COLLECTIONS
} from '../db.js';
import {
  collection,
  query,
  where,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {
  formatDate,
  formatCurrency,
  showToast,
  showLoading
} from '../utils.js';
import {
  tinhThuongLoToDon,
  trichXuatSoDuoi,
  tinhThuong2_27,
  tinhThuong3_23,
  tinhThuongCapSo
} from '../tinh-thuong.js';

let donViList = [];
let daiLyList = [];

export async function render() {
  const today = sessionStorage.getItem('xskt_ngay') || new Date().toISOString().slice(0, 10);

  return /* html */ `
    <div class="page-baocao max-w-6xl mx-auto">
      <div class="bg-white border rounded shadow-sm p-4 mb-4">
        <h2 class="text-xl font-bold text-blue-900 border-b pb-2 mb-4 flex items-center gap-2">
          <span>📊</span> BÁO CÁO DOANH THU & RÚT THƯỞNG LÔ TÔ
        </h2>

        <!-- FILTER FORM -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
          <div>
            <label class="block font-semibold mb-1">Ngày báo cáo:</label>
            <input type="date" id="filter-ngay" value="${today}" class="w-full border rounded px-2 py-1.5" />
          </div>

          <div>
            <label class="block font-semibold mb-1">Đơn vị:</label>
            <select id="filter-don-vi" class="w-full border rounded px-2 py-1.5 bg-white">
              <option value="">-- Tất cả các quận huyện --</option>
            </select>
          </div>

          <div>
            <label class="block font-semibold mb-1">Đại lý:</label>
            <select id="filter-dai-ly" class="w-full border rounded px-2 py-1.5 bg-white">
              <option value="">-- Tất cả đại lý --</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4 p-3 bg-gray-50 border rounded">
          <div>
            <span class="block font-semibold mb-1">Loại hình vé:</span>
            <div class="flex flex-wrap gap-4 mt-1">
              <label class="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="filter-loai-hinh" value="all" checked /> Tất cả
              </label>
              <label class="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="filter-loai-hinh" value="dac_biet" /> Đặc biệt
              </label>
              <label class="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="filter-loai-hinh" value="cap_so" /> Cặp số
              </label>
            </div>
          </div>

          <div>
            <span class="block font-semibold mb-1">Hình thức xuất:</span>
            <div class="flex flex-wrap gap-4 mt-1">
              <label class="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="filter-xuat" value="screen" checked /> Màn hình
              </label>
              <label class="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="filter-xuat" value="print" /> Máy in (A4)
              </label>
              <label class="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="filter-xuat" value="excel" /> Xuất Excel
              </label>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t pt-3">
          <button id="btn-xem-bao-cao" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-sm shadow">
            ✓ Chấp nhận
          </button>
        </div>
      </div>

      <!-- REPORT PREVIEW RESULT -->
      <div id="report-result-container" class="bg-white border rounded shadow-sm p-4 hidden">
        <div class="flex justify-between items-center mb-3 pb-2 border-b">
          <h3 class="font-bold text-lg text-blue-900" id="report-title">KẾT QUẢ BÁO CÁO</h3>
          <button id="btn-print-action" class="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-semibold">
            🖨 In ngay
          </button>
        </div>

        <div id="report-content" class="overflow-x-auto">
          <!-- Bảng báo cáo hiển thị ở đây -->
        </div>
      </div>
    </div>
  `;
}

export async function init() {
  await loadFilterData();

  document.getElementById('filter-don-vi')?.addEventListener('change', (e) => {
    updateDaiLyDropdown(e.target.value);
  });

  document.getElementById('btn-xem-bao-cao')?.addEventListener('click', handleGenerateReport);
  document.getElementById('btn-print-action')?.addEventListener('click', () => {
    window.print();
  });
}

async function loadFilterData() {
  try {
    donViList = await getDonViList();
    daiLyList = await getDaiLyList();

    const selDv = document.getElementById('filter-don-vi');
    if (selDv) {
      selDv.innerHTML = '<option value="">-- Tất cả các quận huyện --</option>' +
        donViList.map(dv => `<option value="${dv.id}">${dv.ten || dv.name}</option>`).join('');
    }
    updateDaiLyDropdown('');
  } catch (err) {
    console.error(err);
  }
}

function updateDaiLyDropdown(donViId) {
  const selDl = document.getElementById('filter-dai-ly');
  if (!selDl) return;

  const filtered = donViId ? daiLyList.filter(d => d.donViId === donViId) : daiLyList;
  selDl.innerHTML = '<option value="">-- Tất cả đại lý --</option>' +
    filtered.map(dl => `<option value="${dl.id}">${dl.ma ? dl.ma + ' - ' : ''}${dl.ten || dl.name}</option>`).join('');
}

async function handleGenerateReport() {
  const ngay = document.getElementById('filter-ngay')?.value;
  if (!ngay) {
    showToast('Vui lòng chọn ngày báo cáo.', 'warning');
    return;
  }

  const donViId = document.getElementById('filter-don-vi')?.value;
  const daiLyId = document.getElementById('filter-dai-ly')?.value;
  const loaiHinh = document.querySelector('input[name="filter-loai-hinh"]:checked')?.value || 'all';
  const hinhThucXuat = document.querySelector('input[name="filter-xuat"]:checked')?.value || 'screen';

  const stop = showLoading('Đang tổng hợp dữ liệu báo cáo...');
  try {
    // 1. Fetch tickets
    const veRef = collection(db, COLLECTIONS.VE_LOTO);
    let q = query(veRef, where('ngay', '==', ngay));
    if (daiLyId) {
      q = query(veRef, where('ngay', '==', ngay), where('daiLyId', '==', daiLyId));
    }
    const snap = await getDocs(q);
    const tickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2. Fetch XS result for calculation
    const kyId = ngay.replace(/-/g, '');
    const ketQua = await getKetQuaByKy(kyId);

    // 3. Calculate report
    renderReportTable({ ngay, tickets, ketQua, loaiHinh, daiLyId });

    const container = document.getElementById('report-result-container');
    if (container) container.classList.remove('hidden');

    if (hinhThucXuat === 'print') {
      setTimeout(() => window.print(), 300);
    } else if (hinhThucXuat === 'excel') {
      exportToExcel(ngay);
    }
  } catch (err) {
    console.error('Lỗi tạo báo cáo:', err);
    showToast('Lỗi tạo báo cáo: ' + err.message, 'danger');
  } finally {
    stop?.();
  }
}

function renderReportTable({ ngay, tickets, ketQua, loaiHinh, daiLyId }) {
  const container = document.getElementById('report-content');
  if (!container) return;

  const { ds2So, ds3So23Giai } = trichXuatSoDuoi(ketQua);
  const dbFull = ketQua?.dacBiet || '';

  let html = `
    <div class="text-center mb-4">
      <h3 class="font-bold text-base uppercase">CÔNG TY TNHH MTV XỔ SỐ KIẾN THIẾT NAM ĐỊNH</h3>
      <h4 class="font-bold text-lg text-blue-900 mt-1">BẢNG KÊ RÚT THƯỞNG LÔ TÔ CHI TIẾT THEO ĐẠI LÝ</h4>
      <div class="text-xs text-gray-600 mt-1">Ngày mở thưởng: ${formatDate(ngay)}</div>
      ${dbFull ? `<div class="mt-2 text-sm font-semibold">Giải ĐB: <span class="text-red-600 text-base font-bold">${dbFull}</span> | Giải Nhất: <span class="text-blue-700">${ketQua.giaiNhat || '—'}</span></div>` : '<div class="text-xs text-amber-700 mt-1 font-semibold">* Chưa có kết quả xổ số ngày này, đang tổng hợp doanh thu bán vé</div>'}
    </div>

    <table class="w-full text-xs border-collapse border border-gray-400">
      <thead>
        <tr class="bg-gray-100 text-center font-bold">
          <th class="border border-gray-400 p-2">Mã ĐL</th>
          <th class="border border-gray-400 p-2">Tên Đại Lý</th>
          <th class="border border-gray-400 p-2">Loại hình</th>
          <th class="border border-gray-400 p-2">Doanh thu (đ)</th>
          <th class="border border-gray-400 p-2">Tiền trúng thưởng (đ)</th>
          <th class="border border-gray-400 p-2">Chi tiết trúng</th>
        </tr>
      </thead>
      <tbody>
  `;

  let totalDoanhThu = 0;
  let totalTienThuong = 0;

  if (tickets.length === 0) {
    html += `<tr><td colspan="6" class="text-center py-4 text-gray-500">Không có dữ liệu vé nào cho ngày này.</td></tr>`;
  } else {
    tickets.forEach(ticket => {
      if (loaiHinh !== 'all' && ticket.loaiHinh !== loaiHinh) return;

      const doanhThu = ticket.tongTien || 0;
      totalDoanhThu += doanhThu;

      let tienThuong = 0;
      let trungs = [];

      if (ticket.loaiHinh === 'dac_biet' && dbFull) {
        const r5k = tinhThuongLoToDon(ticket.loTo5K || [], 5000, dbFull);
        const r10k = tinhThuongLoToDon(ticket.loTo10K || [], 10000, dbFull);
        const r20k = tinhThuongLoToDon(ticket.loTo20K || [], 20000, dbFull);
        tienThuong = r5k.tongThuong + r10k.tongThuong + r20k.tongThuong;
        trungs = [...r5k.details, ...r10k.details, ...r20k.details];
      } else if (ticket.loaiHinh === 'cap_so' && ds2So.length > 0) {
        const rCap10 = tinhThuongCapSo(ticket.cap10k || [], 10000, ds2So);
        const rCap20 = tinhThuongCapSo(ticket.cap20k || [], 20000, ds2So);
        const r227 = tinhThuong2_27(ticket['2x27'] || [], 20000, ds2So);
        const r323 = tinhThuong3_23(ticket['3x23'] || [], 20000, ds3So23Giai);
        tienThuong = rCap10.tongThuong + rCap20.tongThuong + r227.tongThuong + r323.tongThuong;
        trungs = [...rCap10.details, ...rCap20.details, ...r227.details, ...r323.details];
      }

      totalTienThuong += tienThuong;

      html += `
        <tr class="hover:bg-blue-50 border-b">
          <td class="border border-gray-300 p-2 text-center font-bold">${ticket.daiLyId}</td>
          <td class="border border-gray-300 p-2 font-medium">${ticket.daiLyTen || '—'}</td>
          <td class="border border-gray-300 p-2 text-center font-semibold text-blue-800">
            ${ticket.loaiHinh === 'dac_biet' ? 'Lô Tô ĐB' : 'Lô Tô Cặp'}
          </td>
          <td class="border border-gray-300 p-2 text-right font-bold text-gray-800">${formatCurrency(doanhThu)}</td>
          <td class="border border-gray-300 p-2 text-right font-bold text-red-600">${formatCurrency(tienThuong)}</td>
          <td class="border border-gray-300 p-2 text-xs">
            ${trungs.length > 0 ? trungs.map(t => `<div class="text-green-700">✓ Số <strong>${t.sdt}</strong>: +${formatCurrency(t.tienThuong)}đ (${t.loaiGiai || t.heSo + 'x'})</div>`).join('') : '<span class="text-gray-400">Không trúng</span>'}
          </td>
        </tr>
      `;
    });
  }

  html += `
      </tbody>
      <tfoot>
        <tr class="bg-gray-100 font-bold border-t-2 border-gray-400">
          <td colspan="3" class="p-2 text-center">TỔNG CỘNG:</td>
          <td class="p-2 text-right text-blue-800">${formatCurrency(totalDoanhThu)} đ</td>
          <td class="p-2 text-right text-red-700">${formatCurrency(totalTienThuong)} đ</td>
          <td class="p-2 text-xs">Chênh lệch: <strong class="${totalDoanhThu >= totalTienThuong ? 'text-green-700' : 'text-red-700'}">${formatCurrency(totalDoanhThu - totalTienThuong)} đ</strong></td>
        </tr>
      </tfoot>
    </table>
  `;

  container.innerHTML = html;
}

function exportToExcel(ngay) {
  if (typeof window.XLSX === 'undefined') {
    showToast('Thư viện Excel chưa được tải, vui lòng in trang hoặc kiểm tra kết nối mạng.', 'warning');
    return;
  }
  const table = document.querySelector('#report-content table');
  if (!table) return;
  const wb = window.XLSX.utils.table_to_book(table, { sheet: "BaoCao" });
  window.XLSX.writeFile(wb, `BaoCao_Loto_${ngay}.xlsx`);
  showToast('Đã tải xuống file Excel!', 'success');
}
