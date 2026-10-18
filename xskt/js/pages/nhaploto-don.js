/**
 * nhaploto-don.js - M5A: Nhập Lô Tô So Giải Đặc Biệt (Giao diện chuẩn Desktop Phần Mềm Gốc)
 * XSKT Lô Tô Nam Định
 *
 * Tái hiện 100% giao diện phần mềm Windows gốc theo ảnh chụp người dùng:
 * - Header chuẩn: Máy A00, Ngày MT, Mã ĐL, Tên đại lý đỏ đậm, Tiêu đề đỏ, Subtitle LÔ TÔ - VÉ 5000Đ, ĐÃ KHOÁ SỐ LIỆU, Doanh thu bổ sung, Đồng hồ.
 * - Sidebar trái: Tờ số, Các link xanh nghiêng (Kiểm tra DT, In bảng kê, Kiểm tra Đại lý F3, Đổi tờ, Đổi ĐL), Dàn nút xám chuẩn Windows, Bảng hướng dẫn phím tắt xanh thẫm.
 * - Lưới nhập số: 3 phân khu (Lô tô 5000đ, 10 000đ, 20 000đ so giải ĐB). Mỗi khu 20 dòng, mỗi dòng 4 cột nhập. Kẻ vạch đỏ ngăn cách sau dòng 05, 10, 15.
 * - Bảng tổng hợp chân trang chuẩn: Bổ sung 5K, 10K, 20K. Bảng master 7 cột (Loại vé, 2-3-4 số ĐB, 2-3-4 số giải nhất, 2-3-4 cặp số, Lô bao 3X23/2X27, Tổng vé, Tổng tiền).
 */

import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db } from '../firebase-config.js';
import {
  getDaiLyList,
  getKyMoThuong,
  lockKyMoThuong,
  unlockKyMoThuong,
  saveVeLoTo,
  getVeLoToByNgayDaiLy,
  getVeLoToByNgay,
  getOrCreateDaiLy
} from '../db.js?v=20261018_HOTKEY_V2';
import {
  showToast,
  showLoading,
  formatCurrency,
  formatDate
} from '../utils.js';
import { navigate } from '../router.js?v=20261018_SYNC_ALL';

let currentNgay = sessionStorage.getItem('xskt_ngay') || new Date().toISOString().slice(0, 10);
let currentDaiLyId = '';
let currentDaiLy = null;
let daiLyList = [];
let isLocked = false;
let isOverTime = false;
let isSessionLocked = false;
let isSheetLocked = false;
let currentToSo = 1;

const TOTAL_ROWS = 20;
const SECTIONS = ['5k', '10k'];
const COLS_PER_SECTION = 4;

export async function render() {
  return /* html */ `
    <div class="classic-loto-page select-none flex flex-col gap-1 max-w-[1440px] mx-auto text-[11px] font-sans bg-[#e8ecf0] p-1.5 rounded border border-[#94a3b8]">
      
      <!-- ═════════════════════════════════════════════════════════════════
           KHU VỰC HEADER CHUẨN PHẦN MỀM GỐC
           ═════════════════════════════════════════════════════════════════ -->
      <div class="bg-gradient-to-r from-[#10346e] via-[#1a4b91] to-[#2563eb] text-white px-3 py-1.5 rounded-t shadow flex flex-wrap justify-between items-center gap-2 border-b border-[#0d2a57]">
        
        <!-- TRÁI: THÔNG TIN MÁY, NGÀY MT, MÃ ĐL, TÊN ĐẠI LÝ -->
        <div class="flex flex-col gap-0.5 min-w-[240px]">
          <div class="flex items-center gap-2">
            <span class="font-bold text-yellow-300">Máy A00</span>
            <span class="text-blue-200 text-[10px] font-mono">A00180001000</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-semibold text-white">Ngày MT</span>
            <input 
              type="text" 
              id="input-ngay-mt" 
              value="${formatDate(currentNgay)}" 
              class="classic-input text-red-600 font-extrabold w-24 text-center cursor-pointer"
              title="Nhấn F11 hoặc đổi ngày làm việc"
              readonly
            />
            <span class="font-semibold text-white ml-1">Mã ĐL</span>
            <input 
              type="text" 
              id="input-ma-dl" 
              value="---" 
              placeholder="001" 
              class="classic-input text-blue-900 font-extrabold w-16 text-center uppercase"
              title="Gõ mã ĐL rồi Enter để nạp nhanh"
            />
          </div>
          <div id="lbl-ten-dai-ly" class="text-red-300 font-extrabold text-sm tracking-wide truncate max-w-[260px] pt-0.5">
            -- Chưa chọn đại lý --
          </div>
        </div>

        <!-- GIỮA: TIÊU ĐỀ BẢNG KÊ & TRẠNG THÁI KHÓA -->
        <div class="flex-1 text-center flex flex-col items-center">
          <h1 class="text-red-400 font-black text-sm md:text-base tracking-wider uppercase drop-shadow-sm">
            BẢNG KÊ SỐ DỰ THƯỞNG XỔ SỐ LÔ TÔ SO GIẢI ĐẶC BIỆT
          </h1>
          <div class="flex flex-wrap items-center justify-center gap-3 mt-0.5">
            <span class="text-yellow-300 font-black text-sm tracking-wide">
              LÔ TÔ - VÉ 5 000Đ
            </span>
            <span id="lbl-het-gio" class="text-red-300 text-[11px] font-bold">
              Hết giờ truyền số liệu!
            </span>
            <span id="badge-lock-status" class="text-red-200 font-black text-xs uppercase px-1.5 py-0.5 rounded bg-red-900/60 border border-red-500">
              ĐÃ KHOÁ SỐ LIỆU!
            </span>
            <div class="flex items-center gap-1 text-[11px]">
              <span class="text-blue-100">Doanh thu bổ sung</span>
              <input 
                type="text" 
                id="input-dt-bo-sung" 
                value="0" 
                class="classic-input w-16 text-right font-bold text-gray-800"
              />
            </div>
          </div>
        </div>

        <!-- PHẢI: ĐỒNG HỒ SỐ & CHUYỂN NHANH -->
        <div class="flex flex-col items-end gap-1">
          <span id="clock-classic" class="font-mono font-bold text-white text-xs bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700">
            20:31:19
          </span>
          <div class="flex items-center gap-1">
            <button id="btn-quick-lock-toggle" class="classic-btn font-bold text-[10px] px-2 py-0.5" title="Phím tắt F10 để Khóa / Mở khóa">
              🔒 Khóa sổ
            </button>
            <button id="btn-switch-cap-top" class="classic-btn font-bold text-[10px] px-2 py-0.5 text-blue-900" title="Phím tắt * hoặc F10">
              🎟 Cặp số (*)
            </button>
          </div>
        </div>

      </div>

      <!-- ═════════════════════════════════════════════════════════════════
           THÂN CHÍNH: CỘT TRÁI (THAO TÁC + PHÍM TẮT) & CỘT PHẢI (LƯỚI NHẬP SỐ)
           ═════════════════════════════════════════════════════════════════ -->
      <div class="flex flex-col lg:flex-row gap-1.5 items-start">
        
        <!-- CỘT BÊN TRÁI (~200px) -->
        <div class="w-full lg:w-48 flex-shrink-0 flex flex-col gap-1">
          
          <!-- KHỐI ĐIỀU HƯỚNG TỜ SỐ VÀ CÁC ĐƯỜNG LINK THAO TÁC -->
          <div class="bg-[#d2d8e0] border border-[#7a889b] p-1.5 rounded shadow-sm flex flex-col gap-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-blue-950">Tờ số</span>
              <div class="flex items-center gap-1">
                <button id="btn-to-truoc" class="classic-btn px-1.5 py-0.5 font-bold" title="Tờ trước (F5)">◀</button>
                <input 
                  type="text" 
                  id="input-to-so" 
                  value="${currentToSo}" 
                  class="classic-input w-12 text-center font-bold text-blue-950 text-xs" 
                />
                <button id="btn-to-tiep" class="classic-btn px-1.5 py-0.5 font-bold" title="Tờ tiếp (F6)">▶</button>
              </div>
            </div>

            <!-- HIỂN THỊ MÃ MÁY NHẬP DỮ LIỆU TỜ VÉ NÀY -->
            <div id="sheet-mamay-badge" class="text-[10px] text-blue-950 font-mono font-semibold bg-blue-50 border border-blue-200 px-1 py-0.5 rounded text-center" title="Xem mã máy đã nhập dữ liệu của tờ này">
              💻 Máy nhập: —
            </div>

            <!-- CÁC LINK XANH NGHIÊNG GẠCH CHÂN CHUẨN HÌNH -->
            <div class="flex flex-col gap-0.5 pt-1 border-t border-gray-300">
              <button id="lnk-kiem-tra-dt" class="classic-link-btn">Kiểm tra DT (Ctrl+F5)</button>
              <button id="lnk-in-bang-ke" class="classic-link-btn">In bảng kê</button>
              <button id="lnk-kiem-tra-f3" class="classic-link-btn">Kiểm tra Đại lý - F3</button>
              <button id="lnk-doi-to" class="classic-link-btn">Đổi tờ đại lý</button>
              <button id="lnk-doi-dai-ly" class="classic-link-btn">Đổi đại lý (F11)</button>
            </div>
          </div>

          <!-- DÀN NÚT XÁM CHUẨN WINDOWS CLASSIC (11 NÚT) -->
          <div class="flex flex-col gap-1">
            <button id="btn-action-xoa-to" class="classic-btn w-full">Xoá tờ hiện tại</button>
            <button id="btn-action-xoa-daily" class="classic-btn w-full">Xoá đại lý hiện tại</button>
            <button id="btn-action-xoa-ngay" class="classic-btn w-full">Xoá dữ liệu ngày</button>
            <button id="btn-action-tong-hop-dt" class="classic-btn w-full font-semibold">Tổng hợp DT - rút thưởng</button>
            <button id="btn-action-bao-cao-nhanh" class="classic-btn w-full">Báo cáo nhanh</button>
            <button id="btn-action-hop-so-fax" class="classic-btn w-full">Tổng hợp số liệu để Fax</button>
            <button id="btn-action-bang-ke-th" class="classic-btn w-full">Bảng kê tổng hợp số dự thưởng</button>
            <button id="btn-action-bang-ke-to" class="classic-btn w-full">Bảng kê TH số dự thưởng theo tổ</button>
            <button id="btn-action-truyen-so-lieu" class="classic-btn w-full">Truyền số liệu</button>
            <button id="btn-action-thoat" class="classic-btn w-full font-bold text-red-700">Thoát</button>
            <button id="btn-action-switch-page" class="classic-btn w-full font-bold text-blue-900 bg-blue-100">
              Chuyển Nhập Lô tô Cặp và 3/23
            </button>
          </div>

          <!-- KHUNG HƯỚNG DẪN PHÍM TẮT XANH THẪM CHUẨN HÌNH GỐC -->
          <div class="bg-[#0f2952] text-white p-2 rounded border border-[#1e40af] text-[10px] leading-relaxed shadow space-y-1">
            <div class="text-yellow-300 font-bold leading-tight">
              Tổng theo tờ hiện tại Máy A00 (Sử dụng phím F2 (Ctrl+F2)->Tổng ĐL, F4 (Ctrl+F4)->Tổng ngày, (Ctrl - Tất cả các ...))
            </div>
            <div class="text-blue-200 pt-0.5 space-y-0.5 font-mono">
              <div>+N or .N -&gt;Nhảy đến ô N</div>
              <div>SDT+ N-&gt;Nhập N Số dự thưởng</div>
              <div>SDT.N-&gt;Nhập SDT đến ô N</div>
              <div>SDT/N-&gt;Nhập SDT Trên N ô</div>
              <div>-N -&gt; Xoá N vé (đến ô N)</div>
              <div class="text-yellow-200">F2-&gt;Tổng đại lý; F4-&gt;Tổng ngày</div>
              <div>F5 -&gt; Tờ trước, F6 -&gt; Tờ tiếp</div>
              <div>F7 -&gt; Chèn ô, F8 -&gt; Xoá ô</div>
              <div class="text-green-300">F9-&gt;Đổi loại vé, F10-&gt;Bỏ khoá</div>
              <div>Ctrl+F3-&gt; Kiểm tra ĐL Lệch DT</div>
              <div class="text-yellow-300 font-bold">PgDn or F11 -&gt; Chuyển đại lý</div>
              <div class="text-yellow-300 font-bold">PaUp hoặc F12 -&gt;Chuyển loại hình</div>
            </div>
            <div class="pt-1.5 border-t border-blue-800 flex gap-1">
              <button id="btn-save-loto" class="w-full py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-[11px] shadow">
                💾 Lưu (Ctrl+S)
              </button>
            </div>
          </div>

        </div>

        <!-- CỘT BÊN PHẢI: KHUNG LƯỚI ĐA Ô 2 PHÂN KHU + THANH BỔ SUNG + BẢNG TỔNG HỢP (LIỀN SÁT NHAU) -->
        <div class="flex-1 w-full overflow-x-auto bg-white border border-[#7a889b] shadow-sm rounded flex flex-col">
          <div class="grid grid-cols-1 md:grid-cols-2 divide-x divide-[#7a889b]">
            
            <!-- PHÂN KHU 1: Lô tô 5000đ so giải đặc biệt -->
            <div class="flex flex-col">
              <div class="bg-[#716f64] text-white font-bold text-center py-1 text-[11px] tracking-wide uppercase">
                Lô tô 5000đ so giải đặc biệt
              </div>
              <table class="classic-grid-table">
                <tbody>
                  ${generateGridRows('5k')}
                </tbody>
              </table>
            </div>

            <!-- PHÂN KHU 2: Lô tô 10 000đ so giải đặc biệt -->
            <div class="flex flex-col">
              <div class="bg-[#716f64] text-white font-bold text-center py-1 text-[11px] tracking-wide uppercase">
                Lô tô 10 000đ so giải đặc biệt
              </div>
              <table class="classic-grid-table">
                <tbody>
                  ${generateGridRows('10k')}
                </tbody>
              </table>
            </div>

          </div>

          <!-- THANH BỔ SUNG LÔ TÔ 5.000 & 10.000 (SÁT VỚI DÒNG CUỐI CỦA BẢNG) -->
          <div class="bonus-bar-don border-t border-[#7a889b]">
            <div class="flex items-center justify-between px-2">
              <span class="font-bold">Bổ sung lô tô 5.000:</span>
              <input 
                type="text" 
                id="input-bs-5k" 
                value="0" 
                class="input-bo-sung classic-input w-14 text-right font-black text-blue-900 bg-white border border-[#7a889b] px-1 py-0.5 rounded text-xs outline-none focus:bg-yellow-100 focus:ring-1 focus:ring-blue-500" 
                title="Nhập số lượng vé bổ sung rồi Enter"
                autocomplete="off"
              />
            </div>
            <div class="flex items-center justify-between px-2">
              <span class="font-bold">Bổ sung lô tô 10.000:</span>
              <input 
                type="text" 
                id="input-bs-10k" 
                value="0" 
                class="input-bo-sung classic-input w-14 text-right font-black text-blue-900 bg-white border border-[#7a889b] px-1 py-0.5 rounded text-xs outline-none focus:bg-yellow-100 focus:ring-1 focus:ring-blue-500" 
                title="Nhập số lượng vé bổ sung rồi Enter"
                autocomplete="off"
              />
            </div>
          </div>

          <!-- BẢNG TỔNG HỢP MASTER THEO CẤU TRÚC PHẦN MỀM GỐC (SÁT VỚI THANH BỔ SUNG) -->
          <table class="master-summary-table">
            <thead>
              <tr>
                <th rowspan="2" style="width: 85px;">Loại vé</th>
                <th colspan="4">2,3,4 số so giải đặc biệt</th>
                <th colspan="4">2,3,4 cặp số</th>
                <th colspan="2">Lô bao</th>
                <th rowspan="2" style="width: 65px;">Tổng vé</th>
                <th rowspan="2" style="width: 75px;">Tổng tiền</th>
              </tr>
              <tr>
                <th style="width: 45px;">2 số</th>
                <th style="width: 45px;">3 số</th>
                <th style="width: 45px;">4 số</th>
                <th style="width: 50px; font-weight: 800;">Cộng</th>
                <th style="width: 40px;">2 cặp</th>
                <th style="width: 40px;">3 cặp</th>
                <th style="width: 40px;">4 cặp</th>
                <th style="width: 45px;">Cộng</th>
                <th style="width: 45px; color: #dc2626;">3X23</th>
                <th style="width: 45px; color: #dc2626;">2X27</th>
              </tr>
            </thead>
            <tbody>
              <!-- DÒNG VÉ 5.000 đ -->
              <tr class="row-ve">
                <td class="text-left font-bold pl-2">Vé 5 000 đ</td>
                <td id="count-5k-2so">0</td>
                <td id="count-5k-3so">0</td>
                <td id="count-5k-4so">0</td>
                <td id="sum-ve-5k" class="font-extrabold">0</td>
                <td>0</td><td>0</td><td>0</td><td>0</td>
                <td>0</td><td>0</td>
                <td id="total-ve-5k" class="font-bold">0</td>
                <td id="total-tien-5k" class="font-bold text-right pr-2">0</td>
              </tr>

              <!-- DÒNG VÉ 10.000 đ -->
              <tr class="row-ve">
                <td class="text-left font-bold pl-2">Vé 10 000 đ</td>
                <td id="count-10k-2so">0</td>
                <td id="count-10k-3so">0</td>
                <td id="count-10k-4so">0</td>
                <td id="sum-ve-10k" class="font-extrabold">0</td>
                <td>0</td><td>0</td><td>0</td><td>0</td>
                <td>0</td><td>0</td>
                <td id="total-ve-10k" class="font-bold">0</td>
                <td id="total-tien-10k" class="font-bold text-right pr-2">0</td>
              </tr>

              <!-- DÒNG VÉ 20.000 đ -->
              <tr class="row-ve">
                <td class="text-left font-bold pl-2">Vé 20 000 đ</td>
                <td id="count-20k-2so">0</td>
                <td id="count-20k-3so">0</td>
                <td id="count-20k-4so">0</td>
                <td id="sum-ve-20k" class="font-extrabold">0</td>
                <td>0</td><td>0</td><td>0</td><td>0</td>
                <td>0</td><td>0</td>
                <td id="total-ve-20k" class="font-bold">0</td>
                <td id="total-tien-20k" class="font-bold text-right pr-2">0</td>
              </tr>

              <!-- DÒNG THÀNH TIỀN -->
              <tr class="row-thanh-tien">
                <td class="text-left font-black pl-2">Thành Tiền</td>
                <td id="total-tien-2so">0</td>
                <td id="total-tien-3so">0</td>
                <td id="total-tien-4so">0</td>
                <td id="total-tien-cong">0</td>
                <td>0</td><td>0</td><td>0</td><td>0</td>
                <td>0</td><td>0</td>
                <td id="grand-total-ve" class="font-black text-red-600">0</td>
                <td id="grand-total-tien" class="font-black text-red-700 text-right pr-2">0</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      <!-- MODAL F11: NHẬP MÃ ĐẠI LÝ -->
      <div id="modal-f11-daily" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 hidden">
        <div class="bg-white rounded-lg shadow-2xl border-2 border-blue-600 w-full max-w-md overflow-hidden">
          <div class="bg-blue-700 text-white px-4 py-2.5 flex justify-between items-center font-bold">
            <span class="flex items-center gap-2 text-sm"><span>🏢</span> CHỌN ĐẠI LÝ NHẬP DOANH SỐ (F11)</span>
            <button id="btn-close-f11" class="text-white hover:text-red-200 text-lg font-bold">✕</button>
          </div>
          <div class="p-4 space-y-3">
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Nhập Mã Đại Lý hoặc Tên Đại Lý:</label>
              <input 
                type="text" 
                id="input-f11-ma" 
                placeholder="Gõ mã ĐL (VD: 001, 002) hoặc tên đại lý..." 
                class="w-full px-3 py-2 border-2 border-blue-500 rounded font-bold text-base outline-none focus:ring-2 focus:ring-blue-300"
                autocomplete="off"
              />
            </div>
            <div class="text-[11px] text-gray-500">
              💡 <em>Gõ mã rồi nhấn <strong>Enter</strong> để nạp toàn bộ số liệu đại lý và bắt đầu nhập số ngay.</em>
            </div>
            <div class="border rounded max-h-48 overflow-y-auto bg-gray-50 divide-y divide-gray-200" id="list-f11-daily">
              <!-- Danh sách đại lý nạp động -->
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
              <button id="btn-f11-cancel" class="px-4 py-1.5 bg-gray-400 hover:bg-gray-500 text-white rounded font-bold text-xs">
                Hủy bỏ (Esc)
              </button>
              <button id="btn-f11-submit" class="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs">
                Chấp nhận (Enter)
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;
}

/**
 * Sinh 20 dòng ma trận cho từng phân khu (mỗi dòng 1 ô STT nền xanh + 4 ô nhập)
 * Kẻ vạch đỏ ngăn cách sau dòng 05, 10, 15 theo đúng ảnh gốc
 */
function generateGridRows(type) {
  let html = '';
  for (let r = 1; r <= TOTAL_ROWS; r++) {
    const stt = String(r).padStart(2, '0');
    const isDivider = (r === 5 || r === 10 || r === 15);
    const dividerClass = isDivider ? 'row-red-divider' : '';

    html += `
      <tr class="h-6 ${dividerClass} border-b border-[#cbd5e1] hover:bg-yellow-50">
        <!-- CỘT STT: NỀN XANH ĐẬM CHUẨN PHẦN MỀM GỐC -->
        <td class="w-6 text-center font-bold bg-[#002060] text-white border-r border-[#7a889b] text-[10px]">
          ${stt}
        </td>
    `;

    for (let c = 1; c <= COLS_PER_SECTION; c++) {
      html += `
        <td class="border-r border-[#94a3b8] p-0">
          <input 
            type="text" 
            class="input-grid-cell w-full h-full text-center font-bold text-gray-900 bg-transparent outline-none focus:bg-yellow-100 focus:text-blue-900"
            data-type="${type}"
            data-row="${r}"
            data-col="${c}"
            autocomplete="off"
            maxlength="10"
          />
        </td>
      `;
    }

    html += `</tr>`;
  }
  return html;
}

export async function init() {
  currentNgay = sessionStorage.getItem('xskt_ngay') || new Date().toISOString().slice(0, 10);

  startClock();
  await checkSessionLock();
  await loadDaiLyList();
  setupGridEvents();
  setupKeyboardNavigation();
  setupF11ModalEvents();
  setupActionButtons();

  document.getElementById('input-ma-dl')?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleQuickMaDl(e.target.value.trim());
    }
  });

  document.getElementById('btn-quick-lock-toggle')?.addEventListener('click', toggleQuickLock);
  document.getElementById('btn-switch-cap-top')?.addEventListener('click', () => navigate('#/nhaploto-cap'));

  document.getElementById('btn-to-truoc')?.addEventListener('click', () => changeToSo(-1));
  document.getElementById('btn-to-tiep')?.addEventListener('click', () => changeToSo(1));
  document.getElementById('input-to-so')?.addEventListener('change', (e) => {
    currentToSo = parseInt(e.target.value, 10) || 1;
    loadExistingData();
  });

  document.getElementById('btn-save-loto')?.addEventListener('click', handleSave);

  ['input-bs-5k', 'input-bs-10k'].forEach((id, idx) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      el.value = el.value.replace(/[^0-9]/g, '');
      calculateTotals();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        calculateTotals();
        triggerAutoSave(true);
        showToast('Đã lưu dữ liệu bổ sung', 'success');
        if (id === 'input-bs-5k') {
          const next = document.getElementById('input-bs-10k');
          next?.focus();
          next?.select();
        } else {
          focusFirstCell();
        }
      }
    });
  });
}

export function destroy() {
  if (_autoSaveTimer) {
    clearTimeout(_autoSaveTimer);
    handleSave(true);
  }
  if (window._lotoDonKeyHandler) {
    window.removeEventListener('keydown', window._lotoDonKeyHandler);
    window._lotoDonKeyHandler = null;
  }
}

function startClock() {
  const clockEl = document.getElementById('clock-classic');
  if (!clockEl) return;
  const update = () => {
    const d = new Date();
    clockEl.textContent = d.toTimeString().split(' ')[0];
    if (d.getSeconds() === 0) {
      checkSessionLock();
    }
  };
  update();
  setInterval(update, 1000);
}

function setupActionButtons() {
  // Links
  document.getElementById('lnk-kiem-tra-dt')?.addEventListener('click', () => showKiemTraDT());
  document.getElementById('lnk-in-bang-ke')?.addEventListener('click', () => window.print());
  document.getElementById('lnk-kiem-tra-f3')?.addEventListener('click', () => showTongDaiLy());
  document.getElementById('lnk-doi-to')?.addEventListener('click', () => document.getElementById('input-to-so')?.focus());
  document.getElementById('lnk-doi-dai-ly')?.addEventListener('click', () => openF11Modal());

  // Buttons
  document.getElementById('btn-action-xoa-to')?.addEventListener('click', () => {
    if (confirm(`Bạn có chắc muốn xóa trắng tờ số ${currentToSo}?`)) {
      clearAllInputs();
      calculateTotals();
    }
  });

  document.getElementById('btn-action-xoa-daily')?.addEventListener('click', async () => {
    if (!currentDaiLyId) return showToast('Chưa chọn đại lý', 'warning');
    if (confirm(`CẢNH BÁO: Bạn có chắc muốn xóa TẤT CẢ các tờ của đại lý [${currentDaiLy?.ma || ''}] trong ngày hôm nay?`)) {
      clearAllInputs();
      calculateTotals();
      showToast('Đã xóa dữ liệu đại lý hiện tại', 'info');
    }
  });

  document.getElementById('btn-action-xoa-ngay')?.addEventListener('click', () => {
    if (confirm(`CẢNH BÁO NGUY HIỂM: Bạn có chắc muốn xóa TOÀN BỘ số liệu ngày ${formatDate(currentNgay)}?`)) {
      showToast('Thao tác yêu cầu quyền Quản trị viên cấp cao', 'warning');
    }
  });

  document.getElementById('btn-action-tong-hop-dt')?.addEventListener('click', () => showTongDaiLy());
  document.getElementById('btn-action-bao-cao-nhanh')?.addEventListener('click', () => navigate('#/baocao'));
  document.getElementById('btn-action-hop-so-fax')?.addEventListener('click', () => window.print());
  document.getElementById('btn-action-bang-ke-th')?.addEventListener('click', () => navigate('#/baocao'));
  document.getElementById('btn-action-bang-ke-to')?.addEventListener('click', () => navigate('#/baocao'));
  document.getElementById('btn-action-truyen-so-lieu')?.addEventListener('click', () => {
    showToast('Đã truyền số liệu lên máy chủ trung tâm thành công!', 'success');
  });
  document.getElementById('btn-action-thoat')?.addEventListener('click', () => navigate('#/dashboard'));
  document.getElementById('btn-action-switch-page')?.addEventListener('click', () => navigate('#/nhaploto-cap'));
}

async function handleQuickMaDl(val) {
  if (!val) return;
  const dl = daiLyList.find(d => d.ma === val || d.id === val || (d.ten && d.ten.toLowerCase().includes(val.toLowerCase())));
  if (dl) {
    currentDaiLyId = dl.id;
    currentDaiLy = dl;
    updateDaiLyDisplay();
    await loadExistingData();
    showToast(`Đã chuyển đại lý [${dl.ma}] - ${dl.ten || dl.name}`, 'success');
    focusFirstCell();
  } else {
    // Tự tạo đại lý nhanh nếu chưa có
    const newDl = await getOrCreateDaiLy(val, `Đại lý ${val}`);
    if (newDl) {
      currentDaiLyId = newDl.id;
      currentDaiLy = newDl;
      daiLyList.push(newDl);
      updateDaiLyDisplay();
      await loadExistingData();
      showToast(`Đã tạo và chọn Đại lý [${newDl.ma}]`, 'success');
      focusFirstCell();
    }
  }
}

function updateDaiLyDisplay() {
  const lbl = document.getElementById('lbl-ten-dai-ly');
  const inpMa = document.getElementById('input-ma-dl');
  if (lbl) lbl.textContent = currentDaiLy ? (currentDaiLy.ten || currentDaiLy.name) : '-- Chưa chọn đại lý --';
  if (inpMa) inpMa.value = currentDaiLy?.ma || currentDaiLyId || '---';
}

let _autoSaveTimer = null;
function triggerAutoSave(immediate = false) {
  clearTimeout(_autoSaveTimer);
  if (immediate) {
    handleSave(true);
  } else {
    _autoSaveTimer = setTimeout(() => {
      handleSave(true);
    }, 150);
  }
}

async function changeToSo(delta) {
  if (currentDaiLyId && !isLocked) {
    await handleSave(true);
  }
  currentToSo = Math.max(1, currentToSo + delta);
  const input = document.getElementById('input-to-so');
  if (input) input.value = currentToSo;
  await loadExistingData();
}

function parseCell(value) {
  if (!value) return null;
  const str = String(value).trim().replace(/\s+/g, '');
  if (!str) return null;

  if (str.includes('+')) {
    const parts = str.split('+');
    const sdt = parts[0].replace(/\D/g, '');
    const sl = parseInt(parts[1], 10) || 1;
    if (!sdt) return null;
    return { sdt, sl };
  } else {
    const sdt = str.replace(/\D/g, '');
    if (!sdt) return null;
    return { sdt, sl: 1 };
  }
}

function updateLockUI() {
  isLocked = isOverTime || isSessionLocked || isSheetLocked;
  const badge = document.getElementById('badge-lock-status');
  const btnLock = document.getElementById('btn-quick-lock-toggle');

  if (badge) {
    if (isOverTime) {
      badge.className = 'text-red-200 font-black text-xs uppercase px-2 py-0.5 rounded bg-red-900/80 border border-red-500 animate-pulse';
      badge.textContent = 'HẾT GIỜ NHẬN SỐ!';
    } else if (isSessionLocked) {
      badge.className = 'text-red-200 font-black text-xs uppercase px-1.5 py-0.5 rounded bg-red-900/60 border border-red-500';
      badge.textContent = 'ĐÃ KHOÁ SỐ LIỆU!';
    } else if (isSheetLocked) {
      badge.className = 'text-amber-200 font-black text-xs uppercase px-1.5 py-0.5 rounded bg-amber-900/80 border border-amber-500';
      badge.textContent = '🔒 ĐÃ KHÓA SỔ (CÓ DỮ LIỆU)';
    } else {
      badge.className = 'text-green-200 font-black text-xs uppercase px-1.5 py-0.5 rounded bg-green-900/60 border border-green-500';
      badge.textContent = 'ĐANG NHẬN SỐ';
    }
  }

  if (btnLock) {
    if (isOverTime) {
      btnLock.textContent = '⛔ Hết giờ';
      btnLock.disabled = true;
      btnLock.className = 'bg-gray-600 text-gray-300 font-bold text-xs px-2 py-0.5 rounded border border-gray-700 cursor-not-allowed';
    } else if (isSessionLocked) {
      btnLock.textContent = '🔓 Mở khóa';
      btnLock.disabled = false;
      btnLock.className = 'bg-red-700 hover:bg-red-800 text-white font-bold text-xs px-2 py-0.5 rounded border border-red-900 shadow';
    } else if (isSheetLocked) {
      btnLock.textContent = '🔓 Bỏ khóa (F10)';
      btnLock.disabled = false;
      btnLock.className = 'bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-2 py-0.5 rounded border border-amber-800 shadow';
    } else {
      btnLock.textContent = '🔒 Khóa sổ (F10)';
      btnLock.disabled = false;
      btnLock.className = 'bg-red-700 hover:bg-red-800 text-white font-bold text-xs px-2 py-0.5 rounded border border-red-900 shadow';
    }
  }

  document.querySelectorAll('.input-grid-cell, .input-bo-sung-don').forEach(inp => {
    inp.disabled = isLocked;
  });
  const saveBtn = document.getElementById('btn-save-loto');
  if (saveBtn) saveBtn.disabled = isLocked;
}

async function checkSessionLock() {
  try {
    // 1. Kiểm tra cấu hình thời gian nhận số từ config/gioNhanSo
    try {
      const snapCfg = await getDoc(doc(db, 'config', 'gioNhanSo'));
      if (snapCfg.exists()) {
        const cfg = snapCfg.data();
        if (cfg.tuDongKhoa !== false && cfg.gioKhoaSo) {
          const now = new Date();
          const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          if (cfg.gioBatDau && curTime < cfg.gioBatDau) {
            isOverTime = true;
          } else if (curTime >= cfg.gioKhoaSo) {
            isOverTime = true;
          } else {
            isOverTime = false;
          }
        } else {
          isOverTime = false;
        }
      }
    } catch (e) {
      console.warn('Lỗi kiểm tra giờ nhận số:', e);
    }

    // 2. Kiểm tra trạng thái khóa kỳ mở thưởng
    const session = await getKyMoThuong(currentNgay);
    isSessionLocked = session?.status === 'da_khoa' || session?.status === 'co_ket_qua';

    updateLockUI();
  } catch (err) {
    console.error(err);
  }
}

async function toggleQuickLock() {
  if (isOverTime) {
    showToast('Đã hết giờ nhận số theo quy định cấu hình hệ thống!', 'warning');
    return;
  }

  if (isSessionLocked) {
    if (!confirm(`Xác nhận MỞ KHÓA ngày ${formatDate(currentNgay)} để tiếp tục nhận số?`)) return;
    const stop = showLoading('Đang mở khóa kỳ...');
    try {
      await unlockKyMoThuong(currentNgay);
      isSessionLocked = false;
      isSheetLocked = false;
      updateLockUI();
      showToast('Đã mở khóa ngày làm việc thành công!', 'success');
    } catch (err) {
      showToast('Lỗi mở khóa: ' + err.message, 'danger');
    } finally {
      stop?.();
    }
    return;
  }

  // Chuyển đổi trạng thái khóa/mở tờ hiện tại
  isSheetLocked = !isSheetLocked;
  updateLockUI();
  if (isSheetLocked) {
    showToast(`Đã KHÓA BẢO VỆ tờ số ${currentToSo}. Nhấn F10 hoặc "Bỏ khóa" để mở khóa sửa tiếp.`, 'warning');
  } else {
    showToast(`Đã BỎ KHÓA tờ số ${currentToSo}. Bạn có thể nhập hoặc chỉnh sửa số liệu.`, 'success');
    focusFirstCell();
  }
}

async function loadDaiLyList() {
  try {
    daiLyList = await getDaiLyList();
    if (daiLyList.length > 0) {
      if (!currentDaiLyId) {
        currentDaiLyId = daiLyList[0].id;
        currentDaiLy = daiLyList[0];
      } else {
        currentDaiLy = daiLyList.find(d => d.id === currentDaiLyId) || daiLyList[0];
        currentDaiLyId = currentDaiLy.id;
      }
      updateDaiLyDisplay();
      await loadExistingData();
    }
  } catch (err) {
    console.error(err);
  }
}

function setupGridEvents() {
  const container = document.querySelector('.classic-loto-page');
  if (!container) return;

  container.addEventListener('input', (e) => {
    if (e.target.classList.contains('input-grid-cell')) {
      e.target.value = e.target.value.replace(/[^0-9+.\/\-\s]/g, '');
      calculateTotals();
    }
  });
}

function setupKeyboardNavigation() {
  if (window._lotoDonKeyHandler) {
    window.removeEventListener('keydown', window._lotoDonKeyHandler);
    window._lotoDonKeyHandler = null;
  }

  window._lotoDonKeyHandler = (e) => {
    const f11Modal = document.getElementById('modal-f11-daily');
    const isF11Open = f11Modal && !f11Modal.classList.contains('hidden');

    if (isF11Open) {
      if (e.key === 'Escape') { e.preventDefault(); closeF11Modal(); return; }
      if (e.key === 'Enter') { e.preventDefault(); submitF11Modal(); return; }
      return;
    }

    // F12 or PageUp or *: Chuyển loại hình (sang Cặp số)
    if (e.key === '*' || e.key === 'F12' || e.key === 'PageUp') {
      e.preventDefault();
      navigate('#/nhaploto-cap');
      return;
    }

    // F11 or PageDown: Chuyển đại lý
    if (e.key === 'F11' || e.key === 'PageDown') {
      e.preventDefault();
      openF11Modal();
      return;
    }

    // F2: Tổng đại lý (Ctrl+F2: Tổng toàn bộ ĐL)
    if (e.key === 'F2') {
      e.preventDefault();
      showTongDaiLy(e.ctrlKey);
      return;
    }

    // F3: Kiểm tra Đại lý (Ctrl+F3: Kiểm tra ĐL lệch DT)
    if (e.key === 'F3') {
      e.preventDefault();
      if (e.ctrlKey) {
        showKiemTraLechDT();
      } else {
        showTongDaiLy(false);
      }
      return;
    }

    // F4: Tổng ngày (Ctrl+F4: Tổng ngày tất cả các máy)
    if (e.key === 'F4') {
      e.preventDefault();
      showTongNgay(e.ctrlKey);
      return;
    }

    // F5: Tờ trước (Ctrl+F5: Kiểm tra DT)
    if (e.key === 'F5') {
      e.preventDefault();
      if (e.ctrlKey) {
        showKiemTraDT();
      } else {
        changeToSo(-1);
      }
      return;
    }

    // F6: Tờ tiếp
    if (e.key === 'F6') {
      e.preventDefault();
      changeToSo(1);
      return;
    }

    // F7: Chèn ô
    if (e.key === 'F7') {
      e.preventDefault();
      insertBlankCell();
      return;
    }

    // F8: Xoá ô
    if (e.key === 'F8') {
      e.preventDefault();
      deleteCellAndShiftUp();
      return;
    }

    // F9: Đổi loại vé
    if (e.key === 'F9') {
      e.preventDefault();
      switchTicketType();
      return;
    }

    // F10: Bỏ khoá / Khóa sổ
    if (e.key === 'F10') {
      e.preventDefault();
      toggleQuickLock();
      return;
    }

    // Ctrl+S: Lưu dữ liệu
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSave();
      return;
    }

    const active = document.activeElement;
    if (!active || !active.classList.contains('input-grid-cell')) return;

    const type = active.dataset.type;
    const r = parseInt(active.dataset.row, 10);
    const c = parseInt(active.dataset.col, 10);
    const rawVal = active.value.trim();

    if (e.key === 'Enter') {
      e.preventDefault();

      // 1. +N hoặc .N -> Nhảy đến ô N
      const jumpMatch = rawVal.match(/^(\+|\.)([0-9]{1,2})$/);
      if (jumpMatch) {
        active.value = '';
        calculateTotals();
        triggerAutoSave();
        const targetRow = Math.min(TOTAL_ROWS, Math.max(1, parseInt(jumpMatch[2], 10)));
        focusCell(type, targetRow, c);
        return;
      }

      // 2. -N -> Xoá N vé (đến ô N)
      const delMatch = rawVal.match(/^-([0-9]{1,2})$/);
      if (delMatch) {
        active.value = '';
        const targetNum = parseInt(delMatch[1], 10);
        let startR = r;
        let endR = r;
        if (targetNum >= r && targetNum <= TOTAL_ROWS) {
          endR = targetNum;
        } else {
          endR = Math.min(TOTAL_ROWS, r + targetNum - 1);
        }
        for (let rowIdx = startR; rowIdx <= endR; rowIdx++) {
          const cellEl = document.querySelector(`.input-grid-cell[data-type="${type}"][data-row="${rowIdx}"][data-col="${c}"]`);
          if (cellEl) cellEl.value = '';
        }
        calculateTotals();
        triggerAutoSave();
        showToast(`Đã xoá đến ô ${endR}`, 'info');
        focusCell(type, startR, c);
        return;
      }

      // 3. SDT.N -> Nhập SDT đến ô N
      const fillToMatch = rawVal.match(/^([0-9+]+)\.([0-9]{1,2})$/);
      if (fillToMatch) {
        const sdtVal = fillToMatch[1];
        const targetRow = Math.min(TOTAL_ROWS, Math.max(r, parseInt(fillToMatch[2], 10)));
        for (let rowIdx = r; rowIdx <= targetRow; rowIdx++) {
          const cellEl = document.querySelector(`.input-grid-cell[data-type="${type}"][data-row="${rowIdx}"][data-col="${c}"]`);
          if (cellEl) cellEl.value = sdtVal;
        }
        calculateTotals();
        triggerAutoSave();
        showToast(`Đã nhập "${sdtVal}" đến ô ${targetRow}`, 'success');
        if (targetRow < TOTAL_ROWS) {
          focusCell(type, targetRow + 1, c);
        } else {
          focusCell(type, 1, c < COLS_PER_SECTION ? c + 1 : 1);
        }
        return;
      }

      // 4. SDT/N -> Nhập SDT Trên N ô
      const fillCountMatch = rawVal.match(/^([0-9+]+)\/([0-9]{1,2})$/);
      if (fillCountMatch) {
        const sdtVal = fillCountMatch[1];
        const count = parseInt(fillCountMatch[2], 10) || 1;
        const endRow = Math.min(TOTAL_ROWS, r + count - 1);
        for (let rowIdx = r; rowIdx <= endRow; rowIdx++) {
          const cellEl = document.querySelector(`.input-grid-cell[data-type="${type}"][data-row="${rowIdx}"][data-col="${c}"]`);
          if (cellEl) cellEl.value = sdtVal;
        }
        calculateTotals();
        triggerAutoSave();
        showToast(`Đã nhập "${sdtVal}" trên ${count} ô (đến ô ${endRow})`, 'success');
        if (endRow < TOTAL_ROWS) {
          focusCell(type, endRow + 1, c);
        } else {
          focusCell(type, 1, c < COLS_PER_SECTION ? c + 1 : 1);
        }
        return;
      }

      // 5. Đi dọc xuống dòng dưới bình thường (r -> r + 1)
      let nextRow = r;
      let nextCol = c;
      let nextType = type;

      if (r < TOTAL_ROWS) {
        nextRow = r + 1;
      } else {
        nextRow = 1;
        if (c < COLS_PER_SECTION) {
          nextCol = c + 1;
        } else if (type === '5k') {
          nextType = '10k';
          nextCol = 1;
        } else {
          nextType = '5k';
          nextCol = 1;
        }
      }
      focusCell(nextType, nextRow, nextCol);
      triggerAutoSave();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (r < TOTAL_ROWS) focusCell(type, r + 1, c);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (r > 1) focusCell(type, r - 1, c);
    } else if (e.key === 'ArrowRight') {
      if (active.selectionStart === active.value.length) {
        e.preventDefault();
        if (c < COLS_PER_SECTION) focusCell(type, r, c + 1);
        else if (type === '5k') focusCell('10k', r, 1);
        else if (type === '10k') focusCell('5k', r, 1);
      }
    } else if (e.key === 'ArrowLeft') {
      if (active.selectionStart === 0) {
        e.preventDefault();
        if (c > 1) focusCell(type, r, c - 1);
        else if (type === '10k') focusCell('5k', r, COLS_PER_SECTION);
        else if (type === '5k') focusCell('10k', r, COLS_PER_SECTION);
      }
    }
  };

  window.addEventListener('keydown', window._lotoDonKeyHandler);
}

function insertBlankCell() {
  const active = document.activeElement;
  if (!active || !active.classList.contains('input-grid-cell')) return;
  const type = active.dataset.type;
  const r = parseInt(active.dataset.row, 10);
  const c = parseInt(active.dataset.col, 10);

  for (let rowIdx = TOTAL_ROWS; rowIdx > r; rowIdx--) {
    const prev = document.querySelector(`.input-grid-cell[data-type="${type}"][data-row="${rowIdx - 1}"][data-col="${c}"]`);
    const curr = document.querySelector(`.input-grid-cell[data-type="${type}"][data-row="${rowIdx}"][data-col="${c}"]`);
    if (curr && prev) curr.value = prev.value;
  }
  active.value = '';
  calculateTotals();
  showToast('Đã chèn ô trống (F7)', 'info');
}

function deleteCellAndShiftUp() {
  const active = document.activeElement;
  if (!active || !active.classList.contains('input-grid-cell')) return;
  const type = active.dataset.type;
  const r = parseInt(active.dataset.row, 10);
  const c = parseInt(active.dataset.col, 10);

  for (let rowIdx = r; rowIdx < TOTAL_ROWS; rowIdx++) {
    const next = document.querySelector(`.input-grid-cell[data-type="${type}"][data-row="${rowIdx + 1}"][data-col="${c}"]`);
    const curr = document.querySelector(`.input-grid-cell[data-type="${type}"][data-row="${rowIdx}"][data-col="${c}"]`);
    if (curr && next) curr.value = next.value;
  }
  const last = document.querySelector(`.input-grid-cell[data-type="${type}"][data-row="${TOTAL_ROWS}"][data-col="${c}"]`);
  if (last) last.value = '';
  calculateTotals();
  showToast('Đã xoá ô và kéo dòng lên (F8)', 'info');
}

function switchTicketType() {
  const active = document.activeElement;
  const currentType = (active && active.dataset?.type) || '5k';
  const currentR = (active && parseInt(active.dataset?.row, 10)) || 1;
  const currentC = (active && parseInt(active.dataset?.col, 10)) || 1;
  const nextType = currentType === '5k' ? '10k' : '5k';
  focusCell(nextType, currentR, currentC);
  showToast(`Đổi loại vé sang ${nextType === '5k' ? '5.000đ' : '10.000đ'} (F9)`, 'info');
}

function showKiemTraLechDT() {
  const grandTotalTienEl = document.getElementById('grand-total-tien');
  const grandTotalTien = (parseInt(grandTotalTienEl?.textContent || '0', 10)) * 1000;
  const dtBoSungInput = document.getElementById('input-dt-bo-sung');
  const dtBoSung = parseInt((dtBoSungInput?.value || '0').replace(/\D/g, ''), 10) || 0;

  const lech = grandTotalTien - dtBoSung;
  const dlTen = currentDaiLy ? (currentDaiLy.ten || currentDaiLy.name) : currentDaiLyId;
  const dlMa = currentDaiLy?.ma || currentDaiLyId;

  if (dtBoSung === 0) {
    alert(`📊 KIỂM TRA LỆCH DOANH THU ĐẠI LÝ [${dlMa}] - ${dlTen}\n\n• Doanh thu nhập: ${formatCurrency(grandTotalTien)} đ\n• Doanh thu bổ sung/báo: 0 đ\n(Chưa nhập số liệu Doanh thu bổ sung để so khớp)`);
  } else if (lech === 0) {
    alert(`✅ DOANH THU KHỚP TUYỆT ĐỐI!\n\n• Đại lý [${dlMa}]: ${dlTen}\n• Doanh thu nhập: ${formatCurrency(grandTotalTien)} đ\n• Doanh thu báo: ${formatCurrency(dtBoSung)} đ\n• Lệch: 0 đ`);
  } else if (lech > 0) {
    alert(`⚠️ CẢNH BÁO: DOANH THU LỆCH THỪA!\n\n• Đại lý [${dlMa}]: ${dlTen}\n• Doanh thu nhập: ${formatCurrency(grandTotalTien)} đ\n• Doanh thu báo: ${formatCurrency(dtBoSung)} đ\n• LỆCH THỪA: +${formatCurrency(lech)} đ`);
  } else {
    alert(`⚠️ CẢNH BÁO: DOANH THU LỆCH THIẾU!\n\n• Đại lý [${dlMa}]: ${dlTen}\n• Doanh thu nhập: ${formatCurrency(grandTotalTien)} đ\n• Doanh thu báo: ${formatCurrency(dtBoSung)} đ\n• LỆCH THIẾU: ${formatCurrency(lech)} đ`);
  }
}

async function showTongNgay(isCtrl = false) {
  const stop = showLoading('Đang tổng hợp doanh thu ngày...');
  try {
    const allTickets = await getVeLoToByNgay(currentNgay);
    let totalVe = 0;
    let totalTien = 0;
    const countDaily = new Set();

    allTickets.forEach(t => {
      totalVe += (t.tongVe || 0);
      totalTien += (t.tongTien || 0);
      if (t.daiLyId) countDaily.add(t.daiLyId);
    });

    alert(
      `📅 TỔNG HỢP DOANH THU TOÀN BỘ NGÀY ${formatDate(currentNgay)} ${isCtrl ? '(Tất cả các máy)' : ''}\n` +
      `───────────────────────────────\n` +
      `• Số đại lý đã nhập: ${countDaily.size} đại lý\n` +
      `• Tổng số tờ/bản ghi: ${allTickets.length} tờ\n` +
      `• Tổng số vé: ${formatCurrency(totalVe)} vé\n` +
      `▶ TỔNG DOANH THU: ${formatCurrency(totalTien)} đ`
    );
  } catch (err) {
    showToast('Lỗi tổng ngày: ' + err.message, 'danger');
  } finally {
    stop?.();
  }
}

function focusCell(type, row, col) {
  const target = document.querySelector(`.input-grid-cell[data-type="${type}"][data-row="${row}"][data-col="${col}"]`);
  if (target) {
    target.focus();
    target.select();
  }
}

function focusFirstCell() {
  focusCell('5k', 1, 1);
}

function openF11Modal() {
  const modal = document.getElementById('modal-f11-daily');
  const input = document.getElementById('input-f11-ma');
  const listEl = document.getElementById('list-f11-daily');
  if (!modal || !input) return;

  renderF11List(daiLyList);
  modal.classList.remove('hidden');
  input.value = '';
  input.focus();
}

function closeF11Modal() {
  const modal = document.getElementById('modal-f11-daily');
  if (modal) modal.classList.add('hidden');
}

function renderF11List(list) {
  const listEl = document.getElementById('list-f11-daily');
  if (!listEl) return;

  if (list.length === 0) {
    listEl.innerHTML = `<div class="p-3 text-center text-xs text-gray-400">Không tìm thấy đại lý nào</div>`;
    return;
  }

  listEl.innerHTML = list.map(dl => `
    <div class="item-f11-daily px-3 py-2 hover:bg-blue-100 cursor-pointer flex justify-between items-center text-xs font-semibold" data-id="${dl.id}">
      <span class="text-blue-900">
        <strong class="font-mono text-sm bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded mr-2">${dl.ma || '---'}</strong>
        ${dl.ten || dl.name}
      </span>
      <span class="text-[11px] text-gray-500 font-mono">${dl.diaChi || ''}</span>
    </div>
  `).join('');

  listEl.querySelectorAll('.item-f11-daily').forEach(el => {
    el.addEventListener('click', async () => {
      const id = el.dataset.id;
      const found = daiLyList.find(d => d.id === id);
      if (found) {
        currentDaiLyId = found.id;
        currentDaiLy = found;
        updateDaiLyDisplay();
        closeF11Modal();
        await loadExistingData();
        focusFirstCell();
      }
    });
  });
}

function setupF11ModalEvents() {
  const input = document.getElementById('input-f11-ma');
  const btnClose = document.getElementById('btn-close-f11');
  const btnCancel = document.getElementById('btn-f11-cancel');
  const btnSubmit = document.getElementById('btn-f11-submit');

  btnClose?.addEventListener('click', closeF11Modal);
  btnCancel?.addEventListener('click', closeF11Modal);
  btnSubmit?.addEventListener('click', submitF11Modal);

  input?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = daiLyList.filter(d => 
      (d.ma && d.ma.toLowerCase().includes(q)) || 
      (d.ten && d.ten.toLowerCase().includes(q)) ||
      (d.name && d.name.toLowerCase().includes(q))
    );
    renderF11List(filtered);
  });
}

async function submitF11Modal() {
  const input = document.getElementById('input-f11-ma');
  const val = input ? input.value.trim() : '';
  if (!val) {
    closeF11Modal();
    return;
  }

  const found = daiLyList.find(d => 
    (d.ma && d.ma.toLowerCase() === val.toLowerCase()) || 
    (d.ten && d.ten.toLowerCase().includes(val.toLowerCase()))
  );

  if (found) {
    currentDaiLyId = found.id;
    currentDaiLy = found;
    updateDaiLyDisplay();
    closeF11Modal();
    await loadExistingData();
    showToast(`Đã nạp số liệu Đại lý [${found.ma}] - ${found.ten || found.name}`, 'success');
    focusFirstCell();
  } else {
    const stop = showLoading('Đang tạo đại lý mới...');
    try {
      const newDl = await getOrCreateDaiLy(val, `Đại lý ${val}`);
      if (newDl) {
        currentDaiLyId = newDl.id;
        currentDaiLy = newDl;
        daiLyList.push(newDl);
        updateDaiLyDisplay();
        closeF11Modal();
        await loadExistingData();
        showToast(`Đã tạo và chọn Đại lý [${newDl.ma}]`, 'success');
        focusFirstCell();
      }
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'danger');
    } finally {
      stop?.();
    }
  }
}

function showKiemTraDT() {
  const grandTotalTien = document.getElementById('grand-total-tien')?.textContent || '0';
  const grandTotalVe = document.getElementById('grand-total-ve')?.textContent || '0';
  alert(`📋 KIỂM TRA DOANH THU TỜ HIỆN TẠI\n\n• Tờ số: ${currentToSo}\n• Đại lý: ${currentDaiLy?.ten || currentDaiLyId}\n• Tổng vé: ${grandTotalVe} vé\n• Tổng tiền: ${grandTotalTien} nghìn đồng`);
}

async function showTongDaiLy(isCtrl = false) {
  if (isCtrl) {
    const stop = showLoading('Đang tổng hợp toàn bộ đại lý...');
    try {
      const allTickets = await getVeLoToByNgay(currentNgay);
      let totalVe = 0;
      let totalTien = 0;
      const countDaily = new Set();
      allTickets.forEach(t => {
        totalVe += (t.tongVe || 0);
        totalTien += (t.tongTien || 0);
        if (t.daiLyId) countDaily.add(t.daiLyId);
      });
      alert(
        `🏢 TỔNG TOÀN BỘ ĐẠI LÝ TRONG NGÀY ${formatDate(currentNgay)} (Ctrl+F2)\n` +
        `───────────────────────────────\n` +
        `• Tổng số đại lý đã nhập: ${countDaily.size} đại lý\n` +
        `• Tổng số tờ: ${allTickets.length} tờ\n` +
        `• Tổng số vé: ${formatCurrency(totalVe)} vé\n` +
        `▶ TỔNG TOÀN BỘ DOANH THU: ${formatCurrency(totalTien)} đ`
      );
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'danger');
    } finally {
      stop?.();
    }
    return;
  }

  if (!currentDaiLyId) {
    showToast('Chưa chọn đại lý để xem tổng hợp!', 'warning');
    return;
  }

  const dlTen = currentDaiLy?.ten || currentDaiLy?.name || currentDaiLyId;
  const dlMa = currentDaiLy?.ma || currentDaiLyId;

  const stop = showLoading('Đang tổng hợp dữ liệu đại lý...');
  try {
    const allDocs = await getVeLoToByNgayDaiLy(currentNgay, currentDaiLyId);

    let veDacBiet = 0, tienDacBiet = 0;
    let veCap = 0, tienCap = 0;
    let ve3x23 = 0, tien3x23 = 0;
    let ve2x27 = 0, tien2x27 = 0;

    allDocs.forEach(docItem => {
      if (docItem.loaiHinh === 'dac_biet') {
        veDacBiet += (docItem.tongVe || 0);
        tienDacBiet += (docItem.tongTien || 0);
      } else if (docItem.loaiHinh === 'cap_so') {
        const c10 = (docItem.cap10k || []).reduce((s, x) => s + (x.sl || 1), 0);
        const c20 = (docItem.cap20k || []).reduce((s, x) => s + (x.sl || 1), 0);
        veCap += (c10 + c20);
        tienCap += (c10 * 10000 + c20 * 20000);

        const v323 = (docItem['3x23'] || []).reduce((s, x) => s + (x.sl || 1), 0);
        ve3x23 += v323;
        tien3x23 += v323 * 20000;

        const v227 = (docItem['2x27'] || []).reduce((s, x) => s + (x.sl || 1), 0);
        ve2x27 += v227;
        tien2x27 += v227 * 20000;
      }
    });

    const screenVe = parseInt(document.getElementById('grand-total-ve')?.textContent || '0', 10);
    const screenTien = (parseInt(document.getElementById('grand-total-tien')?.textContent || '0', 10)) * 1000;

    if (screenVe > 0 && veDacBiet < screenVe) {
      veDacBiet = screenVe;
      tienDacBiet = screenTien;
    }

    const tongTienAll = tienDacBiet + tienCap + tien3x23 + tien2x27;
    const tongVeAll = veDacBiet + veCap + ve3x23 + ve2x27;

    alert(
      `📊 TỔNG HỢP CƠ SỞ DỮ LIỆU ĐẠI LÝ [${dlMa}] - ${dlTen}\n` +
      `Ngày mở thưởng: ${formatDate(currentNgay)}\n` +
      `───────────────────────────────\n` +
      `1. Lô tô Đặc Biệt: ${veDacBiet} vé = ${formatCurrency(tienDacBiet)} đ\n` +
      `2. Lô tô Cặp số:   ${veCap} vé = ${formatCurrency(tienCap)} đ\n` +
      `3. Lô tô 3x23:     ${ve3x23} vé = ${formatCurrency(tien3x23)} đ\n` +
      `4. Lô tô 2x27:     ${ve2x27} vé = ${formatCurrency(tien2x27)} đ\n` +
      `───────────────────────────────\n` +
      `▶ TỔNG TOÀN BỘ:   ${tongVeAll} vé = ${formatCurrency(tongTienAll)} đ`
    );
  } catch (err) {
    console.error(err);
    showToast('Lỗi tính tổng: ' + err.message, 'danger');
  } finally {
    stop?.();
  }
}

/**
 * Tính toán chính xác tổng hợp cho 2 số, 3 số, 4 số và doanh thu trên tờ hiện tại
 * Đơn vị tiền hiển thị theo nghìn đồng (VD: 240.000đ -> 240) giống hệ thống gốc
 */
function calculateTotals() {
  const values = { '5k': 5000, '10k': 10000, '20k': 20000 };

  const bs5k = parseInt(document.getElementById('input-bs-5k')?.value || '0', 10) || 0;
  const bs10k = parseInt(document.getElementById('input-bs-10k')?.value || '0', 10) || 0;
  const bonusMap = { '5k': bs5k, '10k': bs10k, '20k': 0 };

  let totalVeAll = 0;
  let totalTienAll = 0;

  let total2soTien = 0;
  let total3soTien = 0;
  let total4soTien = 0;

  SECTIONS.forEach(type => {
    let count2so = 0;
    let count3so = 0;
    let count4so = 0;
    let totalVeType = 0;

    const cells = document.querySelectorAll(`.input-grid-cell[data-type="${type}"]`);
    cells.forEach(cell => {
      const parsed = parseCell(cell.value);
      if (parsed) {
        const len = parsed.sdt.length;
        if (len === 2) {
          count2so += parsed.sl;
          total2soTien += (parsed.sl * values[type]) / 1000;
        } else if (len === 3) {
          count3so += parsed.sl;
          total3soTien += (parsed.sl * values[type]) / 1000;
        } else if (len >= 4) {
          count4so += parsed.sl;
          total4soTien += (parsed.sl * values[type]) / 1000;
        }

        totalVeType += parsed.sl;
      }
    });

    const bs = bonusMap[type] || 0;
    const finalVeType = totalVeType + bs;
    const tienNghin = (finalVeType * values[type]) / 1000;
    totalVeAll += finalVeType;
    totalTienAll += tienNghin;

    const el2 = document.getElementById(`count-${type}-2so`);
    const el3 = document.getElementById(`count-${type}-3so`);
    const el4 = document.getElementById(`count-${type}-4so`);
    const elSumVe = document.getElementById(`sum-ve-${type}`);
    const elTotalVe = document.getElementById(`total-ve-${type}`);
    const elTotalTien = document.getElementById(`total-tien-${type}`);

    if (el2) el2.textContent = count2so;
    if (el3) el3.textContent = count3so;
    if (el4) el4.textContent = count4so;
    if (elSumVe) elSumVe.textContent = finalVeType;
    if (elTotalVe) elTotalVe.textContent = finalVeType;
    if (elTotalTien) elTotalTien.textContent = tienNghin;
  });

  const elTien2so = document.getElementById('total-tien-2so');
  const elTien3so = document.getElementById('total-tien-3so');
  const elTien4so = document.getElementById('total-tien-4so');
  const elTienCong = document.getElementById('total-tien-cong');
  const elGrandVe = document.getElementById('grand-total-ve');
  const elGrandTien = document.getElementById('grand-total-tien');

  if (elTien2so) elTien2so.textContent = total2soTien;
  if (elTien3so) elTien3so.textContent = total3soTien;
  if (elTien4so) elTien4so.textContent = total4soTien;
  if (elTienCong) elTienCong.textContent = totalTienAll;
  if (elGrandVe) elGrandVe.textContent = totalVeAll;
  if (elGrandTien) elGrandTien.textContent = totalTienAll;
}

function clearAllInputs() {
  document.querySelectorAll('.input-grid-cell').forEach(inp => inp.value = '');
  const elBs5k = document.getElementById('input-bs-5k');
  const elBs10k = document.getElementById('input-bs-10k');
  if (elBs5k) elBs5k.value = '0';
  if (elBs10k) elBs10k.value = '0';
}

async function loadExistingData() {
  clearAllInputs();
  calculateTotals();
  if (!currentDaiLyId) return;

  const stop = showLoading('Đang tải dữ liệu tờ...');
  try {
    const list = await getVeLoToByNgayDaiLy(currentNgay, currentDaiLyId);
    const docData = list.find(item => item.loaiHinh === 'dac_biet' && (item.toSo || 1) === currentToSo);
    if (docData) {
      let hasData = false;
      SECTIONS.forEach(type => {
        const items = docData[`loTo${type.toUpperCase()}`] || [];
        if (items.length > 0) hasData = true;
        items.forEach(item => {
          if (item.row && item.col) {
            const cell = document.querySelector(`.input-grid-cell[data-type="${type}"][data-row="${item.row}"][data-col="${item.col}"]`);
            if (cell) {
              cell.value = (item.sl && item.sl > 1) ? `${item.sdt}+${item.sl}` : `${item.sdt}`;
            }
          }
        });
      });
      const elBs5k = document.getElementById('input-bs-5k');
      const elBs10k = document.getElementById('input-bs-10k');
      const b5 = docData.boSung5k || 0;
      const b10 = docData.boSung10k || 0;
      if (b5 > 0 || b10 > 0) hasData = true;
      if (elBs5k) elBs5k.value = b5;
      if (elBs10k) elBs10k.value = b10;
      calculateTotals();

      // Nếu tờ đã có dữ liệu -> Tự động khóa bảo vệ tránh lỡ tay nhập đè hoặc xóa
      if (hasData) {
        isSheetLocked = true;
      } else {
        isSheetLocked = false;
      }

      const badge = document.getElementById('sheet-mamay-badge');
      if (badge) {
        if (docData.maMay) {
          badge.innerHTML = `💻 Máy nhập: <strong class="text-blue-900 bg-blue-100 px-1 py-0.5 rounded font-mono">${docData.maMay}</strong>`;
        } else {
          badge.innerHTML = `💻 Máy nhập: <span class="text-gray-500">Chưa rõ</span>`;
        }
      }
    } else {
      isSheetLocked = false;
      const badge = document.getElementById('sheet-mamay-badge');
      if (badge) {
        badge.innerHTML = `💻 Máy nhập: <span class="text-gray-400">Tờ mới</span>`;
      }
    }
    updateLockUI();
  } catch (err) {
    console.error(err);
  } finally {
    stop?.();
  }
}

async function handleSave(silent = false) {
  if (isOverTime) {
    if (!silent) showToast('Đã hết giờ nhận số theo quy định!', 'warning');
    return;
  }
  if (isSessionLocked) {
    if (!silent) showToast('Kỳ này đã bị khóa số liệu. Không thể lưu!', 'warning');
    return;
  }
  if (isSheetLocked) {
    if (!silent) showToast('Tờ này đang bị khóa bảo vệ. Nhấn F10 để bỏ khóa trước khi sửa!', 'warning');
    return;
  }
  if (!currentDaiLyId) {
    if (!silent) showToast('Vui lòng chọn đại lý trước khi lưu!', 'warning');
    return;
  }

  const bs5k = parseInt(document.getElementById('input-bs-5k')?.value || '0', 10) || 0;
  const bs10k = parseInt(document.getElementById('input-bs-10k')?.value || '0', 10) || 0;

  const deviceMaMay = (localStorage.getItem('xskt_ma_may') || 'A01').toUpperCase();
  const payload = {
    ngay: currentNgay,
    daiLyId: currentDaiLyId,
    daiLyTen: currentDaiLy?.ten || currentDaiLy?.name || '',
    toSo: currentToSo,
    loaiHinh: 'dac_biet',
    maMay: deviceMaMay,
    loTo5K: [],
    loTo10K: [],
    loTo20K: [],
    boSung5k: bs5k,
    boSung10k: bs10k,
    tongVe: bs5k + bs10k,
    tongTien: (bs5k * 5000) + (bs10k * 10000)
  };

  const values = { '5k': 5000, '10k': 10000, '20k': 20000 };

  SECTIONS.forEach(type => {
    const key = `loTo${type.toUpperCase()}`;
    const cells = document.querySelectorAll(`.input-grid-cell[data-type="${type}"]`);
    cells.forEach(cell => {
      const parsed = parseCell(cell.value);
      if (parsed) {
        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);
        payload[key].push({
          row,
          col,
          sdt: parsed.sdt,
          sl: parsed.sl
        });
        payload.tongVe += parsed.sl;
        payload.tongTien += parsed.sl * values[type];
      }
    });
  });

  const stop = silent ? null : showLoading('Đang lưu dữ liệu tờ...');
  const saveBtn = document.getElementById('btn-save-loto');
  try {
    const docId = `${currentNgay.replace(/-/g, '')}_${currentDaiLyId}_to${currentToSo}_dacbiet`;
    await saveVeLoTo({ id: docId, ...payload });
    if (!silent) {
      showToast('Lưu tờ dữ liệu thành công!', 'success');
    } else if (saveBtn) {
      saveBtn.textContent = '✓ Đã lưu tự động';
      setTimeout(() => {
        if (saveBtn) saveBtn.textContent = '💾 Lưu (Ctrl+S)';
      }, 1000);
    }
  } catch (err) {
    console.error('Save error:', err);
    if (!silent) showToast('Lỗi lưu vé: ' + err.message, 'danger');
  } finally {
    stop?.();
  }
}
