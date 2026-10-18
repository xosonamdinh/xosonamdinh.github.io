/**
 * cauhinh.js - M10: Cấu Hình Hệ Thống & Cơ Cấu Giải Thưởng
 * XSKT Lô Tô Nam Định
 */

import { db, firebaseConfig } from '../firebase-config.js';
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signOut as secondarySignOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
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
import { navigate } from '../router.js?v=20261018_SYNC_ALL';

// Default Prize Multipliers
export const DEFAULT_HE_SO_THUONG = {
  db_2so: 60,
  db_3so: 400,
  db_3so_kk: 5,
  db_4so: 1500,
  db_4so_kk3: 10,
  db_4so_kk2: 5,

  cap_2cap: 10,
  cap_2cap_kk: 15,
  cap_3cap: 42,
  cap_3cap_kk: 1,
  cap_4cap: 130,
  cap_4cap_kk: 2,

  lo227_1lan: 2.25,
  lo227_2lan: 4.5,

  lo323_1lan: 20,
  lo323_2lan: 60,
  lo323_3lan: 150
};

let cachedUsers = [];

export async function render() {
  return /* html */ `
    <div class="page-cauhinh max-w-5xl mx-auto pb-10">
      <div class="page-header mb-4 flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold text-blue-900 flex items-center gap-2">
            <span>⚙️</span> CẤU HÌNH HỆ THỐNG
          </h2>
          <p class="text-sm text-gray-500">Thiết lập thông tin công ty, giờ nhận số, cơ cấu trả thưởng và tài khoản người dùng</p>
        </div>
        <div class="bg-blue-100 text-blue-900 px-3 py-1 rounded text-xs font-bold border border-blue-300">
          🔒 Quyền hạn: Quản trị viên (Admin)
        </div>
      </div>

      <!-- TABS -->
      <div class="flex border-b mb-4 bg-white rounded-t shadow-sm">
        <button class="tab-btn px-4 py-2.5 font-bold text-sm border-b-2 border-blue-600 text-blue-700 flex items-center gap-1.5" data-tab="tab-congty">
          🏢 Thông tin Công ty & Giờ nhận số
        </button>
        <button class="tab-btn px-4 py-2.5 font-bold text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1.5" data-tab="tab-giathuong">
          🎯 Bảng Cơ Cấu Thưởng
        </button>
        <button class="tab-btn px-4 py-2.5 font-bold text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1.5" data-tab="tab-users">
          👥 Quản lý Người dùng
        </button>
      </div>

      <!-- TAB 1: THÔNG TIN CÔNG TY & GIỜ NHẬN SỐ -->
      <div id="tab-congty" class="tab-content space-y-4">
        <!-- Thông tin công ty -->
        <div class="bg-white p-5 border rounded shadow-sm">
          <h3 class="font-bold text-base text-gray-800 mb-3 flex items-center gap-2">
            <span>🏢</span> Thông tin đơn vị phát hành
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label class="block font-semibold mb-1 text-gray-700">Tên Công ty:</label>
              <input type="text" id="cfg-ten-cong-ty" class="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" value="CÔNG TY TNHH MTV XỔ SỐ KIẾN THIẾT NAM ĐỊNH" />
            </div>
            <div>
              <label class="block font-semibold mb-1 text-gray-700">Chi nhánh / Bộ phận:</label>
              <input type="text" id="cfg-chi-nhanh" class="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" value="CHI NHÁNH XS TP. NAM ĐỊNH" />
            </div>
            <div class="md:col-span-2">
              <label class="block font-semibold mb-1 text-gray-700">Địa chỉ:</label>
              <input type="text" id="cfg-dia-chi" class="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" value="Số 157 Trần Hưng Đạo - P. Nam Định - Tỉnh Ninh Bình" />
            </div>
          </div>
          <div class="mt-4 flex justify-end">
            <button id="btn-save-cong-ty" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-sm shadow flex items-center gap-1.5">
              💾 Lưu thông tin công ty
            </button>
          </div>
        </div>

        <!-- Cấu hình thời gian nhận số & Khóa sổ -->
        <div class="bg-white p-5 border rounded shadow-sm border-l-4 border-l-amber-500">
          <h3 class="font-bold text-base text-gray-800 mb-1 flex items-center gap-2">
            <span>⏰</span> Cấu hình thời gian nhận số & Tự động khóa sổ
          </h3>
          <p class="text-xs text-gray-500 mb-4">
            Thiết lập khung giờ cho phép các máy nhập số liệu. Khi đến giờ kết thúc (khóa sổ), hệ thống sẽ tự động chuyển sang trạng thái <strong>ĐÃ KHÓA SỐ LIỆU</strong> và khóa các ô nhập để tránh lỡ tay sửa xóa.
          </p>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-amber-50/50 p-4 rounded border border-amber-200">
            <div>
              <label class="block font-semibold mb-1 text-gray-700">Giờ bắt đầu nhận số:</label>
              <input type="time" id="cfg-gio-bat-dau" class="w-full border rounded p-2 bg-white font-mono font-bold" value="06:00" />
            </div>
            <div>
              <label class="block font-semibold mb-1 text-gray-700">Giờ khóa sổ (hết hạn nhận số):</label>
              <input type="time" id="cfg-gio-khoa-so" class="w-full border rounded p-2 bg-white font-mono font-bold text-red-600 border-red-300 focus:ring-2 focus:ring-red-500" value="18:15" />
            </div>
            <div class="flex flex-col justify-center pt-2">
              <label class="flex items-center gap-2 font-semibold cursor-pointer text-gray-800 select-none">
                <input type="checkbox" id="cfg-tu-dong-khoa" class="w-4 h-4 text-blue-600 rounded" checked />
                <span>Bật tự động khóa sổ theo giờ</span>
              </label>
              <span class="text-xs text-gray-500 mt-1">Khi hết giờ sẽ tự động ngắt nhận số</span>
            </div>
          </div>

          <div class="mt-4 flex justify-end">
            <button id="btn-save-gio-nhan-so" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-sm shadow flex items-center gap-1.5">
              💾 Lưu cấu hình giờ nhận số
            </button>
          </div>
        </div>
      </div>

      <!-- TAB 2: CƠ CẤU GIẢI THƯỞNG (CHỈNH SỬA ĐƯỢC) -->
      <div id="tab-giathuong" class="tab-content bg-white p-5 border rounded shadow-sm hidden">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-2">
          <div>
            <h3 class="font-bold text-base text-gray-800">Bảng quy định hệ số trúng thưởng</h3>
            <p class="text-xs text-gray-500">Hệ số nhân theo mệnh giá vé mua. Bạn có thể nhập trực tiếp số vào các ô bên dưới và bấm Lưu.</p>
          </div>
          <div class="flex gap-2">
            <button id="btn-reset-he-so" class="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded text-xs">
              ↺ Khôi phục mặc định
            </button>
            <button id="btn-save-he-so" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs shadow flex items-center gap-1">
              💾 Lưu bảng cơ cấu thưởng
            </button>
          </div>
        </div>

        <div class="overflow-x-auto text-xs border border-gray-300 rounded">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-blue-100 text-blue-900">
                <th class="border border-gray-300 p-2 text-left w-36">Loại hình lô tô</th>
                <th class="border border-gray-300 p-2 text-left">Điều kiện trúng</th>
                <th class="border border-gray-300 p-2 text-center w-36">Hệ số thưởng (lần)</th>
              </tr>
            </thead>
            <tbody>
              <!-- Lô tô so giải ĐB -->
              <tr>
                <td class="border border-gray-300 p-2 font-bold bg-gray-50" rowspan="6">Lô tô so giải ĐB</td>
                <td class="border border-gray-300 p-2">Trúng 2 số cuối giải Đặc Biệt</td>
                <td class="border border-gray-300 p-2 text-center">
                  <input type="number" step="any" id="hs-db_2so" class="border border-blue-400 rounded px-2 py-1 w-24 text-center font-bold text-blue-800 focus:bg-yellow-50 outline-none" value="60" />
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 p-2">Trúng 3 số cuối giải Đặc Biệt</td>
                <td class="border border-gray-300 p-2 text-center">
                  <input type="number" step="any" id="hs-db_3so" class="border border-blue-400 rounded px-2 py-1 w-24 text-center font-bold text-blue-800 focus:bg-yellow-50 outline-none" value="400" />
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 p-2">Khuyến khích trúng 2 số cuối giải Đặc Biệt (vé 3 số)</td>
                <td class="border border-gray-300 p-2 text-center">
                  <input type="number" step="any" id="hs-db_3so_kk" class="border border-blue-400 rounded px-2 py-1 w-24 text-center font-bold text-blue-800 focus:bg-yellow-50 outline-none" value="5" />
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 p-2">Trúng 4 số cuối giải Đặc Biệt</td>
                <td class="border border-gray-300 p-2 text-center">
                  <input type="number" step="any" id="hs-db_4so" class="border border-blue-400 rounded px-2 py-1 w-24 text-center font-bold text-blue-800 focus:bg-yellow-50 outline-none" value="1500" />
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 p-2">Khuyến khích trúng 3 số cuối giải Đặc Biệt (vé 4 số)</td>
                <td class="border border-gray-300 p-2 text-center">
                  <input type="number" step="any" id="hs-db_4so_kk3" class="border border-blue-400 rounded px-2 py-1 w-24 text-center font-bold text-blue-800 focus:bg-yellow-50 outline-none" value="10" />
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 p-2">Khuyến khích trúng 2 số cuối giải Đặc Biệt (vé 4 số)</td>
                <td class="border border-gray-300 p-2 text-center">
                  <input type="number" step="any" id="hs-db_4so_kk2" class="border border-blue-400 rounded px-2 py-1 w-24 text-center font-bold text-blue-800 focus:bg-yellow-50 outline-none" value="5" />
                </td>
              </tr>

              <!-- Lô tô Cặp số -->
              <tr class="bg-gray-50/50">
                <td class="border border-gray-300 p-2 font-bold bg-gray-50" rowspan="6">Lô tô Cặp số</td>
                <td class="border border-gray-300 p-2">Trúng cả 2 cặp số</td>
                <td class="border border-gray-300 p-2 text-center">
                  <input type="number" step="any" id="hs-cap_2cap" class="border border-blue-400 rounded px-2 py-1 w-24 text-center font-bold text-blue-800 focus:bg-yellow-50 outline-none" value="10" />
                </td>
              </tr>
              <tr class="bg-gray-50/50">
                <td class="border border-gray-300 p-2">Khuyến khích trúng 2 cặp số và có cặp trùng &gt;= 2 lần</td>
                <td class="border border-gray-300 p-2 text-center">
                  <input type="number" step="any" id="hs-cap_2cap_kk" class="border border-blue-400 rounded px-2 py-1 w-24 text-center font-bold text-blue-800 focus:bg-yellow-50 outline-none" value="15" />
                </td>
              </tr>
              <tr class="bg-gray-50/50">
                <td class="border border-gray-300 p-2">Trúng cả 3 cặp số</td>
                <td class="border border-gray-300 p-2 text-center">
                  <input type="number" step="any" id="hs-cap_3cap" class="border border-blue-400 rounded px-2 py-1 w-24 text-center font-bold text-blue-800 focus:bg-yellow-50 outline-none" value="42" />
                </td>
              </tr>
              <tr class="bg-gray-50/50">
                <td class="border border-gray-300 p-2">Khuyến khích trúng 2/3 cặp số</td>
                <td class="border border-gray-300 p-2 text-center">
                  <input type="number" step="any" id="hs-cap_3cap_kk" class="border border-blue-400 rounded px-2 py-1 w-24 text-center font-bold text-blue-800 focus:bg-yellow-50 outline-none" value="1" />
                </td>
              </tr>
              <tr class="bg-gray-50/50">
                <td class="border border-gray-300 p-2">Trúng cả 4 cặp số</td>
                <td class="border border-gray-300 p-2 text-center">
                  <input type="number" step="any" id="hs-cap_4cap" class="border border-blue-400 rounded px-2 py-1 w-24 text-center font-bold text-blue-800 focus:bg-yellow-50 outline-none" value="130" />
                </td>
              </tr>
              <tr class="bg-gray-50/50">
                <td class="border border-gray-300 p-2">Khuyến khích trúng 3/4 cặp số</td>
                <td class="border border-gray-300 p-2 text-center">
                  <input type="number" step="any" id="hs-cap_4cap_kk" class="border border-blue-400 rounded px-2 py-1 w-24 text-center font-bold text-blue-800 focus:bg-yellow-50 outline-none" value="2" />
                </td>
              </tr>

              <!-- Lô tô 2/27 -->
              <tr>
                <td class="border border-gray-300 p-2 font-bold bg-gray-50" rowspan="2">Lô tô 2/27 (so 27 giải)</td>
                <td class="border border-gray-300 p-2">Trúng 1 lần 2 số cuối</td>
                <td class="border border-gray-300 p-2 text-center">
                  <input type="number" step="any" id="hs-lo227_1lan" class="border border-blue-400 rounded px-2 py-1 w-24 text-center font-bold text-blue-800 focus:bg-yellow-50 outline-none" value="2.25" />
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 p-2">Trúng từ 2 lần trở lên 2 số cuối</td>
                <td class="border border-gray-300 p-2 text-center">
                  <input type="number" step="any" id="hs-lo227_2lan" class="border border-blue-400 rounded px-2 py-1 w-24 text-center font-bold text-blue-800 focus:bg-yellow-50 outline-none" value="4.5" />
                </td>
              </tr>

              <!-- Lô tô 3/23 -->
              <tr class="bg-gray-50/50">
                <td class="border border-gray-300 p-2 font-bold bg-gray-50" rowspan="3">Lô tô 3/23 (so 23 giải)</td>
                <td class="border border-gray-300 p-2">Trúng 1 lần 3 số cuối (ĐB đến giải Sáu)</td>
                <td class="border border-gray-300 p-2 text-center">
                  <input type="number" step="any" id="hs-lo323_1lan" class="border border-blue-400 rounded px-2 py-1 w-24 text-center font-bold text-blue-800 focus:bg-yellow-50 outline-none" value="20" />
                </td>
              </tr>
              <tr class="bg-gray-50/50">
                <td class="border border-gray-300 p-2">Trúng 2 lần 3 số cuối (ĐB đến giải Sáu)</td>
                <td class="border border-gray-300 p-2 text-center">
                  <input type="number" step="any" id="hs-lo323_2lan" class="border border-blue-400 rounded px-2 py-1 w-24 text-center font-bold text-blue-800 focus:bg-yellow-50 outline-none" value="60" />
                </td>
              </tr>
              <tr class="bg-gray-50/50">
                <td class="border border-gray-300 p-2">Trúng từ 3 lần trở lên 3 số cuối</td>
                <td class="border border-gray-300 p-2 text-center">
                  <input type="number" step="any" id="hs-lo323_3lan" class="border border-blue-400 rounded px-2 py-1 w-24 text-center font-bold text-blue-800 focus:bg-yellow-50 outline-none" value="150" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 3: QUẢN LÝ NGƯỜI DÙNG (THÊM, SỬA, XÓA) -->
      <div id="tab-users" class="tab-content bg-white p-5 border rounded shadow-sm hidden">
        <div class="flex justify-between items-center mb-3">
          <div>
            <h3 class="font-bold text-base text-gray-800">Danh sách tài khoản nội bộ</h3>
            <p class="text-xs text-gray-500">Quản trị các tài khoản máy nhập, đại lý và quản trị viên</p>
          </div>
          <button id="btn-open-add-user" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold shadow flex items-center gap-1.5">
            ＋ Thêm tài khoản mới
          </button>
        </div>

        <!-- BANNER MÃ MÁY THIẾT BỊ NÀY -->
        <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
          <div>
            <div class="text-xs text-blue-900 font-bold flex items-center gap-1.5">
              <span>💻 Mã máy của thiết bị này:</span>
              <span id="cauhinh-device-mamay" class="px-2 py-0.5 bg-blue-700 text-white font-mono font-bold rounded text-xs">...</span>
            </div>
            <p class="text-[11px] text-gray-600 mt-0.5">
              Mã máy được lưu cố định trên máy tính / trình duyệt này (theo thiết bị thực tế) để nhận diện trạm nhập số khi lưu vé.
            </p>
          </div>
          <button type="button" id="btn-cauhinh-edit-mamay" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs shadow flex items-center gap-1 whitespace-nowrap">
            ✏️ Đổi mã máy thiết bị
          </button>
        </div>

        <div class="overflow-x-auto text-xs border border-gray-300 rounded">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-100 text-left text-gray-700">
                <th class="border border-gray-300 p-2.5 font-bold">Tên hiển thị</th>
                <th class="border border-gray-300 p-2.5 font-bold">Tài khoản / Đăng nhập</th>
                <th class="border border-gray-300 p-2.5 font-bold">Vai trò</th>
                <th class="border border-gray-300 p-2.5 font-bold">Mã máy</th>
                <th class="border border-gray-300 p-2.5 font-bold text-center w-36">Thao tác</th>
              </tr>
            </thead>
            <tbody id="tbody-users">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL THÊM TÀI KHOẢN -->
      <div id="modal-add-user" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 hidden">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-scaleIn">
          <div class="bg-blue-800 text-white px-4 py-3 flex justify-between items-center">
            <h3 class="font-bold text-sm flex items-center gap-2">
              <span>👤</span> Thêm tài khoản người dùng
            </h3>
            <button id="btn-close-add-modal" class="text-white hover:text-red-200 text-lg font-bold">✕</button>
          </div>

          <form id="form-add-user" class="p-4 space-y-3 text-xs">
            <div>
              <label class="block font-semibold mb-1 text-gray-700">Tên hiển thị / Người dùng (*):</label>
              <input type="text" id="add-user-name" required class="w-full border rounded p-2 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Ví dụ: Nhân viên 1" />
            </div>
            <div>
              <label class="block font-semibold mb-1 text-gray-700">Tên đăng nhập / Tài khoản (*):</label>
              <input type="text" id="add-user-email" required class="w-full border rounded p-2 focus:ring-1 focus:ring-blue-500 outline-none font-mono" placeholder="Ví dụ: k, may01, nhanvien1..." />
              <span class="text-[11px] text-gray-500 mt-1 block">💡 Nhập tên bất kỳ (k, may01, nv1...), không bắt buộc phải có đuôi email.</span>
            </div>
            <div>
              <label class="block font-semibold mb-1 text-gray-700">Mật khẩu (* tối thiểu 6 ký tự):</label>
              <input type="password" id="add-user-password" required minlength="6" class="w-full border rounded p-2 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="••••••" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold mb-1 text-gray-700">Vai trò:</label>
                <select id="add-user-role" class="w-full border rounded p-2 bg-white">
                  <option value="may">Máy nhập số (may)</option>
                  <option value="daily">Đại lý (daily)</option>
                  <option value="admin">Quản trị viên (admin)</option>
                </select>
              </div>
              <div>
                <label class="block font-semibold mb-1 text-gray-700">Mã máy:</label>
                <input type="text" id="add-user-mamay" class="w-full border rounded p-2 uppercase font-mono" value="A00" placeholder="A00, A01..." />
              </div>
            </div>

            <div class="pt-3 border-t flex justify-end gap-2">
              <button type="button" id="btn-cancel-add-user" class="px-3 py-1.5 border rounded text-gray-600 hover:bg-gray-100 font-semibold">
                Hủy
              </button>
              <button type="submit" id="btn-submit-add-user" class="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded font-bold shadow">
                Tạo tài khoản
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL SỬA TÀI KHOẢN -->
      <div id="modal-edit-user" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 hidden">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-scaleIn">
          <div class="bg-blue-800 text-white px-4 py-3 flex justify-between items-center">
            <h3 class="font-bold text-sm flex items-center gap-2">
              <span>✏️</span> Chỉnh sửa tài khoản
            </h3>
            <button id="btn-close-edit-modal" class="text-white hover:text-red-200 text-lg font-bold">✕</button>
          </div>

          <form id="form-edit-user" class="p-4 space-y-3 text-xs">
            <input type="hidden" id="edit-user-uid" />
            <div>
              <label class="block font-semibold mb-1 text-gray-700">Tên đăng nhập / Tài khoản:</label>
              <input type="text" id="edit-user-email" disabled class="w-full border rounded p-2 bg-gray-100 text-gray-700 font-mono cursor-not-allowed" />
            </div>
            <div>
              <label class="block font-semibold mb-1 text-gray-700">Tên hiển thị (*):</label>
              <input type="text" id="edit-user-name" required class="w-full border rounded p-2 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold mb-1 text-gray-700">Vai trò:</label>
                <select id="edit-user-role" class="w-full border rounded p-2 bg-white">
                  <option value="may">Máy nhập số (may)</option>
                  <option value="daily">Đại lý (daily)</option>
                  <option value="admin">Quản trị viên (admin)</option>
                </select>
              </div>
              <div>
                <label class="block font-semibold mb-1 text-gray-700">Mã máy:</label>
                <input type="text" id="edit-user-mamay" class="w-full border rounded p-2 uppercase font-mono" />
              </div>
            </div>

            <div class="pt-3 border-t flex justify-end gap-2">
              <button type="button" id="btn-cancel-edit-user" class="px-3 py-1.5 border rounded text-gray-600 hover:bg-gray-100 font-semibold">
                Hủy
              </button>
              <button type="submit" id="btn-submit-edit-user" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow">
                Cập nhật
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `;
}

export async function init() {
  // Check admin permission
  const profile = JSON.parse(sessionStorage.getItem('xskt_profile') || '{}');
  const role = profile?.role || 'admin';
  if (role !== 'admin') {
    showToast('Chỉ có tài khoản Quản trị viên (Admin) mới có quyền truy cập Cấu hình!', 'warning');
    navigate('#/dashboard');
    return;
  }

  setupTabs();
  await loadCompanyConfig();
  await loadGioNhanSoConfig();
  await loadHeSoThuongConfig();
  await loadUserList();

  // Tab 1 bindings
  document.getElementById('btn-save-cong-ty')?.addEventListener('click', saveCompanyConfig);
  document.getElementById('btn-save-gio-nhan-so')?.addEventListener('click', saveGioNhanSoConfig);

  // Tab 2 bindings
  document.getElementById('btn-save-he-so')?.addEventListener('click', saveHeSoThuongConfig);
  document.getElementById('btn-reset-he-so')?.addEventListener('click', resetHeSoThuongConfig);

  // Tab 3 User Management bindings
  setupUserModals();

  // Device MaMay banner
  const updateDeviceMaMayBanner = () => {
    const el = document.getElementById('cauhinh-device-mamay');
    if (el) el.textContent = (localStorage.getItem('xskt_ma_may') || 'A01').toUpperCase();
  };
  updateDeviceMaMayBanner();

  document.getElementById('btn-cauhinh-edit-mamay')?.addEventListener('click', () => {
    document.getElementById('btn-edit-device-mamay')?.click() || document.getElementById('info-ma-may')?.click();
  });
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

// ============================================================
// 1. CÔNG TY & GIỜ NHẬN SỐ
// ============================================================
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
    console.error('loadCompanyConfig err:', err);
  }
}

async function saveCompanyConfig() {
  const ten = document.getElementById('cfg-ten-cong-ty')?.value;
  const chiNhanh = document.getElementById('cfg-chi-nhanh')?.value;
  const diaChi = document.getElementById('cfg-dia-chi')?.value;

  const stop = showLoading('Đang lưu thông tin công ty...');
  try {
    await setDoc(doc(db, 'config', 'congTy'), {
      ten,
      chiNhanh,
      diaChi,
      updatedAt: serverTimestamp()
    }, { merge: true });
    showToast('Đã lưu cấu hình công ty thành công!', 'success');
  } catch (err) {
    console.error(err);
    showToast('Lỗi lưu cấu hình: ' + err.message, 'danger');
  } finally {
    stop?.();
  }
}

async function loadGioNhanSoConfig() {
  try {
    const snap = await getDoc(doc(db, 'config', 'gioNhanSo'));
    if (snap.exists()) {
      const data = snap.data();
      if (data.gioBatDau) document.getElementById('cfg-gio-bat-dau').value = data.gioBatDau;
      if (data.gioKhoaSo) document.getElementById('cfg-gio-khoa-so').value = data.gioKhoaSo;
      if (typeof data.tuDongKhoa === 'boolean') document.getElementById('cfg-tu-dong-khoa').checked = data.tuDongKhoa;
    }
  } catch (err) {
    console.error('loadGioNhanSoConfig err:', err);
  }
}

async function saveGioNhanSoConfig() {
  const gioBatDau = document.getElementById('cfg-gio-bat-dau')?.value || '06:00';
  const gioKhoaSo = document.getElementById('cfg-gio-khoa-so')?.value || '18:15';
  const tuDongKhoa = document.getElementById('cfg-tu-dong-khoa')?.checked ?? true;

  const stop = showLoading('Đang lưu cấu hình giờ...');
  try {
    await setDoc(doc(db, 'config', 'gioNhanSo'), {
      gioBatDau,
      gioKhoaSo,
      tuDongKhoa,
      updatedAt: serverTimestamp()
    }, { merge: true });
    showToast(`Đã lưu cấu hình thời gian nhận số (Khóa sổ lúc ${gioKhoaSo})!`, 'success');
  } catch (err) {
    console.error(err);
    showToast('Lỗi lưu cấu hình giờ: ' + err.message, 'danger');
  } finally {
    stop?.();
  }
}

// ============================================================
// 2. BẢNG CƠ CẤU THƯỞNG (HỆ SỐ TRÚNG THƯỞNG)
// ============================================================
async function loadHeSoThuongConfig() {
  try {
    const snap = await getDoc(doc(db, 'config', 'heSoThuong'));
    const values = snap.exists() ? { ...DEFAULT_HE_SO_THUONG, ...snap.data() } : DEFAULT_HE_SO_THUONG;

    Object.keys(DEFAULT_HE_SO_THUONG).forEach(key => {
      const el = document.getElementById(`hs-${key}`);
      if (el && values[key] !== undefined) {
        el.value = values[key];
      }
    });
  } catch (err) {
    console.error('loadHeSoThuongConfig err:', err);
  }
}

async function saveHeSoThuongConfig() {
  const payload = {};
  Object.keys(DEFAULT_HE_SO_THUONG).forEach(key => {
    const el = document.getElementById(`hs-${key}`);
    payload[key] = el ? parseFloat(el.value) || DEFAULT_HE_SO_THUONG[key] : DEFAULT_HE_SO_THUONG[key];
  });

  const stop = showLoading('Đang lưu bảng cơ cấu thưởng...');
  try {
    await setDoc(doc(db, 'config', 'heSoThuong'), {
      ...payload,
      updatedAt: serverTimestamp()
    }, { merge: true });
    showToast('Đã lưu bảng cơ cấu thưởng thành công!', 'success');
  } catch (err) {
    console.error('saveHeSoThuongConfig err:', err);
    showToast('Lỗi lưu cơ cấu thưởng: ' + err.message, 'danger');
  } finally {
    stop?.();
  }
}

function resetHeSoThuongConfig() {
  if (!confirm('Khôi phục toàn bộ hệ số trúng thưởng về mức tiêu chuẩn mặc định?')) return;
  Object.keys(DEFAULT_HE_SO_THUONG).forEach(key => {
    const el = document.getElementById(`hs-${key}`);
    if (el) el.value = DEFAULT_HE_SO_THUONG[key];
  });
  showToast('Đã điền các mức mặc định, bấm "Lưu bảng cơ cấu thưởng" để áp dụng.', 'info');
}

// ============================================================
// 3. QUẢN LÝ NGƯỜI DÙNG (THÊM, SỬA, XÓA)
// ============================================================
async function loadUserList() {
  const tbody = document.getElementById('tbody-users');
  if (!tbody) return;

  try {
    const snap = await getDocs(collection(db, 'users'));
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">Chưa có người dùng nào.</td></tr>`;
      cachedUsers = [];
      return;
    }

    cachedUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() }));

    const roleBadge = (role) => {
      switch (role) {
        case 'admin': return `<span class="px-2 py-0.5 rounded text-[11px] bg-red-100 text-red-800 font-bold border border-red-300">Quản trị viên</span>`;
        case 'may':   return `<span class="px-2 py-0.5 rounded text-[11px] bg-blue-100 text-blue-800 font-bold border border-blue-300">Máy nhập</span>`;
        default:      return `<span class="px-2 py-0.5 rounded text-[11px] bg-gray-100 text-gray-800 font-semibold border border-gray-300">${role || 'Đại lý'}</span>`;
      }
    };

    tbody.innerHTML = cachedUsers.map(u => {
      const displayAccount = u.username || (u.email ? u.email.replace('@xskt.vn', '') : u.uid);
      return `
      <tr class="hover:bg-blue-50/60 border-b transition-colors" data-uid="${u.uid}">
        <td class="border border-gray-300 p-2.5 font-bold text-gray-900">${u.displayName || u.ten || '—'}</td>
        <td class="border border-gray-300 p-2.5 font-mono text-gray-700 font-bold text-blue-700">${displayAccount}</td>
        <td class="border border-gray-300 p-2.5">${roleBadge(u.role)}</td>
        <td class="border border-gray-300 p-2.5 font-mono font-bold text-blue-900">${u.maMay || 'A00'}</td>
        <td class="border border-gray-300 p-2.5 text-center space-x-1.5 whitespace-nowrap">
          <button class="btn-edit-user px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold text-[11px] shadow" data-uid="${u.uid}">
            ✏️ Sửa
          </button>
          <button class="btn-del-user px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[11px] shadow" data-uid="${u.uid}">
            🗑️ Xóa
          </button>
        </td>
      </tr>
    `}).join('');

    // Attach click events
    tbody.querySelectorAll('.btn-edit-user').forEach(btn => {
      btn.addEventListener('click', () => openEditUserModal(btn.dataset.uid));
    });

    tbody.querySelectorAll('.btn-del-user').forEach(btn => {
      btn.addEventListener('click', () => handleDeleteUser(btn.dataset.uid));
    });

  } catch (err) {
    console.error('loadUserList err:', err);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">Lỗi tải danh sách người dùng: ${err.message}</td></tr>`;
  }
}

function setupUserModals() {
  const modalAdd = document.getElementById('modal-add-user');
  const modalEdit = document.getElementById('modal-edit-user');

  document.getElementById('btn-open-add-user')?.addEventListener('click', () => {
    document.getElementById('form-add-user')?.reset();
    modalAdd?.classList.remove('hidden');
  });

  document.getElementById('btn-close-add-modal')?.addEventListener('click', () => modalAdd?.classList.add('hidden'));
  document.getElementById('btn-cancel-add-user')?.addEventListener('click', () => modalAdd?.classList.add('hidden'));

  document.getElementById('btn-close-edit-modal')?.addEventListener('click', () => modalEdit?.classList.add('hidden'));
  document.getElementById('btn-cancel-edit-user')?.addEventListener('click', () => modalEdit?.classList.add('hidden'));

  // Submit Add User
  document.getElementById('form-add-user')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('add-user-name')?.value.trim();
    const rawLogin = document.getElementById('add-user-email')?.value.trim();
    const password = document.getElementById('add-user-password')?.value;
    const role = document.getElementById('add-user-role')?.value || 'may';
    const maMay = document.getElementById('add-user-mamay')?.value.trim() || 'A00';

    if (!name || !rawLogin || !password) {
      showToast('Vui lòng điền đầy đủ thông tin!', 'warning');
      return;
    }
    if (password.length < 6) {
      showToast('Mật khẩu tối thiểu 6 ký tự!', 'warning');
      return;
    }

    const email = rawLogin.includes('@') ? rawLogin.toLowerCase() : `${rawLogin.toLowerCase()}@xskt.vn`;
    const cleanUsername = rawLogin.toLowerCase().replace('@xskt.vn', '');

    const stop = showLoading('Đang tạo tài khoản mới...');
    try {
      // Use Secondary App to create user so Admin is NOT signed out
      const secondaryAppName = 'SecondaryApp_' + Date.now();
      const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUid = cred.user.uid;

      // Save user profile in Firestore
      await setDoc(doc(db, 'users', newUid), {
        displayName: name,
        username: cleanUsername,
        email: email,
        role: role,
        maMay: maMay,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Sign out secondary app
      await secondarySignOut(secondaryAuth);

      showToast(`Đã tạo tài khoản "${rawLogin}" thành công!`, 'success');
      modalAdd?.classList.add('hidden');
      await loadUserList();
    } catch (err) {
      console.error('Create user error:', err);
      showToast('Lỗi tạo tài khoản: ' + err.message, 'danger');
    } finally {
      stop?.();
    }
  });

  // Submit Edit User
  document.getElementById('form-edit-user')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const uid = document.getElementById('edit-user-uid')?.value;
    const name = document.getElementById('edit-user-name')?.value.trim();
    const role = document.getElementById('edit-user-role')?.value;
    const maMay = document.getElementById('edit-user-mamay')?.value.trim() || 'A00';

    if (!uid || !name) return;

    const stop = showLoading('Đang cập nhật thông tin...');
    try {
      await setDoc(doc(db, 'users', uid), {
        displayName: name,
        role: role,
        maMay: maMay,
        updatedAt: serverTimestamp()
      }, { merge: true });

      showToast('Cập nhật tài khoản thành công!', 'success');
      modalEdit?.classList.add('hidden');
      await loadUserList();
    } catch (err) {
      console.error('Update user err:', err);
      showToast('Lỗi cập nhật: ' + err.message, 'danger');
    } finally {
      stop?.();
    }
  });
}

function openEditUserModal(uid) {
  const user = cachedUsers.find(u => u.uid === uid);
  if (!user) return;

  const displayAccount = user.username || (user.email ? user.email.replace('@xskt.vn', '') : user.uid);
  document.getElementById('edit-user-uid').value = user.uid;
  document.getElementById('edit-user-email').value = displayAccount;
  document.getElementById('edit-user-name').value = user.displayName || user.ten || '';
  document.getElementById('edit-user-role').value = user.role || 'may';
  document.getElementById('edit-user-mamay').value = user.maMay || 'A00';

  document.getElementById('modal-edit-user')?.classList.remove('hidden');
}

async function handleDeleteUser(uid) {
  const user = cachedUsers.find(u => u.uid === uid);
  const name = user?.displayName || user?.username || (user?.email ? user.email.replace('@xskt.vn', '') : uid);

  const currentAuthUid = JSON.parse(sessionStorage.getItem('xskt_profile') || '{}')?.uid;
  if (uid === currentAuthUid) {
    showToast('Không thể xóa chính tài khoản bạn đang đăng nhập!', 'warning');
    return;
  }

  if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${name}" khỏi hệ thống?`)) return;

  const stop = showLoading('Đang xóa tài khoản...');
  try {
    await deleteDoc(doc(db, 'users', uid));
    showToast(`Đã xóa tài khoản "${name}" thành công!`, 'success');
    await loadUserList();
  } catch (err) {
    console.error('Delete user err:', err);
    showToast('Lỗi xóa tài khoản: ' + err.message, 'danger');
  } finally {
    stop?.();
  }
}
