import { 
  Pegawai, 
  PermintaanIzin, 
  StatusKehadiranHarian, 
  MainCategory, 
  SubCategory,
  PengajuanLupaAbsen,
  JenisLupaAbsen,
  LupaAbsenSettings
} from '../types/attendance';
import { INITIAL_PEGAWAI, INITIAL_IZIN, INITIAL_LUPA_ABSEN, INFO_SEKOLAH } from '../data/mockData';
import { getJakartaTodayISO, getJakartaTimestamp } from './dateJakarta';

const STORAGE_KEYS = {
  PEGAWAI: 'smkn1_tegalsari_pegawai',
  IZIN: 'smkn1_tegalsari_izin',
  OVERRIDES: 'smkn1_tegalsari_overrides',
  CURRENT_USER: 'smkn1_tegalsari_current_user',
  PASSWORDS: 'smkn1_tegalsari_passwords', // Mapping NIP -> password
  LUPA_ABSEN: 'smkn1_tegalsari_lupa_absen',
  LUPA_ABSEN_SETTINGS: 'smkn1_tegalsari_lupa_absen_settings',
};

// Inisialisasi data pegawai
export const getStoredPegawai = (): Pegawai[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PEGAWAI);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PEGAWAI, JSON.stringify(INITIAL_PEGAWAI));
      return INITIAL_PEGAWAI;
    }
    const parsed: Pegawai[] = JSON.parse(raw);
    // Ensure roles & default Kepala Sekolah profile are synced
    let hasChanges = false;
    const updated = parsed.map(p => {
      if (p.id === 'peg-02' && (p.role !== 'pimpinan' || p.nama === 'Gatot Koco')) {
        hasChanges = true;
        return {
          ...p,
          nip: INFO_SEKOLAH.nipKepalaSekolah,
          nama: 'Candra Suro Laksono',
          gelarDepan: '',
          gelarBelakang: 'S.Pi',
          pangkatGolongan: 'Penata Tk. I / III/d',
          role: 'pimpinan' as const,
        };
      }
      if (p.id === 'peg-03' && p.role !== 'pimpinan') {
        hasChanges = true;
        return { ...p, role: 'pimpinan' as const };
      }
      return p;
    });
    if (hasChanges) {
      localStorage.setItem(STORAGE_KEYS.PEGAWAI, JSON.stringify(updated));
      return updated;
    }
    return parsed;
  } catch (e) {
    console.error('Error reading pegawai from localStorage', e);
    return INITIAL_PEGAWAI;
  }
};

export const savePegawaiList = (list: Pegawai[]): void => {
  localStorage.setItem(STORAGE_KEYS.PEGAWAI, JSON.stringify(list));
};

// Buat akun baru khusus untuk Admin, Pimpinan, atau Guru/Pegawai
export const registerAccount = (data: {
  nip: string;
  nama: string;
  gelarDepan?: string;
  gelarBelakang?: string;
  jabatan: string;
  unitKerja?: string;
  tipe?: 'guru' | 'pegawai';
  pangkatGolongan?: string;
  email?: string;
  noHp?: string;
  jenisKelamin?: 'L' | 'P';
  role: 'admin' | 'pimpinan' | 'guru' | 'pegawai';
  password?: string;
}): Pegawai => {
  const currentList = getStoredPegawai();
  const cleanedNip = data.nip.trim().replace(/\s+/g, '');
  
  // Cek apakah NIP sudah ada
  const existingIdx = currentList.findIndex(p => p.nip.replace(/\s+/g, '') === cleanedNip);

  const newPegawai: Pegawai = {
    id: existingIdx >= 0 ? currentList[existingIdx].id : `peg-${Date.now()}`,
    nip: cleanedNip,
    nama: data.nama.trim(),
    gelarDepan: data.gelarDepan?.trim() || undefined,
    gelarBelakang: data.gelarBelakang?.trim() || undefined,
    jabatan: data.jabatan.trim(),
    unitKerja: data.unitKerja?.trim() || (data.role === 'pimpinan' ? 'Pimpinan Sekolah' : 'SMKN 1 Tegalsari'),
    tipe: data.tipe || (data.role === 'pimpinan' ? 'guru' : 'pegawai'),
    pangkatGolongan: data.pangkatGolongan?.trim() || 'Pembina / IV/a',
    email: data.email?.trim() || `${cleanedNip}@smkn1tegalsari.sch.id`,
    noHp: data.noHp?.trim() || '081234567890',
    jenisKelamin: data.jenisKelamin || 'L',
    role: data.role,
    statusAktif: true,
  };

  if (existingIdx >= 0) {
    currentList[existingIdx] = newPegawai;
  } else {
    currentList.push(newPegawai);
  }

  savePegawaiList(currentList);

  // Simpan password khusus jika diberikan, default = NIP
  if (data.password && data.password.trim()) {
    changeUserPassword(cleanedNip, data.password.trim());
  } else {
    changeUserPassword(cleanedNip, cleanedNip);
  }

  return newPegawai;
};

export const updatePegawaiRole = (pegawaiId: string, newRole: 'admin' | 'pimpinan' | 'guru' | 'pegawai'): void => {
  const list = getStoredPegawai();
  const updated = list.map(p => {
    if (p.id === pegawaiId) {
      return { ...p, role: newRole };
    }
    return p;
  });
  savePegawaiList(updated);

  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === pegawaiId) {
    saveCurrentUser({ ...currentUser, role: newRole });
  }
};

// Inisialisasi daftar izin
export const getStoredIzin = (): PermintaanIzin[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.IZIN);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.IZIN, JSON.stringify(INITIAL_IZIN));
      return INITIAL_IZIN;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading izin from localStorage', e);
    return INITIAL_IZIN;
  }
};

export const saveIzinList = (list: PermintaanIzin[]): void => {
  localStorage.setItem(STORAGE_KEYS.IZIN, JSON.stringify(list));
};

// Custom Daily Overrides (e.g., admin/pimpinan marks someone manually as alpa / tidak hadir)
export interface ManualOverride {
  id: string;
  tanggal: string; // YYYY-MM-DD
  pegawaiId: string;
  status: MainCategory;
  subKategori: SubCategory;
  alasan?: string;
  catatan?: string;
}

export const getStoredOverrides = (): ManualOverride[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OVERRIDES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

export const saveOverride = (override: ManualOverride): void => {
  const current = getStoredOverrides();
  const existingIdx = current.findIndex(
    o => o.tanggal === override.tanggal && o.pegawaiId === override.pegawaiId
  );
  if (existingIdx >= 0) {
    current[existingIdx] = override;
  } else {
    current.push(override);
  }
  localStorage.setItem(STORAGE_KEYS.OVERRIDES, JSON.stringify(current));
};

export const removeOverride = (tanggal: string, pegawaiId: string): void => {
  const current = getStoredOverrides();
  const filtered = current.filter(
    o => !(o.tanggal === tanggal && o.pegawaiId === pegawaiId)
  );
  localStorage.setItem(STORAGE_KEYS.OVERRIDES, JSON.stringify(filtered));
};

// Hitung status kehadiran untuk tanggal tertentu
// Aturan:
// 1. Setiap harinya guru dan pegawai terjadwal masuk/hadir secara otomatis.
// 2. Pengajuan izin dari guru/pegawai harus diverifikasi & disetujui Admin/Pimpinan terlebih dahulu.
// 3. Setelah izin berstatus 'disetujui', status kehadiran otomatis berubah sesuai jenis izin.
export const getDailyAttendanceForDate = (dateStr: string): StatusKehadiranHarian[] => {
  const pegawais = getStoredPegawai();
  const izins = getStoredIzin();
  const overrides = getStoredOverrides();

  const results: StatusKehadiranHarian[] = [];

  for (const p of pegawais) {
    if (!p.statusAktif) continue;

    // 1. Cek apakah ada manual override dari Admin / Pimpinan
    const override = overrides.find(o => o.tanggal === dateStr && o.pegawaiId === p.id);
    if (override) {
      results.push({
        pegawaiId: p.id,
        tanggal: dateStr,
        status: override.status,
        subKategori: override.subKategori,
        alasan: override.alasan,
        isOtomatis: false,
        catatan: override.catatan || 'Diatur manual oleh Admin SDM / Pimpinan',
      });
      continue;
    }

    // 2. Cek apakah ada Izin/Dinas/Cuti/Diklat yang SUDAH DISETUJUI pada rentang tanggal ini
    const activeIzin = izins.find(iz => {
      if (iz.pegawaiId !== p.id) return false;
      if (iz.status !== 'disetujui') return false;
      return dateStr >= iz.tanggalMulai && dateStr <= iz.tanggalSelesai;
    });

    if (activeIzin) {
      results.push({
        pegawaiId: p.id,
        tanggal: dateStr,
        status: activeIzin.kategori,
        subKategori: activeIzin.subKategori,
        alasan: activeIzin.alasan,
        izinId: activeIzin.id,
        lampiranNama: activeIzin.berkasNama,
        lampiranUrl: activeIzin.berkasUrl,
        isOtomatis: false,
        catatan: activeIzin.diverifikasiOleh
          ? `Disetujui oleh ${activeIzin.diverifikasiOleh}`
          : `Surat/Izin: ${activeIzin.subKategori}`,
      });
      continue;
    }

    // 3. Cek apakah ada izin yang masih menunggu verifikasi (hanya untuk catatan info)
    const pendingIzin = izins.find(iz => {
      if (iz.pegawaiId !== p.id) return false;
      if (iz.status !== 'menunggu') return false;
      return dateStr >= iz.tanggalMulai && dateStr <= iz.tanggalSelesai;
    });

    // 4. DEFAULT: Terjadwal Hadir Otomatis!
    results.push({
      pegawaiId: p.id,
      tanggal: dateStr,
      status: 'hadir',
      subKategori: 'Terjadwal Masuk',
      alasan: 'Terjadwal otomatis masuk kerja di SMKN 1 Tegalsari',
      isOtomatis: true,
      catatan: pendingIzin
        ? `Ada pengajuan ${pendingIzin.subKategori} (Menunggu Verifikasi)`
        : 'Hadir Terjadwal Otomatis',
    });
  }

  return results;
};

// Tambah pengajuan izin baru
export const submitPermintaanIzin = (izin: Omit<PermintaanIzin, 'id' | 'tanggalPengajuan'>): PermintaanIzin => {
  const current = getStoredIzin();
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);

  const newIzin: PermintaanIzin = {
    ...izin,
    id: `izin-${Date.now()}`,
    tanggalPengajuan: `${dateStr} ${timeStr}`,
    status: izin.status || 'menunggu',
  };

  const updated = [newIzin, ...current];
  saveIzinList(updated);
  return newIzin;
};

// Update status izin (verifikasi oleh Admin atau Pimpinan)
export const updateStatusIzin = (
  izinId: string, 
  status: 'disetujui' | 'menunggu' | 'ditolak',
  catatanAdmin?: string,
  verifikator?: string
): void => {
  const current = getStoredIzin();
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);

  const updated = current.map(item => {
    if (item.id === izinId) {
      return {
        ...item,
        status,
        catatanAdmin: catatanAdmin !== undefined ? catatanAdmin : item.catatanAdmin,
        diverifikasiOleh: verifikator || item.diverifikasiOleh,
        tanggalVerifikasi: status !== 'menunggu' ? `${dateStr} ${timeStr}` : undefined,
      };
    }
    return item;
  });
  saveIzinList(updated);
};

// Hapus izin
export const deleteIzin = (izinId: string): void => {
  const current = getStoredIzin();
  const filtered = current.filter(item => item.id !== izinId);
  saveIzinList(filtered);
};

// Autentikasi: Login menggunakan NIP dan Password NIP
export const authenticateUser = (nip: string, passwordInput: string): Pegawai | null => {
  const pegawais = getStoredPegawai();
  const cleanedNip = nip.trim().replace(/\s+/g, '');
  
  const user = pegawais.find(p => p.nip.replace(/\s+/g, '') === cleanedNip);
  if (!user) return null;

  // Cek custom password jika pernah diganti, default = NIP itu sendiri
  let storedPasswords: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PASSWORDS);
    if (raw) storedPasswords = JSON.parse(raw);
  } catch (e) {
    storedPasswords = {};
  }

  const expectedPassword = storedPasswords[cleanedNip] || cleanedNip;
  const cleanedPassword = passwordInput.trim().replace(/\s+/g, '');

  if (cleanedPassword === expectedPassword || cleanedPassword === cleanedNip) {
    saveCurrentUser(user);
    return user;
  }

  return null;
};

export const getCurrentUser = (): Pegawai | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) {
      // Default: login as Admin SDM initially so all features are immediately testable
      const admin = INITIAL_PEGAWAI[0];
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(admin));
      return admin;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_PEGAWAI[0];
  }
};

export const saveCurrentUser = (user: Pegawai | null): void => {
  if (!user) {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  } else {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  }
};

export const changeUserPassword = (nip: string, newPass: string): void => {
  const cleanedNip = nip.trim().replace(/\s+/g, '');
  let stored: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PASSWORDS);
    if (raw) stored = JSON.parse(raw);
  } catch (e) {
    stored = {};
  }
  stored[cleanedNip] = newPass.trim();
  localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(stored));
};

// Reset database ke default jika diinginkan pengguna
export const resetToDefaultData = (): void => {
  localStorage.setItem(STORAGE_KEYS.PEGAWAI, JSON.stringify(INITIAL_PEGAWAI));
  localStorage.setItem(STORAGE_KEYS.IZIN, JSON.stringify(INITIAL_IZIN));
  localStorage.setItem(STORAGE_KEYS.LUPA_ABSEN, JSON.stringify(INITIAL_LUPA_ABSEN));
  localStorage.removeItem(STORAGE_KEYS.OVERRIDES);
  localStorage.removeItem(STORAGE_KEYS.PASSWORDS);
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_PEGAWAI[0]));
};

// ==========================================
// FITUR LUPA ABSEN - STORAGE & KEAMANAN
// ==========================================

export const getStoredLupaAbsen = (): PengajuanLupaAbsen[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LUPA_ABSEN);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.LUPA_ABSEN, JSON.stringify(INITIAL_LUPA_ABSEN));
      return INITIAL_LUPA_ABSEN;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading lupa absen from localStorage', e);
    return INITIAL_LUPA_ABSEN;
  }
};

export const saveLupaAbsenList = (list: PengajuanLupaAbsen[]): void => {
  localStorage.setItem(STORAGE_KEYS.LUPA_ABSEN, JSON.stringify(list));
};

/**
 * Cek pengajuan ganda pada tanggal kejadian yang sama untuk guru/pegawai yang sama.
 * Mengizinkan tanggal berbeda atau mengajukan ulang jika pengajuan sebelumnya berstatus 'ditolak'.
 */
export const findDuplicateLupaAbsen = (
  pegawaiId: string,
  tanggalKejadian: string,
  jenisPresensi: JenisLupaAbsen,
  excludeId?: string
): PengajuanLupaAbsen | undefined => {
  const list = getStoredLupaAbsen();
  return list.find(item => {
    if (excludeId && item.id === excludeId) return false;
    if (item.pegawaiId !== pegawaiId) return false;
    if (item.tanggalKejadian !== tanggalKejadian) return false;
    if (item.status === 'ditolak') return false;

    // Jenis sama persis atau salah satunya mencakup masuk & pulang
    if (
      item.jenisPresensi === jenisPresensi ||
      item.jenisPresensi === 'masuk_dan_pulang' ||
      jenisPresensi === 'masuk_dan_pulang'
    ) {
      return true;
    }
    return false;
  });
};

export const upsertPengajuanLupaAbsen = (
  payload: {
    id?: string;
    pegawaiId: string;
    tanggalKejadian: string;
    jenisPresensi: JenisLupaAbsen;
    jamKejadian?: string;
    kronologi: string;
    pernyataanKebenaran: boolean;
    status: 'draft' | 'menunggu_persetujuan';
  }
): PengajuanLupaAbsen => {
  const current = getStoredLupaAbsen();
  const nowDate = getJakartaTodayISO();
  const nowTimestamp = getJakartaTimestamp();

  if (payload.id) {
    const existing = current.find(item => item.id === payload.id);
    if (existing) {
      if (existing.pegawaiId !== payload.pegawaiId) {
        throw new Error('Akses ditolak: Anda hanya dapat mengubah pengajuan milik Anda sendiri.');
      }
      if (existing.status !== 'draft') {
        throw new Error('Hanya pengajuan berstatus Draft yang dapat diubah.');
      }
      const updatedItem: PengajuanLupaAbsen = {
        ...existing,
        tanggalKejadian: payload.tanggalKejadian,
        jenisPresensi: payload.jenisPresensi,
        jamKejadian: payload.jamKejadian?.trim() || undefined,
        kronologi: payload.kronologi.trim(),
        pernyataanKebenaran: payload.pernyataanKebenaran,
        status: payload.status,
        tanggalPengajuan: payload.status === 'menunggu_persetujuan' ? nowDate : existing.tanggalPengajuan,
        waktuPengajuan: payload.status === 'menunggu_persetujuan' ? nowTimestamp : existing.waktuPengajuan,
        updatedAt: nowTimestamp,
      };
      const updatedList = current.map(item => (item.id === payload.id ? updatedItem : item));
      saveLupaAbsenList(updatedList);
      return updatedItem;
    }
  }

  const newItem: PengajuanLupaAbsen = {
    id: `lupa-${Date.now()}`,
    pegawaiId: payload.pegawaiId,
    tanggalKejadian: payload.tanggalKejadian,
    jenisPresensi: payload.jenisPresensi,
    jamKejadian: payload.jamKejadian?.trim() || undefined,
    kronologi: payload.kronologi.trim(),
    pernyataanKebenaran: payload.pernyataanKebenaran,
    status: payload.status,
    tanggalPengajuan: nowDate,
    waktuPengajuan: nowTimestamp,
    updatedAt: nowTimestamp,
  };

  saveLupaAbsenList([newItem, ...current]);
  return newItem;
};

export const updateStatusLupaAbsen = (
  id: string,
  status: 'disetujui' | 'ditolak',
  admin: Pegawai,
  catatanAdmin?: string
): PengajuanLupaAbsen | null => {
  if (admin.role !== 'admin' && admin.role !== 'pimpinan') {
    throw new Error('Akses ditolak: Hanya Admin atau Pimpinan yang dapat memproses pengajuan.');
  }
  const current = getStoredLupaAbsen();
  const nowTimestamp = getJakartaTimestamp();
  const adminFullName = `${admin.gelarDepan ? admin.gelarDepan + ' ' : ''}${admin.nama}${admin.gelarBelakang ? ', ' + admin.gelarBelakang : ''}`;

  let updatedRecord: PengajuanLupaAbsen | null = null;
  const updated = current.map(item => {
    if (item.id === id) {
      updatedRecord = {
        ...item,
        status,
        catatanAdmin: catatanAdmin?.trim() || undefined,
        diprosesOlehId: admin.id,
        diprosesOlehNama: adminFullName,
        diprosesOlehJabatan: admin.jabatan,
        waktuPersetujuan: nowTimestamp,
        updatedAt: nowTimestamp,
      };
      return updatedRecord;
    }
    return item;
  });

  saveLupaAbsenList(updated);
  return updatedRecord;
};

export const deleteLupaAbsenDraft = (id: string, requester: Pegawai): void => {
  const current = getStoredLupaAbsen();
  const target = current.find(item => item.id === id);
  if (!target) return;
  if (target.pegawaiId !== requester.id && requester.role !== 'admin') {
    throw new Error('Akses ditolak: Anda hanya boleh menghapus pengajuan milik sendiri.');
  }
  if (target.status !== 'draft' && requester.role !== 'admin') {
    throw new Error('Hanya draft yang dapat dihapus.');
  }
  saveLupaAbsenList(current.filter(item => item.id !== id));
};

export const getLupaAbsenSettings = (): LupaAbsenSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LUPA_ABSEN_SETTINGS);
    if (!raw) {
      return {
        namaKepalaSekolah: INFO_SEKOLAH.kepalaSekolah,
        pangkatKepalaSekolah: INFO_SEKOLAH.pangkatKepalaSekolah,
        nipKepalaSekolah: INFO_SEKOLAH.nipKepalaSekolah,
        namaKoordinatorSdm: INFO_SEKOLAH.koordinatorSdm,
        nipKoordinatorSdm: INFO_SEKOLAH.nipKoordinatorSdm,
      };
    }
    const parsed = JSON.parse(raw) as LupaAbsenSettings;
    const rawNama = (parsed.namaKepalaSekolah || '').trim();
    const isLegacyKepsek = !rawNama || rawNama.toLowerCase().includes('gatot');
    return {
      namaKepalaSekolah: isLegacyKepsek ? INFO_SEKOLAH.kepalaSekolah : rawNama,
      pangkatKepalaSekolah: isLegacyKepsek
        ? INFO_SEKOLAH.pangkatKepalaSekolah
        : parsed.pangkatKepalaSekolah || INFO_SEKOLAH.pangkatKepalaSekolah,
      nipKepalaSekolah: isLegacyKepsek
        ? INFO_SEKOLAH.nipKepalaSekolah
        : parsed.nipKepalaSekolah || INFO_SEKOLAH.nipKepalaSekolah,
      namaKoordinatorSdm: parsed.namaKoordinatorSdm?.trim() || INFO_SEKOLAH.koordinatorSdm,
      nipKoordinatorSdm: parsed.nipKoordinatorSdm?.trim() || INFO_SEKOLAH.nipKoordinatorSdm,
      logoJatimCustomUrl: parsed.logoJatimCustomUrl || undefined,
      logoSekolahCustomUrl: parsed.logoSekolahCustomUrl || undefined,
      ttdKepsekCustomUrl: parsed.ttdKepsekCustomUrl || undefined,
      ttdKoordinatorSdmCustomUrl: parsed.ttdKoordinatorSdmCustomUrl || undefined,
      updatedAt: parsed.updatedAt,
      updatedBy: parsed.updatedBy,
    };
  } catch (e) {
    return {
      namaKepalaSekolah: INFO_SEKOLAH.kepalaSekolah,
      pangkatKepalaSekolah: INFO_SEKOLAH.pangkatKepalaSekolah,
      nipKepalaSekolah: INFO_SEKOLAH.nipKepalaSekolah,
      namaKoordinatorSdm: INFO_SEKOLAH.koordinatorSdm,
      nipKoordinatorSdm: INFO_SEKOLAH.nipKoordinatorSdm,
    };
  }
};

export const saveLupaAbsenSettings = (
  settings: LupaAbsenSettings,
  admin?: Pegawai
): LupaAbsenSettings => {
  const toSave: LupaAbsenSettings = {
    namaKepalaSekolah: settings.namaKepalaSekolah.trim(),
    pangkatKepalaSekolah: settings.pangkatKepalaSekolah?.trim() || '',
    nipKepalaSekolah: settings.nipKepalaSekolah.trim(),
    namaKoordinatorSdm:
      settings.namaKoordinatorSdm?.trim() || INFO_SEKOLAH.koordinatorSdm,
    nipKoordinatorSdm:
      settings.nipKoordinatorSdm?.trim() || INFO_SEKOLAH.nipKoordinatorSdm,
    logoJatimCustomUrl: settings.logoJatimCustomUrl,
    logoSekolahCustomUrl: settings.logoSekolahCustomUrl,
    ttdKepsekCustomUrl: settings.ttdKepsekCustomUrl,
    ttdKoordinatorSdmCustomUrl: settings.ttdKoordinatorSdmCustomUrl,
    updatedAt: getJakartaTimestamp(),
    updatedBy: admin
      ? `${admin.gelarDepan ? admin.gelarDepan + ' ' : ''}${admin.nama}${admin.gelarBelakang ? ', ' + admin.gelarBelakang : ''}`
      : settings.updatedBy,
  };
  localStorage.setItem(STORAGE_KEYS.LUPA_ABSEN_SETTINGS, JSON.stringify(toSave));
  return toSave;
};

