/**
 * tinh-thuong.js - Engine Tính Toán Trúng Thưởng (M6)
 * Theo đúng cơ cấu giải thưởng Quyết định 01/01/2026 của XSKT Nam Định
 */

/**
 * Tính thưởng cho vé Lô tô Đơn (So giải Đặc Biệt)
 * @param {Array<{sdt: string, sl: number}>} items 
 * @param {number} menhGia - 5000 | 10000 | 20000
 * @param {string} dacBietFull - 5 chữ số GĐB (VD: "63756")
 */
export function tinhThuongLoToDon(items, menhGia, dacBietFull) {
  if (!dacBietFull || dacBietFull.length < 5) return { details: [], tongThuong: 0 };

  const db2 = dacBietFull.slice(-2);
  const db3 = dacBietFull.slice(-3);
  const db4 = dacBietFull.slice(-4);

  let tongThuong = 0;
  const details = [];

  items.forEach(item => {
    const sdt = String(item.sdt).trim();
    const sl = Number(item.sl) || 1;
    let heSo = 0;
    let loaiGiai = '';

    if (sdt.length === 2) {
      if (sdt === db2) {
        heSo = 60;
        loaiGiai = 'Trúng 2 số G.ĐB (60x)';
      }
    } else if (sdt.length === 3) {
      if (sdt === db3) {
        heSo = 400;
        loaiGiai = 'Trúng 3 số G.ĐB (400x)';
      } else if (sdt.slice(-2) === db2) {
        heSo = 5;
        loaiGiai = 'Khuyến khích 2 số G.ĐB (5x)';
      }
    } else if (sdt.length === 4) {
      if (sdt === db4) {
        heSo = 1500;
        loaiGiai = 'Trúng 4 số G.ĐB (1500x)';
      } else if (sdt.slice(-3) === db3) {
        heSo = 10;
        loaiGiai = 'Khuyến khích 3 số G.ĐB (10x)';
      } else if (sdt.slice(-2) === db2) {
        heSo = 5;
        loaiGiai = 'Khuyến khích 2 số G.ĐB (5x)';
      }
    }

    if (heSo > 0) {
      const tien = sl * menhGia * heSo;
      tongThuong += tien;
      details.push({
        sdt,
        sl,
        menhGia,
        heSo,
        loaiGiai,
        tienThuong: tien
      });
    }
  });

  return { details, tongThuong };
}

/**
 * Trích xuất toàn bộ 2 số cuối và 3 số cuối từ 27 giải XSMB
 */
export function trichXuatSoDuoi(ketQua) {
  const ds2So = [];
  const ds3So23Giai = [];

  if (!ketQua) return { ds2So, ds3So23Giai };

  const pushNum = (val, is3SoValid) => {
    if (!val) return;
    const str = String(val).trim();
    if (str.length >= 2) {
      ds2So.push(str.slice(-2));
    }
    if (is3SoValid && str.length >= 3) {
      ds3So23Giai.push(str.slice(-3));
    }
  };

  // 1. Đặc biệt (1 giải)
  pushNum(ketQua.dacBiet, true);
  // 2. Nhất (1 giải)
  pushNum(ketQua.giaiNhat, true);
  // 3. Nhì (2 giải)
  (ketQua.giaiNhi || []).forEach(v => pushNum(v, true));
  // 4. Ba (6 giải)
  (ketQua.giaiBA || []).forEach(v => pushNum(v, true));
  // 5. Tư (4 giải)
  (ketQua.giaiTu || []).forEach(v => pushNum(v, true));
  // 6. Năm (6 giải)
  (ketQua.giaiNam || []).forEach(v => pushNum(v, true));
  // 7. Sáu (3 giải) -> Hết giải sáu là 23 giải!
  (ketQua.giaiSau || []).forEach(v => pushNum(v, true));
  // 8. Bảy (4 giải) -> Chỉ lấy 2 số cho 27 giải
  (ketQua.giaiBay || []).forEach(v => pushNum(v, false));

  return { ds2So, ds3So23Giai };
}

/**
 * Tính thưởng cho vé 2/27 (2 số so với 27 giải)
 */
export function tinhThuong2_27(items, menhGia, ds2So) {
  let tongThuong = 0;
  const details = [];

  items.forEach(item => {
    const sdt = String(item.sdt).trim().padStart(2, '0');
    const sl = Number(item.sl) || 1;
    // Đếm số lần về
    const count = ds2So.filter(x => x === sdt).length;

    let heSo = 0;
    if (count === 1) heSo = 2.25;
    else if (count >= 2) heSo = 4.5;

    if (heSo > 0) {
      const tien = sl * menhGia * heSo;
      tongThuong += tien;
      details.push({
        sdt,
        sl,
        count,
        heSo,
        tienThuong: tien
      });
    }
  });

  return { details, tongThuong };
}

/**
 * Tính thưởng cho vé 3/23 (3 số so với 23 giải)
 */
export function tinhThuong3_23(items, menhGia, ds3So23Giai) {
  let tongThuong = 0;
  const details = [];

  items.forEach(item => {
    const sdt = String(item.sdt).trim().padStart(3, '0');
    const sl = Number(item.sl) || 1;
    const count = ds3So23Giai.filter(x => x === sdt).length;

    let heSo = 0;
    if (count === 1) heSo = 20;
    else if (count === 2) heSo = 60;
    else if (count >= 3) heSo = 150;

    if (heSo > 0) {
      const tien = sl * menhGia * heSo;
      tongThuong += tien;
      details.push({
        sdt,
        sl,
        count,
        heSo,
        tienThuong: tien
      });
    }
  });

  return { details, tongThuong };
}

/**
 * Tính thưởng Lô tô Cặp số (2 cặp, 3 cặp, 4 cặp)
 */
export function tinhThuongCapSo(items, menhGia, ds2So) {
  let tongThuong = 0;
  const details = [];

  items.forEach(item => {
    const sl = Number(item.sl) || 1;
    const raw = String(item.sdt || '').trim();
    // Parse các cặp số cách nhau bằng dấu cách hoặc phẩy
    const caps = raw.split(/[\s,]+/).filter(x => x.length === 2);
    if (caps.length < 2) return;

    // Đếm số cặp về
    const trungCaps = caps.filter(c => ds2So.includes(c));
    const soCapTrung = trungCaps.length;
    let heSo = 0;
    let loaiGiai = '';

    if (caps.length === 2) {
      if (soCapTrung === 2) {
        // Kiểm tra xem có cặp nào về từ 2 lần trở lên không
        const count1 = ds2So.filter(x => x === caps[0]).length;
        const count2 = ds2So.filter(x => x === caps[1]).length;
        if (count1 >= 2 || count2 >= 2) {
          heSo = 15;
          loaiGiai = 'Trúng 2 cặp và có cặp trùng >= 2 lần (15x)';
        } else {
          heSo = 10;
          loaiGiai = 'Trúng cả 2 cặp (10x)';
        }
      }
    } else if (caps.length === 3) {
      if (soCapTrung === 3) {
        heSo = 42;
        loaiGiai = 'Trúng cả 3 cặp (42x)';
      } else if (soCapTrung === 2) {
        heSo = 1;
        loaiGiai = 'Khuyến khích trúng 2/3 cặp (1x)';
      }
    } else if (caps.length >= 4) {
      if (soCapTrung >= 4) {
        heSo = 130;
        loaiGiai = 'Trúng cả 4 cặp (130x)';
      } else if (soCapTrung === 3) {
        heSo = 2;
        loaiGiai = 'Khuyến khích trúng 3/4 cặp (2x)';
      }
    }

    if (heSo > 0) {
      const tien = sl * menhGia * heSo;
      tongThuong += tien;
      details.push({
        sdt: raw,
        sl,
        trungCaps,
        heSo,
        loaiGiai,
        tienThuong: tien
      });
    }
  });

  return { details, tongThuong };
}
