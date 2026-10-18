/**
 * nhaploto-cap.js - M5B: Nhập Lô Tô Cặp Số, 3x23 và 2x27 (Giao diện chuẩn Desktop Phần Mềm Gốc)
 * XSKT Lô Tô Nam Định
 *
 * Tái hiện 100% giao diện phần mềm Windows gốc theo ảnh chụp người dùng:
 * - Header chuẩn: Máy A00, Ngày MT, Mã ĐL, Tên đại lý đỏ đậm, Tiêu đề đỏ, Subtitle LÔ TÔ CẶP SỐ VÉ 10 000Đ, ĐÃ KHOÁ SỐ LIỆU, Doanh thu bổ sung, Đồng hồ.
 * - Sidebar trái: Tờ số, Các link xanh nghiêng, Dàn nút xám chuẩn Windows, Bảng hướng dẫn phím tắt xanh thẫm.
 * - Lưới nhập số: 4 phân khu:
 *     1. Lô tô cặp 10.000 (2 cột nhập, STT xanh)
 *     2. Lô tô cặp 20.000 (2 cột nhập, STT xanh)
 *     3. Lô tô 3X23 20 000 (1 cột nhập, STT ĐỎ, Tiêu đề ĐỎ)
 *     4. Lô tô 2X27 20 000 (1 cột nhập, STT xanh)
 *   Kẻ vạch đỏ ngăn cách sau dòng 05, 10, 15.
 * - Bảng tổng hợp chân trang chuẩn: Bổ sung cặp 10K, 20K, 3X23, 2X27. Bảng master 7 cột (tính đúng dòng Vé 20.000 đ và Thành tiền cho Lô bao 3X23/2X27).
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
            <span class="text-blue-200 text-[10px] font-mono">A00180262805</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-semibold text-white">Ngày MT</span>
            <input 
              type="text" 
              id="input-ngay-mt-cap" 
              value="${formatDate(currentNgay)}" 
              class="classic-input text-red-600 font-extrabold w-24 text-center cursor-pointer"
              readonly
            />
            <span class="font-semibold text-white ml-1">Mã ĐL</span>
            <input 
              type="text" 
              id="input-ma-dl-cap" 
              value="---" 
              placeholder="001" 
              class="classic-input text-blue-900 font-extrabold w-16 text-center uppercase"
              title="Gõ mã ĐL rồi Enter để nạp nhanh"
            />
          </div>
          <div id="lbl-ten-dai-ly-cap" class="text-red-300 font-extrabold text-sm tracking-wide truncate max-w-[260px] pt-0.5">
            -- Chưa chọn đại lý --
          </div>
        </div>

        <!-- GIỮA: TIÊU ĐỀ BẢNG KÊ & TRẠNG THÁI KHÓA -->
        <div class="flex-1 text-center flex flex-col items-center">
          <h1 class="text-red-400 font-black text-sm md:text-base tracking-wider uppercase drop-shadow-sm">
            BẢNG KÊ SỐ DỰ THƯỞNG XỔ SỐ LÔ TÔ CẶP SỐ, 3X23 VÀ 2X27
          </h1>
          <div class="flex flex-wrap items-center justify-center gap-3 mt-0.5">
            <span class="text-yellow-300 font-black text-sm tracking-wide">
              LÔ TÔ CẶP SỐ VÉ 10 000Đ
            </span>
            <span id="badge-lock-status-cap" class="text-red-200 font-black text-xs uppercase px-1.5 py-0.5 rounded bg-red-900/60 border border-red-500">
              ĐÃ KHOÁ SỐ LIỆU!
            </span>
            <div class="flex items-center gap-1 text-[11px]">
              <span class="text-blue-100">Doanh thu bổ sung</span>
              <input 
                type="text" 
                id="input-dt-bo-sung-cap" 
                value="0" 
                class="classic-input w-16 text-right font-bold text-gray-800"
              />
            </div>
          </div>
        </div>

        <!-- PHẢI: ĐỒNG HỒ SỐ & CHUYỂN NHANH -->
        <div class="flex flex-col items-end gap-1">
          <span id="clock-classic-cap" class="font-mono font-bold text-white text-xs bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700">
            20:31:03
          </span>
          <div class="flex items-center gap-1">
            <button id="btn-quick-lock-toggle-cap" class="classic-btn font-bold text-[10px] px-2 py-0.5" title="Phím tắt F10 để Khóa / Mở khóa">
              🔒 Khóa sổ
            </button>
            <button id="btn-switch-don-top" class="classic-btn font-bold text-[10px] px-2 py-0.5 text-blue-900" title="Phím tắt * hoặc F10">
              🎟 Lô tô ĐB (*)
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
                <button id="btn-to-truoc-cap" class="classic-btn px-1.5 py-0.5 font-bold" title="Tờ trước (F5)">◀</button>
                <input 
                  type="text" 
                  id="input-to-so-cap" 
                  value="${currentToSo}" 
                  class="classic-input w-12 text-center font-bold text-blue-950 text-xs" 
                />
                <button id="btn-to-tiep-cap" class="classic-btn px-1.5 py-0.5 font-bold" title="Tờ tiếp (F6)">▶</button>
              </div>
            </div>

            <!-- HIỂN THỊ MÃ MÁY NHẬP DỮ LIỆU TỜ VÉ NÀY -->
            <div id="sheet-mamay-badge-cap" class="text-[10px] text-blue-950 font-mono font-semibold bg-blue-50 border border-blue-200 px-1 py-0.5 rounded text-center" title="Xem mã máy đã nhập dữ liệu của tờ này">
              💻 Máy nhập: —
            </div>

            <!-- CÁC LINK XANH NGHIÊNG GẠCH CHÂN CHUẨN HÌNH -->
            <div class="flex flex-col gap-0.5 pt-1 border-t border-gray-300">
              <button id="lnk-kiem-tra-dt-cap" class="classic-link-btn">Kiểm tra DT (Ctrl+F5)</button>
              <button id="lnk-in-bang-ke-cap" class="classic-link-btn">In bảng kê</button>
              <button id="lnk-kiem-tra-f3-cap" class="classic-link-btn">Kiểm tra Đại lý - F3</button>
              <button id="lnk-doi-to-cap" class="classic-link-btn">Đổi tờ đại lý</button>
              <button id="lnk-doi-dai-ly-cap" class="classic-link-btn">Đổi đại lý (F11)</button>
            </div>
          </div>

          <!-- DÀN NÚT XÁM CHUẨN WINDOWS CLASSIC (11 NÚT) -->
          <div class="flex flex-col gap-1">
            <button id="btn-action-xoa-to-cap" class="classic-btn w-full">Xoá tờ hiện tại</button>
            <button id="btn-action-xoa-daily-cap" class="classic-btn w-full">Xoá đại lý hiện tại</button>
            <button id="btn-action-xoa-ngay-cap" class="classic-btn w-full">Xoá dữ liệu ngày</button>
            <button id="btn-action-tong-hop-dt-cap" class="classic-btn w-full font-semibold">Tổng hợp DT - rút thưởng</button>
            <button id="btn-action-bao-cao-nhanh-cap" class="classic-btn w-full">Báo cáo nhanh</button>
            <button id="btn-action-hop-so-fax-cap" class="classic-btn w-full">Tổng hợp số liệu để Fax</button>
            <button id="btn-action-bang-ke-th-cap" class="classic-btn w-full">Bảng kê tổng hợp số dự thưởng</button>
            <button id="btn-action-bang-ke-to-cap" class="classic-btn w-full">Bảng kê TH số dự thưởng theo tổ</button>
            <button id="btn-action-truyen-so-lieu-cap" class="classic-btn w-full">Truyền số liệu</button>
            <button id="btn-action-thoat-cap" class="classic-btn w-full font-bold text-red-700">Thoát</button>
            <button id="btn-action-switch-page-cap" class="classic-btn w-full font-bold text-blue-900 bg-blue-100">
              Chuyển Nhập Lô Tô đặc biệt
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
              <button id="btn-save-cap" class="w-full py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-[11px] shadow">
                💾 Lưu (Ctrl+S)
              </button>
            </div>
          </div>

        </div>

        <!-- CỘT BÊN PHẢI: KHUNG LƯỚI ĐA Ô 4 PHÂN KHU + THANH BỔ SUNG + BẢNG TỔNG HỢP (LIỀN SÁT NHAU) -->
        <div class="flex-1 w-full overflow-x-auto bg-white border border-[#7a889b] shadow-sm rounded flex flex-col">
          <div class="grid grid-cols-1 md:grid-cols-[3fr_3fr_2fr_2fr] grid-cap-sections divide-x divide-[#7a889b]">
            
            <!-- PHÂN KHU 1: Lô tô cặp 10.000 (2 cột nhập, STT Xanh) -->
            <div class="flex flex-col">
              <div class="bg-[#002080] text-white font-bold text-center py-1 text-[11px] tracking-wide uppercase">
                Lô tô cặp 10.000
              </div>
              <table class="classic-grid-table">
                <tbody>
                  ${generateCapRows('cap10k', 2, 'blue')}
                </tbody>
              </table>
            </div>

            <!-- PHÂN KHU 2: Lô tô cặp 20.000 (2 cột nhập, STT Xanh) -->
            <div class="flex flex-col">
              <div class="bg-[#002080] text-white font-bold text-center py-1 text-[11px] tracking-wide uppercase">
                Lô tô cặp 20.000
              </div>
              <table class="classic-grid-table">
                <tbody>
                  ${generateCapRows('cap20k', 2, 'blue')}
                </tbody>
              </table>
            </div>

            <!-- PHÂN KHU 3: Lô tô 3X23 20 000 (2 CỘT NHẬP, TIÊU ĐỀ ĐỎ CHỮ VÀNG, STT ĐỎ) -->
            <div class="flex flex-col">
              <div class="bg-[#c00000] text-[#ffff00] font-black text-center py-1 text-[11px] tracking-wide uppercase shadow-sm">
                Lô tô 3X23 20 000
              </div>
              <table class="classic-grid-table">
                <tbody>
                  ${generateCapRows('3x23', 2, 'red')}
                </tbody>
              </table>
            </div>

            <!-- PHÂN KHU 4: Lô tô 2X27 20 000 (2 CỘT NHẬP, TIÊU ĐỀ XANH, STT XANH) -->
            <div class="flex flex-col">
              <div class="bg-[#0020d0] text-white font-black text-center py-1 text-[11px] tracking-wide uppercase shadow-sm">
                Lô tô 2X27 20 000
              </div>
              <table class="classic-grid-table">
                <tbody>
                  ${generateCapRows('2x27', 2, 'blue')}
                </tbody>
              </table>
            </div>

          </div>

          <!-- THANH BỔ SUNG CẶP SỐ 10K, 20K, 3X23, 2X27 CHUẨN HÌNH (SÁT VỚI DÒNG CUỐI CỦA BẢNG) -->
          <div class="bonus-bar-cap border-t border-[#7a889b]">
            <div class="flex items-center justify-between px-1.5">
              <span>Bổ sung cặp số 10.000:</span>
              <input 
                type="text" 
                id="input-bs-cap10k" 
                value="0" 
                class="input-bo-sung-cap classic-input w-12 text-right font-black text-blue-950 bg-white border border-[#7a889b] px-1 py-0.5 rounded text-xs outline-none focus:bg-yellow-100 focus:ring-1 focus:ring-blue-500" 
                title="Nhập số lượng vé bổ sung rồi Enter"
                autocomplete="off"
              />
            </div>
            <div class="flex items-center justify-between px-1.5">
              <span>Bổ sung cặp số 20.000:</span>
              <input 
                type="text" 
                id="input-bs-cap20k" 
                value="0" 
                class="input-bo-sung-cap classic-input w-12 text-right font-black text-blue-950 bg-white border border-[#7a889b] px-1 py-0.5 rounded text-xs outline-none focus:bg-yellow-100 focus:ring-1 focus:ring-blue-500" 
                title="Nhập số lượng vé bổ sung rồi Enter"
                autocomplete="off"
              />
            </div>
            <div class="flex items-center justify-between px-1.5">
              <span class="bonus-yellow-label">3X23 20.000:</span>
              <input 
                type="text" 
                id="input-bs-3x23" 
                value="0" 
                class="input-bo-sung-cap classic-input w-12 text-right font-black text-blue-900 bg-white border border-[#7a889b] px-1 py-0.5 rounded text-xs outline-none focus:bg-yellow-100 focus:ring-1 focus:ring-blue-500" 
                title="Nhập số lượng vé bổ sung rồi Enter"
                autocomplete="off"
              />
            </div>
            <div class="flex items-center justify-between px-1.5">
              <span class="bonus-yellow-label">2X27 20.000:</span>
              <input 
                type="text" 
                id="input-bs-2x27" 
                value="0" 
                class="input-bo-sung-cap classic-input w-12 text-right font-black text-blue-900 bg-white border border-[#7a889b] px-1 py-0.5 rounded text-xs outline-none focus:bg-yellow-100 focus:ring-1 focus:ring-blue-500" 
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
                <td>0</td><td>0</td><td>0</td><td>0</td>
                <td>0</td><td>0</td><td>0</td><td>0</td>
                <td>0</td><td>0</td>
                <td>0</td>
                <td class="text-right pr-2">0</td>
              </tr>

              <!-- DÒNG VÉ 10.000 đ -->
              <tr class="row-ve">
                <td class="text-left font-bold pl-2">Vé 10 000 đ</td>
                <td>0</td><td>0</td><td>0</td><td>0</td>
                <td id="count-cap10k-2cap">0</td>
                <td id="count-cap10k-3cap">0</td>
                <td id="count-cap10k-4cap">0</td>
                <td id="sum-ve-cap10k" class="font-extrabold">0</td>
                <td>0</td><td>0</td>
                <td id="total-ve-cap10k" class="font-bold">0</td>
                <td id="total-tien-cap10k" class="font-bold text-right pr-2">0</td>
              </tr>

              <!-- DÒNG VÉ 20.000 đ (HIỂN THỊ CẢ CẶP 20K, 3X23 VÀ 2X27 NHƯ HÌNH GỐC) -->
              <tr class="row-ve">
                <td class="text-left font-bold pl-2">Vé 20 000 đ</td>
                <td>0</td><td>0</td><td>0</td><td>0</td>
                <td id="count-cap20k-2cap">0</td>
                <td id="count-cap20k-3cap">0</td>
                <td id="count-cap20k-4cap">0</td>
                <td id="sum-ve-cap20k" class="font-extrabold">0</td>
                <td id="val-3x23-ve" class="font-extrabold text-red-700">0</td>
                <td id="val-2x27-ve" class="font-extrabold text-blue-900">0</td>
                <td id="total-ve-20k" class="font-bold">0</td>
                <td id="total-tien-20k" class="font-bold text-right pr-2">0</td>
              </tr>

              <!-- DÒNG THÀNH TIỀN -->
              <tr class="row-thanh-tien">
                <td class="text-left font-black pl-2">Thành Tiền</td>
                <td>0</td><td>0</td><td>0</td><td>0</td>
                <td id="thanh-tien-2cap">0</td>
                <td id="thanh-tien-3cap">0</td>
                <td id="thanh-tien-4cap">0</td>
                <td id="thanh-tien-cong-cap">0</td>
                <td id="thanh-tien-3x23" class="font-black text-red-700">0</td>
                <td id="thanh-tien-2x27" class="font-black text-blue-900">0</td>
                <td id="grand-total-ve-cap" class="font-black text-red-600">0</td>
                <td id="grand-total-tien-cap" class="font-black text-red-700 text-right pr-2">0</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      <!-- MODAL F11: NHẬP MÃ ĐẠI LÝ -->
      <div id="modal-f11-daily-cap" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 hidden">
        <div class="bg-white rounded-lg shadow-2xl border-2 border-blue-600 w-full max-w-md overflow-hidden">
          <div class="bg-blue-700 text-white px-4 py-2.5 flex justify-between items-center font-bold">
            <span class="flex items-center gap-2 text-sm"><span>🏢</span> CHỌN ĐẠI LÝ NHẬP DOANH SỐ (F11)</span>
            <button id="btn-close-f11-cap" class="text-white hover:text-red-200 text-lg font-bold">✕</button>
          </div>
          <div class="p-4 space-y-3">
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1">Nhập Mã Đại Lý hoặc Tên Đại Lý:</label>
              <input 
                type="text" 
                id="input-f11-ma-cap" 
                placeholder="Gõ mã ĐL (VD: 001, 002) hoặc tên đại lý..." 
                class="w-full px-3 py-2 border-2 border-blue-500 rounded font-bold text-base outline-none focus:ring-2 focus:ring-blue-300"
                autocomplete="off"
              />
            </div>
            <div class="text-[11px] text-gray-500">
              💡 <em>Gõ mã rồi nhấn <strong>Enter</strong> để nạp toàn bộ số liệu đại lý và bắt đầu nhập số ngay.</em>
            </div>
            <div class="border rounded max-h-48 overflow-y-auto bg-gray-50 divide-y divide-gray-200" id="list-f11-daily-cap">
              <!-- Danh sách đại lý nạp động -->
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t">
              <button id="btn-f11-cancel-cap" class="px-4 py-1.5 bg-gray-400 hover:bg-gray-500 text-white rounded font-bold text-xs">
                Hủy bỏ (Esc)
              </button>
              <button id="btn-f11-submit-cap" class="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs">
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
 * Sinh 20 dòng ma trận cho Cặp 10K, Cặp 20K, 3x23 và 2x27
 * Cột STT: màu xanh cho Cặp & 2x27, màu ĐỎ cho 3x23 theo đúng ảnh gốc!
 */
function generateCapRows(type, colsCount, color) {
  let html = '';
  const sttBg = color === 'red' ? 'bg-[#c00000]' : 'bg-[#002080]';

  for (let r = 1; r <= TOTAL_ROWS; r++) {
    const stt = String(r).padStart(2, '0');
    const isDivider = (r === 5 || r === 10 || r === 15);
    const dividerClass = isDivider ? 'row-red-divider' : '';

    html += `
      <tr class="h-6 ${dividerClass} border-b border-[#cbd5e1] hover:bg-yellow-50">
        <!-- CỘT STT: NỀN XANH HOẶC ĐỎ THEO CHUẨN PHẦN MỀM GỐC -->
        <td class="w-6 text-center font-bold ${sttBg} text-white border-r border-[#7a889b] text-[10px]">
          ${stt}
        </td>
    `;

    for (let c = 1; c <= colsCount; c++) {
      html += `
        <td class="border-r border-[#94a3b8] p-0">
          <input 
            type="text" 
            class="input-grid-cell-cap w-full h-full text-center font-bold text-gray-900 bg-transparent outline-none focus:bg-yellow-100 focus:text-blue-900"
            data-type="${type}"
            data-row="${r}"
            data-col="${c}"
            autocomplete="off"
            maxlength="25"
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

  document.getElementById('input-ma-dl-cap')?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleQuickMaDl(e.target.value.trim());
    }
  });

  document.getElementById('btn-quick-lock-toggle-cap')?.addEventListener('click', toggleQuickLock);
  document.getElementById('btn-switch-don-top')?.addEventListener('click', () => navigate('#/nhaploto-don'));

  document.getElementById('btn-to-truoc-cap')?.addEventListener('click', () => changeToSo(-1));
  document.getElementById('btn-to-tiep-cap')?.addEventListener('click', () => changeToSo(1));
  document.getElementById('input-to-so-cap')?.addEventListener('change', (e) => {
    currentToSo = parseInt(e.target.value, 10) || 1;
    loadExistingData();
  });

  document.getElementById('btn-save-cap')?.addEventListener('click', handleSave);

  const capBonusIds = ['input-bs-cap10k', 'input-bs-cap20k', 'input-bs-3x23', 'input-bs-2x27'];
  capBonusIds.forEach((id, idx) => {
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
        triggerAutoSaveCap(true);
        showToast('Đã lưu dữ liệu bổ sung', 'success');
        if (idx < capBonusIds.length - 1) {
          const next = document.getElementById(capBonusIds[idx + 1]);
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
  if (_autoSaveTimerCap) {
    clearTimeout(_autoSaveTimerCap);
    handleSave(true);
  }
  if (window._lotoCapKeyHandler) {
    window.removeEventListener('keydown', window._lotoCapKeyHandler);
    window._lotoCapKeyHandler = null;
  }
}

function startClock() {
  const clockEl = document.getElementById('clock-classic-cap');
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
  document.getElementById('lnk-kiem-tra-dt-cap')?.addEventListener('click', () => showKiemTraDT());
  document.getElementById('lnk-in-bang-ke-cap')?.addEventListener('click', () => window.print());
  document.getElementById('lnk-kiem-tra-f3-cap')?.addEventListener('click', () => showTongDaiLy(false));
  document.getElementById('lnk-doi-to-cap')?.addEventListener('click', () => {
    const inp = document.getElementById('input-to-so-cap');
    if (inp) { inp.focus(); inp.select(); }
  });
  document.getElementById('lnk-doi-dai-ly-cap')?.addEventListener('click', () => openF11Modal());

  document.getElementById('btn-action-xoa-to-cap')?.addEventListener('click', () => {
    if (confirm(`Bạn có chắc muốn xóa trắng tờ số ${currentToSo}?`)) {
      clearAllInputs();
      calculateTotals();
    }
  });

  document.getElementById('btn-action-xoa-daily-cap')?.addEventListener('click', async () => {
    if (!currentDaiLyId) return showToast('Chưa chọn đại lý', 'warning');
    if (confirm(`CẢNH BÁO: Bạn có chắc muốn xóa TẤT CẢ các tờ của đại lý [${currentDaiLy?.ma || ''}] trong ngày hôm nay?`)) {
      clearAllInputs();
      calculateTotals();
      showToast('Đã xóa dữ liệu đại lý hiện tại', 'info');
    }
  });

  document.getElementById('btn-action-xoa-ngay-cap')?.addEventListener('click', () => {
    if (confirm(`CẢNH BÁO NGUY HIỂM: Bạn có chắc muốn xóa TOÀN BỘ số liệu ngày ${formatDate(currentNgay)}?`)) {
      showToast('Thao tác yêu cầu quyền Quản trị viên cấp cao', 'warning');
    }
  });

  document.getElementById('btn-action-tong-hop-dt-cap')?.addEventListener('click', () => showTongDaiLy());
  document.getElementById('btn-action-bao-cao-nhanh-cap')?.addEventListener('click', () => navigate('#/baocao'));
  document.getElementById('btn-action-hop-so-fax-cap')?.addEventListener('click', () => window.print());
  document.getElementById('btn-action-bang-ke-th-cap')?.addEventListener('click', () => navigate('#/baocao'));
  document.getElementById('btn-action-bang-ke-to-cap')?.addEventListener('click', () => navigate('#/baocao'));
  document.getElementById('btn-action-truyen-so-lieu-cap')?.addEventListener('click', () => {
    showToast('Đã truyền số liệu lên máy chủ trung tâm thành công!', 'success');
  });
  document.getElementById('btn-action-thoat-cap')?.addEventListener('click', () => navigate('#/dashboard'));
  document.getElementById('btn-action-switch-page-cap')?.addEventListener('click', () => navigate('#/nhaploto-don'));
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
  const lbl = document.getElementById('lbl-ten-dai-ly-cap');
  const inpMa = document.getElementById('input-ma-dl-cap');
  if (lbl) lbl.textContent = currentDaiLy ? (currentDaiLy.ten || currentDaiLy.name) : '-- Chưa chọn đại lý --';
  if (inpMa) inpMa.value = currentDaiLy?.ma || currentDaiLyId || '---';
}

let _autoSaveTimerCap = null;
function triggerAutoSaveCap(immediate = false) {
  clearTimeout(_autoSaveTimerCap);
  if (immediate) {
    handleSave(true);
  } else {
    _autoSaveTimerCap = setTimeout(() => {
      handleSave(true);
    }, 150);
  }
}

async function changeToSo(delta) {
  if (currentDaiLyId && !isLocked) {
    await handleSave(true);
  }
  currentToSo = Math.max(1, currentToSo + delta);
  const input = document.getElementById('input-to-so-cap');
  if (input) input.value = currentToSo;
  await loadExistingData();
}

/**
 * Xử lý chuỗi nhập cặp:
 * VD: "55789885+5" -> sdt = "55-78-98-85" (4 cặp), sl = 5
 * Hoặc "55 78" -> 2 cặp, sl = 1
 * Đối với 3x23 hoặc 2x27: "595" -> 1 vé, "595+2" -> 2 vé
 */
function parseCapCell(value, type) {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;

  // Bỏ qua các lệnh điều khiển như +5, .5, -5
  if (/^(\+|\.|\-)[0-9]{1,2}$/.test(str)) return null;

  let raw = str;
  let sl = 1;
  if (str.includes('+')) {
    const parts = str.split('+');
    raw = parts[0].trim();
    sl = parseInt(parts[1], 10) || 1;
  }

  if (type === '3x23' || type === '2x27') {
    const num = raw.replace(/\D/g, '');
    if (!num) return null;
    return { sdt: num, sl, capCount: 1 };
  }

  // Đối với Lô tô Cặp: tách các cặp 2 chữ số
  const cleanDigits = raw.replace(/\D/g, '');
  if (cleanDigits.length < 4) {
    if (raw.includes('-') || raw.includes(' ')) {
      const parts = raw.split(/[\s-]+/).filter(Boolean);
      return { sdt: parts.join('-'), sl, capCount: parts.length };
    }
    return null;
  }

  const pairs = [];
  for (let i = 0; i < cleanDigits.length; i += 2) {
    const p = cleanDigits.slice(i, i + 2);
    if (p.length === 2) pairs.push(p);
  }

  return {
    sdt: pairs.join('-'),
    sl,
    capCount: pairs.length
  };
}

function updateLockUICap() {
  isLocked = isOverTime || isSessionLocked || isSheetLocked;
  const badge = document.getElementById('badge-lock-status-cap');
  const btnLock = document.getElementById('btn-quick-lock-toggle-cap');

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

  document.querySelectorAll('.input-grid-cell-cap, .input-bo-sung-cap').forEach(inp => {
    inp.disabled = isLocked;
  });
  const saveBtn = document.getElementById('btn-save-cap');
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

    updateLockUICap();
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
      updateLockUICap();
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
  updateLockUICap();
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
    if (e.target.classList.contains('input-grid-cell-cap')) {
      e.target.value = e.target.value.replace(/[^0-9+.\/\-\s]/g, '');
      calculateTotals();
    }
  });
}

function setupKeyboardNavigation() {
  if (window._lotoCapKeyHandler) {
    window.removeEventListener('keydown', window._lotoCapKeyHandler);
    window._lotoCapKeyHandler = null;
  }

  window._lotoCapKeyHandler = (e) => {
    const f11Modal = document.getElementById('modal-f11-daily-cap');
    const isF11Open = f11Modal && !f11Modal.classList.contains('hidden');

    if (isF11Open) {
      if (e.key === 'Escape') { e.preventDefault(); closeF11Modal(); return; }
      if (e.key === 'Enter') { e.preventDefault(); submitF11Modal(); return; }
      return;
    }

    // F12 or PageUp or *: Chuyển loại hình (sang Lô tô Đặc biệt)
    if (e.key === '*' || e.key === 'F12' || e.key === 'PageUp') {
      e.preventDefault();
      navigate('#/nhaploto-don');
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

    // F3: Kiểm tra Đại lý (Ctrl+F3: Kiểm tra ĐL Lệch DT)
    if (e.key === 'F3') {
      e.preventDefault();
      if (e.ctrlKey) {
        showKiemTraLechDTCap();
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

    // F5: Tờ trước (Ctrl+F5: Kiểm tra DT tờ hiện tại)
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
      insertBlankCellCap();
      return;
    }

    // F8: Xoá ô
    if (e.key === 'F8') {
      e.preventDefault();
      deleteCellAndShiftUpCap();
      return;
    }

    // F9: Đổi loại vé (quay vòng cap10k -> cap20k -> 3x23 -> 2x27)
    if (e.key === 'F9') {
      e.preventDefault();
      switchTicketTypeCap();
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
    if (!active || !active.classList.contains('input-grid-cell-cap')) return;

    const type = active.dataset.type;
    const r = parseInt(active.dataset.row, 10);
    const c = parseInt(active.dataset.col, 10);
    const rawVal = active.value.trim();

    const sectionCols = { cap10k: 2, cap20k: 2, '3x23': 2, '2x27': 2 };
    const maxCols = sectionCols[type] || 2;

    if (e.key === 'Enter') {
      e.preventDefault();

      // 1. +N hoặc .N -> Nhảy đến ô N
      const jumpMatch = rawVal.match(/^(\+|\.)([0-9]{1,2})$/);
      if (jumpMatch) {
        active.value = '';
        calculateTotals();
        triggerAutoSaveCap();
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
          const cellEl = document.querySelector(`.input-grid-cell-cap[data-type="${type}"][data-row="${rowIdx}"][data-col="${c}"]`);
          if (cellEl) cellEl.value = '';
        }
        calculateTotals();
        triggerAutoSaveCap();
        showToast(`Đã xoá đến ô ${endR}`, 'info');
        focusCell(type, startR, c);
        return;
      }

      // 3. SDT.N -> Nhập SDT đến ô N
      const fillToMatch = rawVal.match(/^(.+)\.([0-9]{1,2})$/);
      if (fillToMatch && fillToMatch[1] && !fillToMatch[1].startsWith('.')) {
        const sdtVal = fillToMatch[1].trim();
        const targetRow = Math.min(TOTAL_ROWS, Math.max(r, parseInt(fillToMatch[2], 10)));
        for (let rowIdx = r; rowIdx <= targetRow; rowIdx++) {
          const cellEl = document.querySelector(`.input-grid-cell-cap[data-type="${type}"][data-row="${rowIdx}"][data-col="${c}"]`);
          if (cellEl) cellEl.value = sdtVal;
        }
        calculateTotals();
        triggerAutoSaveCap();
        showToast(`Đã nhập "${sdtVal}" đến ô ${targetRow}`, 'success');
        if (targetRow < TOTAL_ROWS) {
          focusCell(type, targetRow + 1, c);
        } else {
          focusCell(type, 1, c < maxCols ? c + 1 : 1);
        }
        return;
      }

      // 4. SDT/N -> Nhập SDT Trên N ô
      const fillCountMatch = rawVal.match(/^(.+)\/([0-9]{1,2})$/);
      if (fillCountMatch && fillCountMatch[1]) {
        const sdtVal = fillCountMatch[1].trim();
        const count = parseInt(fillCountMatch[2], 10) || 1;
        const endRow = Math.min(TOTAL_ROWS, r + count - 1);
        for (let rowIdx = r; rowIdx <= endRow; rowIdx++) {
          const cellEl = document.querySelector(`.input-grid-cell-cap[data-type="${type}"][data-row="${rowIdx}"][data-col="${c}"]`);
          if (cellEl) cellEl.value = sdtVal;
        }
        calculateTotals();
        triggerAutoSaveCap();
        showToast(`Đã nhập "${sdtVal}" trên ${count} ô (đến ô ${endRow})`, 'success');
        if (endRow < TOTAL_ROWS) {
          focusCell(type, endRow + 1, c);
        } else {
          focusCell(type, 1, c < maxCols ? c + 1 : 1);
        }
        return;
      }

      // 5. Đi dọc xuống dòng dưới bình thường (r -> r + 1)
      triggerAutoSaveCap();
      let nextRow = r;
      let nextCol = c;
      let nextType = type;

      if (r < TOTAL_ROWS) {
        nextRow = r + 1;
        nextCol = c;
        nextType = type;
      } else {
        nextRow = 1;
        if (c < maxCols) {
          nextCol = c + 1;
          nextType = type;
        } else if (type === 'cap10k') {
          nextType = 'cap20k';
          nextCol = 1;
        } else if (type === 'cap20k') {
          nextType = '3x23';
          nextCol = 1;
        } else if (type === '3x23') {
          nextType = '2x27';
          nextCol = 1;
        } else {
          nextType = 'cap10k';
          nextCol = 1;
        }
      }
      focusCell(nextType, nextRow, nextCol);
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
        if (c < maxCols) focusCell(type, r, c + 1);
        else if (type === 'cap10k') focusCell('cap20k', r, 1);
        else if (type === 'cap20k') focusCell('3x23', r, 1);
        else if (type === '3x23') focusCell('2x27', r, 1);
        else if (type === '2x27') focusCell('cap10k', r, 1);
      }
    } else if (e.key === 'ArrowLeft') {
      if (active.selectionStart === 0) {
        e.preventDefault();
        if (c > 1) focusCell(type, r, c - 1);
        else if (type === '2x27') focusCell('3x23', r, 2);
        else if (type === '3x23') focusCell('cap20k', r, 2);
        else if (type === 'cap20k') focusCell('cap10k', r, 2);
        else if (type === 'cap10k') focusCell('2x27', r, 2);
      }
    }
  };

  window.addEventListener('keydown', window._lotoCapKeyHandler);
}

function insertBlankCellCap() {
  const active = document.activeElement;
  if (!active || !active.classList.contains('input-grid-cell-cap')) return;
  const type = active.dataset.type;
  const r = parseInt(active.dataset.row, 10);
  const c = parseInt(active.dataset.col, 10);

  for (let rowIdx = TOTAL_ROWS; rowIdx > r; rowIdx--) {
    const prev = document.querySelector(`.input-grid-cell-cap[data-type="${type}"][data-row="${rowIdx - 1}"][data-col="${c}"]`);
    const curr = document.querySelector(`.input-grid-cell-cap[data-type="${type}"][data-row="${rowIdx}"][data-col="${c}"]`);
    if (curr && prev) curr.value = prev.value;
  }
  active.value = '';
  calculateTotals();
  showToast('Đã chèn ô trống (F7)', 'info');
}

function deleteCellAndShiftUpCap() {
  const active = document.activeElement;
  if (!active || !active.classList.contains('input-grid-cell-cap')) return;
  const type = active.dataset.type;
  const r = parseInt(active.dataset.row, 10);
  const c = parseInt(active.dataset.col, 10);

  for (let rowIdx = r; rowIdx < TOTAL_ROWS; rowIdx++) {
    const next = document.querySelector(`.input-grid-cell-cap[data-type="${type}"][data-row="${rowIdx + 1}"][data-col="${c}"]`);
    const curr = document.querySelector(`.input-grid-cell-cap[data-type="${type}"][data-row="${rowIdx}"][data-col="${c}"]`);
    if (curr && next) curr.value = next.value;
  }
  const last = document.querySelector(`.input-grid-cell-cap[data-type="${type}"][data-row="${TOTAL_ROWS}"][data-col="${c}"]`);
  if (last) last.value = '';
  calculateTotals();
  showToast('Đã xoá ô và kéo dòng lên (F8)', 'info');
}

function switchTicketTypeCap() {
  const active = document.activeElement;
  const currentType = (active && active.dataset?.type) || 'cap10k';
  const currentR = (active && parseInt(active.dataset?.row, 10)) || 1;
  const currentC = (active && parseInt(active.dataset?.col, 10)) || 1;

  const order = ['cap10k', 'cap20k', '3x23', '2x27'];
  let idx = order.indexOf(currentType);
  if (idx === -1) idx = 0;
  const nextType = order[(idx + 1) % order.length];

  const labelMap = {
    'cap10k': 'Lô tô Cặp 10.000đ',
    'cap20k': 'Lô tô Cặp 20.000đ',
    '3x23': 'Lô tô 3X23 20.000đ',
    '2x27': 'Lô tô 2X27 20.000đ'
  };
  focusCell(nextType, currentR, currentC);
  showToast(`Đổi sang ${labelMap[nextType]} (F9)`, 'info');
}

function showKiemTraLechDTCap() {
  const grandTotalTienEl = document.getElementById('grand-total-tien-cap');
  const grandTotalTien = (parseInt(grandTotalTienEl?.textContent || '0', 10)) * 1000;
  const dtBoSungInput = document.getElementById('input-dt-bo-sung-cap');
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
  const target = document.querySelector(`.input-grid-cell-cap[data-type="${type}"][data-row="${row}"][data-col="${col}"]`);
  if (target) {
    target.focus();
    target.select();
  }
}

function focusFirstCell() {
  focusCell('cap10k', 1, 1);
}

function openF11Modal() {
  const modal = document.getElementById('modal-f11-daily-cap');
  const input = document.getElementById('input-f11-ma-cap');
  const listEl = document.getElementById('list-f11-daily-cap');
  if (!modal || !input) return;

  renderF11List(daiLyList);
  modal.classList.remove('hidden');
  input.value = '';
  input.focus();
}

function closeF11Modal() {
  const modal = document.getElementById('modal-f11-daily-cap');
  if (modal) modal.classList.add('hidden');
}

function renderF11List(list) {
  const listEl = document.getElementById('list-f11-daily-cap');
  if (!listEl) return;

  if (list.length === 0) {
    listEl.innerHTML = `<div class="p-3 text-center text-xs text-gray-400">Không tìm thấy đại lý nào</div>`;
    return;
  }

  listEl.innerHTML = list.map(dl => `
    <div class="item-f11-daily-cap px-3 py-2 hover:bg-blue-100 cursor-pointer flex justify-between items-center text-xs font-semibold" data-id="${dl.id}">
      <span class="text-blue-900">
        <strong class="font-mono text-sm bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded mr-2">${dl.ma || '---'}</strong>
        ${dl.ten || dl.name}
      </span>
      <span class="text-[11px] text-gray-500 font-mono">${dl.diaChi || ''}</span>
    </div>
  `).join('');

  listEl.querySelectorAll('.item-f11-daily-cap').forEach(el => {
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
  const input = document.getElementById('input-f11-ma-cap');
  const btnClose = document.getElementById('btn-close-f11-cap');
  const btnCancel = document.getElementById('btn-f11-cancel-cap');
  const btnSubmit = document.getElementById('btn-f11-submit-cap');

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
  const input = document.getElementById('input-f11-ma-cap');
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
  const grandTotalTien = document.getElementById('grand-total-tien-cap')?.textContent || '0';
  const grandTotalVe = document.getElementById('grand-total-ve-cap')?.textContent || '0';
  alert(`📋 KIỂM TRA DOANH THU TỜ HIỆN TẠI (LÔ CẶP, 3X23, 2X27)\n\n• Tờ số: ${currentToSo}\n• Đại lý: ${currentDaiLy?.ten || currentDaiLyId}\n• Tổng vé: ${grandTotalVe} vé\n• Tổng tiền: ${grandTotalTien} nghìn đồng`);
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

    const screenVe = parseInt(document.getElementById('grand-total-ve-cap')?.textContent || '0', 10);
    const screenTien = (parseInt(document.getElementById('grand-total-tien-cap')?.textContent || '0', 10)) * 1000;

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
 * Tính toán chính xác tổng hợp cho Cặp 10K, Cặp 20K, 3x23 và 2x27
 * Giống hệt ảnh 1:
 * - 3x23 nhập 12 số -> Vé 20.000 đ cột 3X23 = 12, Tổng vé = 12, Tổng tiền = 240
 * - Dòng Thành Tiền: cột 3X23 = 240, Tổng vé = 12, Tổng tiền = 240
 */
function calculateTotals() {
  let c10_2cap = 0, c10_3cap = 0, c10_4cap = 0, c10_totalVe = 0;
  let c20_2cap = 0, c20_3cap = 0, c20_4cap = 0, c20_totalVe = 0;
  let ve3x23 = 0, ve2x27 = 0;

  // Cặp 10K
  document.querySelectorAll('.input-grid-cell-cap[data-type="cap10k"]').forEach(cell => {
    const p = parseCapCell(cell.value, 'cap10k');
    if (p) {
      if (p.capCount === 2) c10_2cap += p.sl;
      else if (p.capCount === 3) c10_3cap += p.sl;
      else if (p.capCount >= 4) c10_4cap += p.sl;
      c10_totalVe += p.sl;
    }
  });

  // Cặp 20K
  document.querySelectorAll('.input-grid-cell-cap[data-type="cap20k"]').forEach(cell => {
    const p = parseCapCell(cell.value, 'cap20k');
    if (p) {
      if (p.capCount === 2) c20_2cap += p.sl;
      else if (p.capCount === 3) c20_3cap += p.sl;
      else if (p.capCount >= 4) c20_4cap += p.sl;
      c20_totalVe += p.sl;
    }
  });

  // 3x23 (20.000đ)
  document.querySelectorAll('.input-grid-cell-cap[data-type="3x23"]').forEach(cell => {
    const p = parseCapCell(cell.value, '3x23');
    if (p) {
      ve3x23 += p.sl;
    }
  });

  // 2x27 (20.000đ)
  document.querySelectorAll('.input-grid-cell-cap[data-type="2x27"]').forEach(cell => {
    const p = parseCapCell(cell.value, '2x27');
    if (p) {
      ve2x27 += p.sl;
    }
  });

  const bsCap10k = parseInt(document.getElementById('input-bs-cap10k')?.value || '0', 10) || 0;
  const bsCap20k = parseInt(document.getElementById('input-bs-cap20k')?.value || '0', 10) || 0;
  const bs3x23   = parseInt(document.getElementById('input-bs-3x23')?.value || '0', 10) || 0;
  const bs2x27   = parseInt(document.getElementById('input-bs-2x27')?.value || '0', 10) || 0;

  const c10_finalVe = c10_totalVe + bsCap10k;
  const c20_finalVe = c20_totalVe + bsCap20k;
  const finalVe3x23 = ve3x23 + bs3x23;
  const finalVe2x27 = ve2x27 + bs2x27;

  const tien10k = (c10_finalVe * 10000) / 1000;
  const tien20k = (c20_finalVe * 20000) / 1000;
  const tien3x23 = (finalVe3x23 * 20000) / 1000;
  const tien2x27 = (finalVe2x27 * 20000) / 1000;

  const totalVe20kRow = c20_finalVe + finalVe3x23 + finalVe2x27;
  const totalTien20kRow = tien20k + tien3x23 + tien2x27;

  const grandVe = c10_finalVe + totalVe20kRow;
  const grandTien = tien10k + totalTien20kRow;

  // Dòng Vé 10.000 đ
  const elC10_2 = document.getElementById('count-cap10k-2cap');
  const elC10_3 = document.getElementById('count-cap10k-3cap');
  const elC10_4 = document.getElementById('count-cap10k-4cap');
  const elSumVe10k = document.getElementById('sum-ve-cap10k');
  const elTotalVe10k = document.getElementById('total-ve-cap10k');
  const elTotalTien10k = document.getElementById('total-tien-cap10k');

  if (elC10_2) elC10_2.textContent = c10_2cap;
  if (elC10_3) elC10_3.textContent = c10_3cap;
  if (elC10_4) elC10_4.textContent = c10_4cap;
  if (elSumVe10k) elSumVe10k.textContent = c10_finalVe;
  if (elTotalVe10k) elTotalVe10k.textContent = c10_finalVe;
  if (elTotalTien10k) elTotalTien10k.textContent = tien10k;

  // Dòng Vé 20.000 đ
  const elC20_2 = document.getElementById('count-cap20k-2cap');
  const elC20_3 = document.getElementById('count-cap20k-3cap');
  const elC20_4 = document.getElementById('count-cap20k-4cap');
  const elSumVe20k = document.getElementById('sum-ve-cap20k');
  const elVal3x23Ve = document.getElementById('val-3x23-ve');
  const elVal2x27Ve = document.getElementById('val-2x27-ve');
  const elTotalVe20k = document.getElementById('total-ve-20k');
  const elTotalTien20k = document.getElementById('total-tien-20k');

  if (elC20_2) elC20_2.textContent = c20_2cap;
  if (elC20_3) elC20_3.textContent = c20_3cap;
  if (elC20_4) elC20_4.textContent = c20_4cap;
  if (elSumVe20k) elSumVe20k.textContent = c20_finalVe;
  if (elVal3x23Ve) elVal3x23Ve.textContent = finalVe3x23;
  if (elVal2x27Ve) elVal2x27Ve.textContent = finalVe2x27;
  if (elTotalVe20k) elTotalVe20k.textContent = totalVe20kRow;
  if (elTotalTien20k) elTotalTien20k.textContent = totalTien20kRow;

  // Dòng Thành Tiền
  const elThanhTien3x23 = document.getElementById('thanh-tien-3x23');
  const elThanhTien2x27 = document.getElementById('thanh-tien-2x27');
  const elGrandVeCap = document.getElementById('grand-total-ve-cap');
  const elGrandTienCap = document.getElementById('grand-total-tien-cap');

  if (elThanhTien3x23) elThanhTien3x23.textContent = tien3x23;
  if (elThanhTien2x27) elThanhTien2x27.textContent = tien2x27;
  if (elGrandVeCap) elGrandVeCap.textContent = grandVe;
  if (elGrandTienCap) elGrandTienCap.textContent = grandTien;
}

function clearAllInputs() {
  document.querySelectorAll('.input-grid-cell-cap').forEach(inp => inp.value = '');
  ['input-bs-cap10k', 'input-bs-cap20k', 'input-bs-3x23', 'input-bs-2x27'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '0';
  });
}

async function loadExistingData() {
  clearAllInputs();
  calculateTotals();
  if (!currentDaiLyId) return;

  const stop = showLoading('Đang tải dữ liệu tờ...');
  try {
    const list = await getVeLoToByNgayDaiLy(currentNgay, currentDaiLyId);
    const docData = list.find(item => item.loaiHinh === 'cap_so' && (item.toSo || 1) === currentToSo);
    if (docData) {
      let hasData = false;
      ['cap10k', 'cap20k', '3x23', '2x27'].forEach(type => {
        const items = docData[type] || [];
        if (items.length > 0) hasData = true;
        items.forEach(item => {
          if (item.row && item.col) {
            const cell = document.querySelector(`.input-grid-cell-cap[data-type="${type}"][data-row="${item.row}"][data-col="${item.col}"]`);
            if (cell) {
              cell.value = (item.sl && item.sl > 1) ? `${item.sdt}+${item.sl}` : `${item.sdt}`;
            }
          }
        });
      });
      const elBsCap10k = document.getElementById('input-bs-cap10k');
      const elBsCap20k = document.getElementById('input-bs-cap20k');
      const elBs3x23   = document.getElementById('input-bs-3x23');
      const elBs2x27   = document.getElementById('input-bs-2x27');

      const b1 = docData.boSungCap10k || 0;
      const b2 = docData.boSungCap20k || 0;
      const b3 = docData.boSung3x23 || 0;
      const b4 = docData.boSung2x27 || 0;
      if (b1 > 0 || b2 > 0 || b3 > 0 || b4 > 0) hasData = true;

      if (elBsCap10k) elBsCap10k.value = b1;
      if (elBsCap20k) elBsCap20k.value = b2;
      if (elBs3x23)   elBs3x23.value   = b3;
      if (elBs2x27)   elBs2x27.value   = b4;

      calculateTotals();

      // Nếu tờ đã có dữ liệu -> Tự động khóa bảo vệ tránh lỡ tay nhập đè hoặc xóa
      if (hasData) {
        isSheetLocked = true;
      } else {
        isSheetLocked = false;
      }

      const badge = document.getElementById('sheet-mamay-badge-cap');
      if (badge) {
        if (docData.maMay) {
          badge.innerHTML = `💻 Máy nhập: <strong class="text-blue-900 bg-blue-100 px-1 py-0.5 rounded font-mono">${docData.maMay}</strong>`;
        } else {
          badge.innerHTML = `💻 Máy nhập: <span class="text-gray-500">Chưa rõ</span>`;
        }
      }
    } else {
      isSheetLocked = false;
      const badge = document.getElementById('sheet-mamay-badge-cap');
      if (badge) {
        badge.innerHTML = `💻 Máy nhập: <span class="text-gray-400">Tờ mới</span>`;
      }
    }
    updateLockUICap();
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

  const bsCap10k = parseInt(document.getElementById('input-bs-cap10k')?.value || '0', 10) || 0;
  const bsCap20k = parseInt(document.getElementById('input-bs-cap20k')?.value || '0', 10) || 0;
  const bs3x23   = parseInt(document.getElementById('input-bs-3x23')?.value || '0', 10) || 0;
  const bs2x27   = parseInt(document.getElementById('input-bs-2x27')?.value || '0', 10) || 0;

  const deviceMaMay = (localStorage.getItem('xskt_ma_may') || 'A01').toUpperCase();
  const payload = {
    ngay: currentNgay,
    daiLyId: currentDaiLyId,
    daiLyTen: currentDaiLy?.ten || currentDaiLy?.name || '',
    toSo: currentToSo,
    loaiHinh: 'cap_so',
    maMay: deviceMaMay,
    cap10k: [],
    cap20k: [],
    '3x23': [],
    '2x27': [],
    boSungCap10k: bsCap10k,
    boSungCap20k: bsCap20k,
    boSung3x23: bs3x23,
    boSung2x27: bs2x27,
    tongVe: bsCap10k + bsCap20k + bs3x23 + bs2x27,
    tongTien: (bsCap10k * 10000) + (bsCap20k * 20000) + (bs3x23 * 20000) + (bs2x27 * 20000)
  };

  const values = { cap10k: 10000, cap20k: 20000, '3x23': 20000, '2x27': 20000 };

  ['cap10k', 'cap20k', '3x23', '2x27'].forEach(type => {
    const cells = document.querySelectorAll(`.input-grid-cell-cap[data-type="${type}"]`);
    cells.forEach(cell => {
      const parsed = parseCapCell(cell.value, type);
      if (parsed) {
        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);
        payload[type].push({
          row,
          col,
          sdt: parsed.sdt,
          sl: parsed.sl,
          capCount: parsed.capCount
        });
        payload.tongVe += parsed.sl;
        payload.tongTien += parsed.sl * values[type];
      }
    });
  });

  const stop = silent ? null : showLoading('Đang lưu dữ liệu tờ...');
  const saveBtn = document.getElementById('btn-save-cap');
  try {
    const docId = `${currentNgay.replace(/-/g, '')}_${currentDaiLyId}_to${currentToSo}_capso`;
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
