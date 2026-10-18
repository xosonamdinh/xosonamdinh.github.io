/**
 * ketqua.js - M4: Kết Quả Xổ Số (XSMB)
 * XSKT Lô Tô Nam Định
 */
import { saveKetQua, getKetQuaByKy, getKyMoThuong, createKyMoThuong } from '../db.js';
import { showToast, showLoading, formatDate } from '../utils.js';

const PRIZE_STRUCTURE = [
  { key: 'dacBiet',   label: 'Đặc Biệt',  count: 1, digits: 5, color: 'bg-red-700' },
  { key: 'giaiNhat',  label: 'Giải Nhất', count: 1, digits: 5, color: 'bg-blue-700' },
  { key: 'giaiNhi',   label: 'Giải Nhì',  count: 2, digits: 5, color: 'bg-blue-800' },
  { key: 'giaiBA',    label: 'Giải Ba',   count: 6, digits: 5, color: 'bg-blue-800' },
  { key: 'giaiTu',    label: 'Giải Tư',   count: 4, digits: 4, color: 'bg-indigo-700' },
  { key: 'giaiNam',   label: 'Giải Năm',  count: 6, digits: 4, color: 'bg-indigo-700' },
  { key: 'giaiSau',   label: 'Giải Sáu',  count: 3, digits: 3, color: 'bg-teal-700' },
  { key: 'giaiBay',   label: 'Giải Bảy',  count: 4, digits: 2, color: 'bg-gray-700' },
];

let _currentKyId = null;
let _currentNgayYMD = null;
let _kyList = [];

/**
 * Chuẩn hóa ngày về các định dạng cần dùng
 */
function extractDateParts(dateInput) {
  if (!dateInput) {
    const s = sessionStorage.getItem('xskt_ngay');
    if (s) dateInput = s;
  }
  if (!dateInput) dateInput = new Date();

  if (dateInput instanceof Date && !isNaN(dateInput)) {
    const yyyy = String(dateInput.getFullYear());
    const mm = String(dateInput.getMonth() + 1).padStart(2, '0');
    const dd = String(dateInput.getDate()).padStart(2, '0');
    return { yyyy, mm, dd, strMinhNgoc: `${dd}-${mm}-${yyyy}`, strYMD: `${yyyy}-${mm}-${dd}`, strDisplay: `${dd}/${mm}/${yyyy}` };
  }

  const s = String(dateInput).trim();
  // Khớp YYYY-MM-DD
  const mYMD = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (mYMD) {
    const yyyy = mYMD[1];
    const mm = mYMD[2].padStart(2, '0');
    const dd = mYMD[3].padStart(2, '0');
    return { yyyy, mm, dd, strMinhNgoc: `${dd}-${mm}-${yyyy}`, strYMD: `${yyyy}-${mm}-${dd}`, strDisplay: `${dd}/${mm}/${yyyy}` };
  }

  // Khớp DD/MM/YYYY hoặc DD-MM-YYYY
  const mDMY = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (mDMY) {
    const dd = mDMY[1].padStart(2, '0');
    const mm = mDMY[2].padStart(2, '0');
    const yyyy = mDMY[3];
    return { yyyy, mm, dd, strMinhNgoc: `${dd}-${mm}-${yyyy}`, strYMD: `${yyyy}-${mm}-${dd}`, strDisplay: `${dd}/${mm}/${yyyy}` };
  }

  // Mặc định hôm nay
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return { yyyy, mm, dd, strMinhNgoc: `${dd}-${mm}-${yyyy}`, strYMD: `${yyyy}-${mm}-${dd}`, strDisplay: `${dd}/${mm}/${yyyy}` };
}

export async function render() {
  const prizeRows = PRIZE_STRUCTURE.map((p) => {
    const inputs = Array.from({ length: p.count }, (_, i) => /* html */ `
      <input
        type="text"
        inputmode="numeric"
        class="kq-input border border-gray-400 rounded px-2 py-1.5 text-center font-bold text-gray-800 tracking-widest outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
        maxlength="${p.digits}"
        data-key="${p.key}"
        data-idx="${i}"
        placeholder="${'_'.repeat(p.digits)}"
        style="width:${p.digits * 16 + 32}px; font-size:1.1rem;"
      />`).join('');

    return /* html */ `
      <tr class="border-b hover:bg-blue-50">
        <td class="text-center py-2 px-3 w-32 border-r bg-gray-50">
          <span class="inline-block px-2.5 py-1 text-white text-xs font-bold rounded shadow-sm ${p.color}">
            ${p.label}
          </span>
        </td>
        <td class="py-2 px-3">
          <div class="flex flex-wrap gap-2.5 items-center">${inputs}</div>
        </td>
      </tr>`;
  }).join('');

  return /* html */ `
    <div class="page-ketqua max-w-5xl mx-auto">
      <div class="flex flex-wrap justify-between items-center mb-4 pb-2 border-b bg-white p-3 rounded shadow-sm gap-3">
        <h2 class="text-xl font-bold text-blue-900 flex items-center gap-2">
          <span>🎰</span> KẾT QUẢ XỔ SỐ KIẾN THIẾT MIỀN BẮC (XSMB)
        </h2>
        <div class="flex flex-wrap items-center gap-2">
          <label class="font-semibold text-sm">Ngày MT:</label>
          <input
            type="date"
            id="kq-date-picker"
            class="form-input text-sm border border-gray-300 rounded px-2.5 py-1.5 bg-white font-semibold text-blue-900 focus:ring-1 focus:ring-blue-600 outline-none"
          />
          <select id="kq-ky-select" class="form-select text-sm border border-gray-300 rounded px-2.5 py-1.5 bg-white font-semibold min-w-[180px] outline-none">
            <option value="">-- Chọn từ danh sách kỳ --</option>
          </select>
          <button id="btn-lay-tu-dong" class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold shadow flex items-center gap-1.5 transition active:scale-95">
            <span>🌐</span> Lấy từ Minh Ngọc
          </button>
          <button id="btn-nhap-nhanh" class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded text-sm font-semibold flex items-center gap-1 transition">
            <span>📋</span> Dán nhanh
          </button>
        </div>
      </div>

      <!-- INPUT CARD -->
      <div class="border border-blue-300 rounded-lg shadow-sm bg-white overflow-hidden">
        <div class="bg-blue-700 text-white font-bold px-4 py-2 text-sm uppercase flex justify-between items-center">
          <span>Bảng nhập 27 giải xổ số kiến thiết</span>
          <span id="kq-ngay-label" class="text-xs text-blue-200"></span>
        </div>
        <div class="overflow-x-auto p-2">
          <table class="w-full text-sm">
            <tbody id="kq-tbody">
              ${prizeRows}
            </tbody>
          </table>
        </div>
        <div class="flex justify-between items-center bg-gray-50 border-t p-3">
          <div class="text-xs text-gray-500">
            * Nhập đủ chữ số cho mỗi ô sẽ tự động nhảy sang ô tiếp theo.
          </div>
          <div class="flex gap-2">
            <button id="btn-xoa-kq" class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm font-semibold transition">
              🗑 Xóa hết
            </button>
            <button id="btn-luu-kq" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold shadow transition active:scale-95">
              💾 Lưu kết quả
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL NHẬP NHANH -->
      <div id="modal-nhap-nhanh" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 hidden">
        <div class="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden border border-gray-300">
          <div class="bg-blue-700 text-white px-4 py-2.5 font-bold flex justify-between items-center">
            <span>📋 Dán nhanh văn bản kết quả XSMB</span>
            <button id="btn-dong-modal-nhap-nhanh" class="text-white hover:text-gray-200 text-lg font-bold">✕</button>
          </div>
          <div class="p-4">
            <p class="text-xs text-gray-600 mb-2">
              Dán nội dung kết quả XSMB từ Zalo, tin nhắn SMS hoặc trang web bất kỳ. Hệ thống sẽ tự động lọc ra 27 số trúng:
            </p>
            <textarea
              id="txt-nhap-nhanh"
              rows="6"
              class="w-full p-2 border border-gray-300 rounded text-sm font-mono focus:border-blue-500 outline-none"
              placeholder="Ví dụ:&#10;ĐB: 63756&#10;G1: 21598&#10;G2: 46896 18939&#10;G3: 23759 99335 64570 82599 90728 03091&#10;G4: 0973 6330 5344 2733&#10;..."
            ></textarea>
          </div>
          <div class="bg-gray-50 px-4 py-2.5 border-t flex justify-end gap-2">
            <button id="btn-huy-nhap-nhanh" class="px-3 py-1.5 bg-gray-400 hover:bg-gray-500 text-white rounded text-sm font-semibold">Hủy</button>
            <button id="btn-ap-dung-nhap-nhanh" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold">Áp dụng vào bảng</button>
          </div>
        </div>
      </div>

      <div id="kq-preview" class="mt-4 hidden"></div>
    </div>
  `;
}

function collectValues() {
  const result = {};
  PRIZE_STRUCTURE.forEach((p) => {
    const inputs = [...document.querySelectorAll(`.kq-input[data-key="${p.key}"]`)];
    if (p.count === 1) {
      result[p.key] = inputs[0]?.value.trim() ?? '';
    } else {
      result[p.key] = inputs.map((el) => el.value.trim());
    }
  });
  return result;
}

function populateValues(data) {
  if (!data) return;
  PRIZE_STRUCTURE.forEach((p) => {
    const inputs = [...document.querySelectorAll(`.kq-input[data-key="${p.key}"]`)];
    if (p.count === 1) {
      if (inputs[0]) inputs[0].value = data[p.key] ?? '';
    } else {
      const arr = data[p.key] ?? [];
      inputs.forEach((el, i) => {
        el.value = arr[i] ?? '';
      });
    }
  });
}

function getAllInputs() {
  return [...document.querySelectorAll('.kq-input')];
}

function populateKySelect(kyList) {
  const sel = document.getElementById('kq-ky-select');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">-- Chọn từ danh sách kỳ --</option>';
  kyList.forEach((ky) => {
    const opt = document.createElement('option');
    opt.value = ky.id;
    opt.dataset.ngay = ky.ngay;
    opt.textContent = `${formatDate(ky.ngay)} — ${ky.trangThai || ky.status || ''}`;
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

function validate(data) {
  const errors = [];
  PRIZE_STRUCTURE.forEach((p) => {
    if (p.count === 1) {
      const val = data[p.key];
      if (!val || val.length !== p.digits) errors.push(p.label);
    } else {
      const arr = data[p.key] || [];
      arr.forEach((v, idx) => {
        if (!v || v.length !== p.digits) errors.push(`${p.label}[${idx + 1}]`);
      });
    }
  });
  return errors;
}

async function handleDateChange(newYMD) {
  const parts = extractDateParts(newYMD);
  _currentNgayYMD = parts.strYMD;
  sessionStorage.setItem('xskt_ngay', parts.strYMD);

  const datePicker = document.getElementById('kq-date-picker');
  if (datePicker && datePicker.value !== parts.strYMD) {
    datePicker.value = parts.strYMD;
  }

  // Tìm kỳ tương ứng trong danh sách
  const matchingKy = _kyList.find((k) => k.ngay === parts.strYMD || k.id === parts.yyyy + parts.mm + parts.dd);
  const sel = document.getElementById('kq-ky-select');
  if (matchingKy) {
    _currentKyId = matchingKy.id;
    if (sel) sel.value = matchingKy.id;
  } else {
    _currentKyId = parts.yyyy + parts.mm + parts.dd;
    if (sel) sel.value = '';
  }

  const lbl = document.getElementById('kq-ngay-label');
  if (lbl) {
    lbl.textContent = `Ngày: ${parts.strDisplay} ${matchingKy ? '' : '(Kỳ mới)'}`;
  }

  // Tải kết quả đã lưu (nếu có)
  const stop = showLoading(`Đang tải kết quả ngày ${parts.strDisplay}...`);
  try {
    const data = await getKetQuaByKy(_currentKyId);
    clearInputs();
    if (data && data.dacBiet) {
      populateValues(data);
    }
  } catch (err) {
    console.warn('getKetQuaByKy error:', err);
  } finally {
    stop?.();
  }
}

async function handleKySelectChange() {
  const sel = document.getElementById('kq-ky-select');
  const kyId = sel?.value;
  if (!kyId) return;

  const ky = _kyList.find((k) => k.id === kyId);
  if (ky && ky.ngay) {
    await handleDateChange(ky.ngay);
  }
}

function clearInputs() {
  document.querySelectorAll('.kq-input').forEach((el) => {
    el.value = '';
    el.classList.remove('border-red-500');
  });
  document.getElementById('kq-preview')?.classList.add('hidden');
}

async function handleSave() {
  const parts = extractDateParts(_currentNgayYMD || document.getElementById('kq-date-picker')?.value);
  _currentNgayYMD = parts.strYMD;
  const kyDocId = parts.yyyy + parts.mm + parts.dd;

  const data = collectValues();
  const errors = validate(data);
  if (errors.length) {
    showToast(`Còn ${errors.length} ô chưa nhập đủ số. Vui lòng kiểm tra các ô viền đỏ.`, 'warning');
    PRIZE_STRUCTURE.forEach((p) => {
      const inputs = [...document.querySelectorAll(`.kq-input[data-key="${p.key}"]`)];
      const values = p.count === 1 ? [data[p.key]] : data[p.key];
      values.forEach((v, i) => {
        inputs[i]?.classList.toggle('border-red-500', !v || v.length !== p.digits);
      });
    });
    return;
  }

  const stop = showLoading(`Đang lưu kết quả XSMB ngày ${parts.strDisplay}...`);
  try {
    // Tự động khởi tạo kỳ mở thưởng nếu chưa có
    const kyExists = _kyList.some((k) => k.id === kyDocId || k.ngay === parts.strYMD);
    if (!kyExists) {
      await createKyMoThuong(parts.strYMD).catch(() => {});
    }

    await saveKetQua(kyDocId, {
      ...data,
      ngay: parts.strYMD
    });

    showToast(`Đã lưu kết quả XSMB ngày ${parts.strDisplay} thành công!`, 'success');
  } catch (err) {
    showToast('Lỗi lưu kết quả: ' + err.message, 'danger');
  } finally {
    stop?.();
  }
}

export async function init() {
  const container = document.querySelector('.page-ketqua');
  container?.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' && e.key !== 'Enter') return;
    if (!e.target.classList.contains('kq-input')) return;
    const inputs = getAllInputs();
    const idx = inputs.indexOf(e.target);
    if (idx < 0) return;
    const next = inputs[idx + 1];
    if (next) {
      e.preventDefault();
      next.focus();
      next.select();
    }
  });

  container?.addEventListener('input', (e) => {
    if (!e.target.classList.contains('kq-input')) return;
    const el = e.target;
    el.value = el.value.replace(/\D/g, '').slice(0, Number(el.maxLength));
    el.classList.remove('border-red-500');
    if (el.value.length === Number(el.maxLength)) {
      const inputs = getAllInputs();
      const idx = inputs.indexOf(el);
      inputs[idx + 1]?.focus();
    }
  });

  document.getElementById('btn-lay-tu-dong')?.addEventListener('click', fetchKetQuaMinhNgoc);

  document.getElementById('btn-xoa-kq')?.addEventListener('click', () => {
    if (confirm('Xóa toàn bộ kết quả đang nhập trên màn hình?')) clearInputs();
  });

  document.getElementById('btn-luu-kq')?.addEventListener('click', handleSave);

  document.getElementById('kq-date-picker')?.addEventListener('change', (e) => {
    handleDateChange(e.target.value);
  });

  document.getElementById('kq-ky-select')?.addEventListener('change', handleKySelectChange);

  // Setup Modal Nhập nhanh
  const modal = document.getElementById('modal-nhap-nhanh');
  const txtNhapNhanh = document.getElementById('txt-nhap-nhanh');
  document.getElementById('btn-nhap-nhanh')?.addEventListener('click', () => {
    modal?.classList.remove('hidden');
    txtNhapNhanh?.focus();
  });
  document.getElementById('btn-dong-modal-nhap-nhanh')?.addEventListener('click', () => modal?.classList.add('hidden'));
  document.getElementById('btn-huy-nhap-nhanh')?.addEventListener('click', () => modal?.classList.add('hidden'));
  document.getElementById('btn-ap-dung-nhap-nhanh')?.addEventListener('click', () => {
    const text = txtNhapNhanh?.value || '';
    const parsed = parseRawTextPrizes(text);
    if (parsed && parsed.dacBiet) {
      populateValues(parsed);
      modal?.classList.add('hidden');
      showToast('Đã áp dụng kết quả từ văn bản!', 'success');
    } else {
      showToast('Không nhận diện được đủ các giải từ văn bản. Vui lòng kiểm tra lại.', 'warning');
    }
  });

  // Tải danh sách kỳ từ Firestore
  try {
    await getKyMoThuong((kyList) => {
      _kyList = kyList ?? [];
      populateKySelect(_kyList);

      if (!_currentNgayYMD) {
        const initialDate = sessionStorage.getItem('xskt_ngay') || (_kyList[0]?.ngay) || new Date().toISOString().slice(0, 10);
        handleDateChange(initialDate);
      }
    });
  } catch (err) {
    showToast('Lỗi tải danh sách kỳ: ' + err.message, 'danger');
  }
}

/**
 * Tự động lấy kết quả 27 giải XSMB từ xosominhngoc.net
 */
async function fetchKetQuaMinhNgoc() {
  const dateInput = document.getElementById('kq-date-picker')?.value || _currentNgayYMD;
  const parts = extractDateParts(dateInput);

  const stop = showLoading(`Đang lấy kết quả XSMB ngày ${parts.strDisplay} từ Minh Ngọc...`);

  try {
    const data = await loadMinhNgocByScript(parts.strMinhNgoc, parts.strDisplay);
    if (data && data.dacBiet) {
      populateValues(data);
      const msg = data.ngayFound
        ? `Đã tự động nạp 27 giải XSMB ngày ${data.ngayFound} từ Minh Ngọc! Nhấn "Lưu kết quả" để hoàn tất.`
        : `Đã tự động nạp 27 giải XSMB ngày ${parts.strDisplay} từ Minh Ngọc! Nhấn "Lưu kết quả" để hoàn tất.`;
      showToast(msg, 'success', 6000);
      return;
    }
    throw new Error('Chưa có kết quả hoặc dữ liệu trả về rỗng.');
  } catch (err) {
    console.warn('Lấy kết quả tự động gặp lỗi:', err);
    showToast(`Không lấy được kết quả tự động: ${err.message}. Bạn có thể nhập tay hoặc dùng nút "Dán nhanh".`, 'warning', 6000);
  } finally {
    stop?.();
  }
}

function loadMinhNgocByScript(strMinhNgoc, strDisplay) {
  return new Promise((resolve, reject) => {
    // 1. Khai báo biến toàn cục mà script Minh Ngọc yêu cầu
    window.bgcolor = '#ffffff';
    window.titlecolor = '#000000';
    window.dbcolor = '#c62828';
    window.kqwidth = '100%';
    window.fsize = '12px';

    // 2. Khởi tạo đối tượng giả lập jQuery $ an toàn tuyệt đối
    window.$ = function(selector) {
      const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
      return {
        html: function(val) { if (el && val !== undefined) el.innerHTML = val; return el ? el.innerHTML : ''; },
        append: function(val) { if (el && val) el.insertAdjacentHTML('beforeend', val); return this; },
        val: function() { return 'mien-bac'; },
        css: function() { return this; },
        height: function() { return 400; },
        width: function() { return 600; },
        hide: function() { if (el) el.style.display = 'none'; return this; },
        show: function() { if (el) el.style.display = ''; return this; },
        find: function(sub) { return window.$(el?.querySelector(sub)); },
        text: function() { return el?.textContent || ''; }
      };
    };

    // 3. Chuẩn bị hộp chứa ngầm
    let box = document.getElementById('box_kqxs_minhngoc');
    if (!box) {
      box = document.createElement('div');
      box.id = 'box_kqxs_minhngoc';
      box.style.display = 'none';
      document.body.appendChild(box);
    }
    box.innerHTML = '';

    // 4. Xóa script cũ
    const old = document.getElementById('script-minh-ngoc');
    if (old) old.remove();

    // 5. Nạp theo ngày chỉ định
    const script = document.createElement('script');
    script.id = 'script-minh-ngoc';
    const targetUrl = `https://www.minhngoc.com.vn/getkqxs/mien-bac/${strMinhNgoc}.js?_t=${Date.now()}`;
    script.src = targetUrl;

    const timeout = setTimeout(() => {
      script.remove();
      reject(new Error('Hết thời gian chờ kết nối máy chủ xổ số Minh Ngọc.'));
    }, 8000);

    const tryParseOrFallback = () => {
      const result = parseMinhNgocDom(box);
      if (result && result.dacBiet) {
        clearTimeout(timeout);
        resolve(result);
        return true;
      }
      return false;
    };

    script.onload = () => {
      setTimeout(() => {
        if (tryParseOrFallback()) return;

        // Nếu theo ngày chưa có, thử nạp kỳ mới nhất (mien-bac.js)
        const scriptLatest = document.createElement('script');
        scriptLatest.id = 'script-minh-ngoc-latest';
        scriptLatest.src = `https://www.minhngoc.com.vn/getkqxs/mien-bac.js?_t=${Date.now()}`;
        scriptLatest.onload = () => {
          setTimeout(() => {
            clearTimeout(timeout);
            const resLatest = parseMinhNgocDom(box);
            if (resLatest && resLatest.dacBiet) {
              resolve(resLatest);
            } else {
              reject(new Error('Chưa có kết quả mở thưởng trên Minh Ngọc.'));
            }
          }, 400);
        };
        scriptLatest.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Không tìm thấy kết quả mở thưởng trên Minh Ngọc.'));
        };
        document.body.appendChild(scriptLatest);
      }, 400);
    };

    script.onerror = () => {
      // Nếu load file theo ngày bị lỗi, thử kỳ mới nhất
      const scriptLatest = document.createElement('script');
      scriptLatest.src = `https://www.minhngoc.com.vn/getkqxs/mien-bac.js?_t=${Date.now()}`;
      scriptLatest.onload = () => {
        setTimeout(() => {
          clearTimeout(timeout);
          const resLatest = parseMinhNgocDom(box);
          if (resLatest && resLatest.dacBiet) {
            resolve(resLatest);
          } else {
            reject(new Error('Không thể lấy kết quả từ máy chủ Minh Ngọc.'));
          }
        }, 400);
      };
      scriptLatest.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Không kết nối được tới server Minh Ngọc.'));
      };
      document.body.appendChild(scriptLatest);
    };

    document.body.appendChild(script);
  });
}

function parseMinhNgocDom(container) {
  if (!container) return null;
  const extract = (cls) => {
    const el = container.querySelector(`.${cls}`);
    if (!el) return [];
    return el.textContent
      .replace(/\s+/g, ' ')
      .trim()
      .split(' - ')
      .map((s) => s.trim().replace(/\D/g, ''))
      .filter(Boolean);
  };

  const dacBiet = extract('giaidb')[0] || '';
  const giaiNhat = extract('giai1')[0] || '';
  const giaiNhi = extract('giai2');
  const giaiBA = extract('giai3');
  const giaiTu = extract('giai4');
  const giaiNam = extract('giai5');
  const giaiSau = extract('giai6');
  const giaiBay = extract('giai7');

  if (!dacBiet && !giaiNhat) return null;

  // Lấy ngày hiển thị trong HTML của Minh Ngọc nếu có
  const ngayEl = container.querySelector('.ngay');
  let ngayFound = null;
  if (ngayEl) {
    const m = ngayEl.textContent.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (m) ngayFound = m[1];
  }

  return {
    dacBiet,
    giaiNhat,
    giaiNhi,
    giaiBA,
    giaiTu,
    giaiNam,
    giaiSau,
    giaiBay,
    ngayFound
  };
}

/**
 * Trích xuất 27 giải xổ số kiến thiết từ văn bản bất kỳ
 */
function parseRawTextPrizes(text) {
  if (!text) return null;

  // Tìm tất cả các cụm số liên tiếp
  const numbers = text.match(/\b\d{2,5}\b/g) || [];
  if (numbers.length >= 27) {
    // Nếu có đúng 27 số hoặc nhiều hơn theo thứ tự truyền thống:
    // 1 ĐB (5 số), 1 G1 (5 số), 2 G2 (5 số), 6 G3 (5 số), 4 G4 (4 số), 6 G5 (4 số), 3 G6 (3 số), 4 G7 (2 số)
    return {
      dacBiet: numbers[0],
      giaiNhat: numbers[1],
      giaiNhi: [numbers[2], numbers[3]],
      giaiBA: numbers.slice(4, 10),
      giaiTu: numbers.slice(10, 14),
      giaiNam: numbers.slice(14, 20),
      giaiSau: numbers.slice(20, 23),
      giaiBay: numbers.slice(23, 27)
    };
  }

  // Khớp theo nhãn giải
  const findMatch = (regex) => {
    const m = text.match(regex);
    if (!m) return [];
    return m[1].trim().split(/[\s,-]+/).map(s => s.replace(/\D/g, '')).filter(Boolean);
  };

  const dacBiet = (text.match(/(?:Đặc Biệt|ĐB|GDB|DB)[:\s]+(\d{5})/i) || [])[1] || '';
  const giaiNhat = (text.match(/(?:Giải Nhất|G1|Giai 1)[:\s]+(\d{5})/i) || [])[1] || '';
  const giaiNhi = findMatch(/(?:Giải Nhì|G2|Giai 2)[:\s]+([\d\s,-]+)/i).slice(0, 2);
  const giaiBA = findMatch(/(?:Giải Ba|G3|Giai 3)[:\s]+([\d\s,-]+)/i).slice(0, 6);
  const giaiTu = findMatch(/(?:Giải Tư|G4|Giai 4)[:\s]+([\d\s,-]+)/i).slice(0, 4);
  const giaiNam = findMatch(/(?:Giải Năm|G5|Giai 5)[:\s]+([\d\s,-]+)/i).slice(0, 6);
  const giaiSau = findMatch(/(?:Giải Sáu|G6|Giai 6)[:\s]+([\d\s,-]+)/i).slice(0, 3);
  const giaiBay = findMatch(/(?:Giải Bảy|G7|Giai 7)[:\s]+([\d\s,-]+)/i).slice(0, 4);

  if (dacBiet) {
    return { dacBiet, giaiNhat, giaiNhi, giaiBA, giaiTu, giaiNam, giaiSau, giaiBay };
  }

  return null;
}
