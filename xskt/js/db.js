/**
 * db.js - Firestore CRUD Helper Module
 * XSKT Lô Tô Management System
 */

import { db } from './firebase-config.js';

import {
  collection,
  doc,
  getDoc      as fsGetDoc,
  getDocs     as fsGetDocs,
  addDoc      as fsAddDoc,
  setDoc,
  updateDoc   as fsUpdateDoc,
  deleteDoc   as fsDeleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// ---------------------------------------------------------------------------
// Collection name constants
// ---------------------------------------------------------------------------

export const COLLECTIONS = {
  USERS:          'users',
  DON_VI:         'donVi',
  DAI_LY:         'daiLy',
  TO_SO:          'toSo',
  KY_MO_THUONG:   'kyMoThuong',
  KET_QUA_XS:     'ketQuaXs',
  VE_LOTO:        'veLoTo',
  KET_QUA_THUONG: 'ketQuaThuong',
};

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/**
 * Get a single document by collection + id.
 *
 * @param {string} collectionName
 * @param {string} id
 * @returns {Promise<{id: string, [key: string]: any}|null>}
 */
export async function getDoc(collectionName, id) {
  const ref = doc(db, collectionName, id);
  const snap = await fsGetDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Get all documents from a collection, with optional query constraints.
 *
 * @param {string} collectionName
 * @param {...import('firebase/firestore').QueryConstraint} constraints
 * @returns {Promise<Array<{id: string, [key: string]: any}>>}
 */
export async function getDocs(collectionName, ...constraints) {
  const ref = collection(db, collectionName);
  const q = constraints.length ? query(ref, ...constraints) : ref;
  const snap = await fsGetDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Add a new document (auto-ID).
 *
 * @param {string} collectionName
 * @param {object} data
 * @returns {Promise<string>} The new document ID.
 */
export async function addDoc(collectionName, data) {
  const ref = collection(db, collectionName);
  const docRef = await fsAddDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update fields in an existing document (merge-safe).
 *
 * @param {string} collectionName
 * @param {string} id
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function updateDoc(collectionName, id, data) {
  const ref = doc(db, collectionName, id);
  await fsUpdateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a document.
 *
 * @param {string} collectionName
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteDoc(collectionName, id) {
  const ref = doc(db, collectionName, id);
  await fsDeleteDoc(ref);
}

/**
 * Build a Firestore query with where/orderBy constraints and return results.
 *
 * @param {string} collectionName
 * @param {Array<{field: string, op: string, value: any}>} [wheres=[]]
 * @param {Array<{field: string, dir?: 'asc'|'desc'}>} [orders=[]]
 * @returns {Promise<Array<{id: string, [key: string]: any}>>}
 */
export async function queryDocs(collectionName, wheres = [], orders = []) {
  const ref = collection(db, collectionName);
  const constraints = [
    ...wheres.map(w => where(w.field, w.op, w.value)),
    ...orders.map(o => orderBy(o.field, o.dir || 'asc')),
  ];
  const q = constraints.length ? query(ref, ...constraints) : ref;
  const snap = await fsGetDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---------------------------------------------------------------------------
// Domain-specific helpers
// ---------------------------------------------------------------------------

/**
 * Get all đơn vị (units).
 *
 * @returns {Promise<Array<{id: string, [key: string]: any}>>}
 */
export async function getDonViList() {
  return getDocs(COLLECTIONS.DON_VI, orderBy('ten', 'asc'));
}

/**
 * Get all đại lý (agents), optionally filtered by đơn vị ID.
 *
 * @param {string} [donViId]
 * @returns {Promise<Array<{id: string, [key: string]: any}>>}
 */
export async function getDaiLyList(donViId) {
  if (donViId) {
    return getDocs(
      COLLECTIONS.DAI_LY,
      where('donViId', '==', donViId),
      orderBy('ten', 'asc'),
    );
  }
  return getDocs(COLLECTIONS.DAI_LY, orderBy('ten', 'asc'));
}

/**
 * Tìm hoặc tạo mới đại lý theo Mã hoặc Tên, đồng thời khởi tạo bản ghi dữ liệu các loại hình vé trong CSDL
 *
 * @param {string} queryStr - Mã đại lý (VD: "550", "001") hoặc Tên
 * @param {string} [ngay] - Ngày mở thưởng (YYYY-MM-DD)
 * @returns {Promise<{id: string, ma: string, ten: string}>}
 */
export async function getOrCreateDaiLy(queryStr, ngay) {
  const qStr = String(queryStr).trim();
  if (!qStr) return null;

  // 1. Kiểm tra danh sách đại lý hiện có
  const all = await getDaiLyList();
  let dl = all.find(d => 
    (d.ma && d.ma.toLowerCase() === qStr.toLowerCase()) ||
    (d.ma && String(parseInt(d.ma, 10)) === String(parseInt(qStr, 10))) ||
    (d.id && d.id.toLowerCase() === qStr.toLowerCase()) ||
    (d.ten && d.ten.toLowerCase() === qStr.toLowerCase())
  );

  // 2. Nếu chưa có, tự động ghi mới đại lý này vào cơ sở dữ liệu
  if (!dl) {
    const newMa = qStr;
    const newTen = `Đại lý ${qStr}`;
    const newDocRef = await fsAddDoc(collection(db, COLLECTIONS.DAI_LY), {
      ma: newMa,
      ten: newTen,
      donViId: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    dl = {
      id: newDocRef.id,
      ma: newMa,
      ten: newTen
    };
  }

  // 3. Khởi tạo sẵn bản ghi cho tất cả các loại hình của đại lý trong CSDL nếu chưa có
  if (ngay && dl.id) {
    const ngayClean = ngay.replace(/-/g, '');

    // Loại hình Lô tô Đặc biệt (Tờ 1)
    const docIdDacBiet = `${ngayClean}_${dl.id}_to1_dacbiet`;
    const refDacBiet = doc(db, COLLECTIONS.VE_LOTO, docIdDacBiet);
    const snapDb = await fsGetDoc(refDacBiet);
    if (!snapDb.exists()) {
      await setDoc(refDacBiet, {
        id: docIdDacBiet,
        ngay,
        daiLyId: dl.id,
        daiLyTen: dl.ten,
        toSo: 1,
        loaiHinh: 'dac_biet',
        loTo5K: [],
        loTo10K: [],
        tongVe: 0,
        tongTien: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    // Loại hình Lô tô Cặp số, 3x23, 2x27
    const docIdCapSo = `${ngayClean}_${dl.id}_capso`;
    const refCapSo = doc(db, COLLECTIONS.VE_LOTO, docIdCapSo);
    const snapCap = await fsGetDoc(refCapSo);
    if (!snapCap.exists()) {
      await setDoc(refCapSo, {
        id: docIdCapSo,
        ngay,
        daiLyId: dl.id,
        daiLyTen: dl.ten,
        loaiHinh: 'cap_so',
        cap10k: [],
        cap20k: [],
        '3x23': [],
        '2x27': [],
        tongTien: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  }

  return dl;
}

// ---------------------------------------------------------------------------
// Kỳ Mở Thưởng helpers
// ---------------------------------------------------------------------------

/**
 * Convert a 'YYYY-MM-DD' string to the Firestore document ID used for that day.
 * Convention: we store kỳ mở thưởng using the date string as the document ID.
 *
 * @param {string} ngay - 'YYYY-MM-DD'
 * @returns {string}
 */
function ngayToId(ngay) {
  // Normalise: remove dashes → 'YYYYMMDD'
  return ngay.replace(/-/g, '');
}

/**
 * Get the kỳ mở thưởng session document for a given date, or listen to all sessions if a callback is provided.
 *
 * @param {string|((list: any[]) => void)} [arg] - 'YYYY-MM-DD' or callback fn
 * @returns {Promise<any>|(() => void)}
 */
export function getKyMoThuong(arg) {
  if (typeof arg === 'function') {
    // Return real-time listener unsubscriber
    const ref = collection(db, COLLECTIONS.KY_MO_THUONG);
    const q = query(ref, orderBy('ngay', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
        trangThai: docSnap.data().status === 'da_khoa' ? 'Đã khóa' : (docSnap.data().status === 'co_ket_qua' ? 'Đã có kết quả' : 'Đang nhập')
      }));
      arg(list);
    });
  }

  const ngay = arg || new Date().toISOString().slice(0, 10);
  return getDoc(COLLECTIONS.KY_MO_THUONG, ngayToId(ngay));
}

/**
 * Get all kỳ mở thưởng
 */
export async function getAllKyMoThuong() {
  return getDocs(COLLECTIONS.KY_MO_THUONG, orderBy('ngay', 'desc'));
}

/**
 * Create a new kỳ mở thưởng session for the given date.
 * Uses the date as the document ID to ensure uniqueness.
 *
 * @param {string} [ngay] - 'YYYY-MM-DD'
 * @returns {Promise<string>} Document ID
 */
export async function createKyMoThuong(ngay) {
  if (!ngay) {
    ngay = new Date().toISOString().slice(0, 10);
  }
  const id = ngayToId(ngay);
  const ref = doc(db, COLLECTIONS.KY_MO_THUONG, id);

  // Check for duplicate
  const existing = await fsGetDoc(ref);
  if (existing.exists()) {
    throw new Error(`Kỳ mở thưởng cho ngày ${ngay} đã tồn tại.`);
  }

  await setDoc(ref, {
    ngay,
    status:    'mo',     // 'mo' | 'da_khoa'
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return id;
}

/**
 * Lock (khóa) a kỳ mở thưởng session — sets status to 'da_khoa'.
 *
 * @param {string} ngayOrId - 'YYYY-MM-DD' or document ID
 * @returns {Promise<void>}
 */
export async function lockKyMoThuong(ngayOrId) {
  const id = ngayOrId.includes('-') ? ngayToId(ngayOrId) : ngayOrId;
  const ngay = ngayOrId.includes('-') ? ngayOrId : `${id.slice(0, 4)}-${id.slice(4, 6)}-${id.slice(6, 8)}`;
  const ref = doc(db, COLLECTIONS.KY_MO_THUONG, id);
  await setDoc(ref, {
    ngay,
    status:    'da_khoa',
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function unlockKyMoThuong(ngayOrId) {
  const id = ngayOrId.includes('-') ? ngayToId(ngayOrId) : ngayOrId;
  const ngay = ngayOrId.includes('-') ? ngayOrId : `${id.slice(0, 4)}-${id.slice(4, 6)}-${id.slice(6, 8)}`;
  const ref = doc(db, COLLECTIONS.KY_MO_THUONG, id);
  await setDoc(ref, {
    ngay,
    status:    'mo',
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ---------------------------------------------------------------------------
// Kết quả XS helpers (M4)
// ---------------------------------------------------------------------------

export async function saveKetQua(kyId, data) {
  const ref = doc(db, COLLECTIONS.KET_QUA_XS, kyId);
  await setDoc(ref, {
    kyId,
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // Update status in kyMoThuong if exists
  const kyRef = doc(db, COLLECTIONS.KY_MO_THUONG, kyId);
  await fsUpdateDoc(kyRef, {
    status: 'co_ket_qua',
    updatedAt: serverTimestamp(),
  }).catch(() => {});
}

export async function getKetQuaByKy(kyId) {
  return getDoc(COLLECTIONS.KET_QUA_XS, kyId);
}

// ---------------------------------------------------------------------------
// Vé Lô Tô helpers
// ---------------------------------------------------------------------------

/**
 * Save (create or overwrite) a vé lô tô document.
 * If `data.id` is provided the document is overwritten; otherwise a new one is created.
 *
 * @param {{ id?: string, ngay: string, daiLyId: string, [key: string]: any }} data
 * @returns {Promise<string>} Document ID
 */
export async function saveVeLoTo(data) {
  const { id, ...payload } = data;

  if (id) {
    // Overwrite existing document
    const ref = doc(db, COLLECTIONS.VE_LOTO, id);
    await setDoc(ref, {
      ...payload,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return id;
  }

  // Create new document
  const ref = collection(db, COLLECTIONS.VE_LOTO);
  const docRef = await fsAddDoc(ref, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get all vé lô tô for a given date and đại lý.
 *
 * @param {string} ngay     - 'YYYY-MM-DD'
 * @param {string} daiLyId
 * @returns {Promise<Array<{id: string, [key: string]: any}>>}
 */
export async function getVeLoToByNgayDaiLy(ngay, daiLyId, daiLyMa = '') {
  if (!daiLyId && !daiLyMa) return [];
  const list = await getDocs(COLLECTIONS.VE_LOTO);
  return list
    .filter(d => {
      const matchNgay = !ngay || d.ngay === ngay;
      const matchDl = (daiLyId && d.daiLyId === daiLyId) ||
                      (daiLyMa && d.daiLyId === daiLyMa) ||
                      (daiLyId && d.daiLyMa === daiLyId) ||
                      (daiLyMa && d.daiLyMa === daiLyMa);
      return matchNgay && matchDl;
    })
    .sort((a, b) => (a.toSo || 1) - (b.toSo || 1));
}

/**
 * Get all vé lô tô for a given date across all agents.
 *
 * @param {string} ngay - 'YYYY-MM-DD'
 * @returns {Promise<Array<{id: string, [key: string]: any}>>}
 */
export async function getVeLoToByNgay(ngay) {
  const list = await getDocs(COLLECTIONS.VE_LOTO);
  return list.filter(d => !ngay || d.ngay === ngay);
}

