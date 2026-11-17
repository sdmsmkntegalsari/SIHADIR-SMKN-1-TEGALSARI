import { JenisLupaAbsen } from '../types/attendance';

const JAKARTA_TZ = 'Asia/Jakarta';

/**
 * Mengembalikan tanggal hari ini format YYYY-MM-DD pada zona waktu Asia/Jakarta.
 */
export const getJakartaTodayISO = (offsetDays: number = 0): string => {
  const now = new Date();
  if (offsetDays !== 0) {
    now.setDate(now.getDate() + offsetDays);
  }
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: JAKARTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
};

/**
 * Mengembalikan timestamp saat ini format 'YYYY-MM-DD HH:mm' pada zona waktu Asia/Jakarta.
 */
export const getJakartaTimestamp = (): string => {
  const now = new Date();
  const datePart = new Intl.DateTimeFormat('en-CA', {
    timeZone: JAKARTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const timePart = new Intl.DateTimeFormat('id-ID', {
    timeZone: JAKARTA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(now)
    .replace('.', ':');

  return `${datePart} ${timePart}`;
};

/**
 * Parse tanggal YYYY-MM-DD secara aman ke Date tengah hari UTC agar tidak bergeser hari.
 */
const parseDateSafe = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const clean = dateStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 5, 0, 0));
};

/**
 * Nama hari Indonesia (Senin, Selasa, ...) pada zona waktu Asia/Jakarta.
 */
export const formatJakartaDayName = (dateStr: string): string => {
  const parsed = parseDateSafe(dateStr);
  if (!parsed) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: JAKARTA_TZ,
    weekday: 'long',
  }).format(parsed);
};

/**
 * Format tanggal Indonesia lengkap: '17 November 2026'.
 */
export const formatJakartaDateIndo = (dateStr: string): string => {
  const parsed = parseDateSafe(dateStr);
  if (!parsed) return dateStr || '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: JAKARTA_TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
};

/**
 * Format tanggal dan waktu Indonesia: '17 November 2026, 08:15 WIB'.
 */
export const formatJakartaDateTimeIndo = (dateTimeStr?: string): string => {
  if (!dateTimeStr) return '-';
  const datePart = dateTimeStr.slice(0, 10);
  const timePart = dateTimeStr.length >= 16 ? dateTimeStr.slice(11, 16) : '';
  const dateIndo = formatJakartaDateIndo(datePart);
  return timePart ? `${dateIndo}, ${timePart} WIB` : dateIndo;
};

/**
 * Label tampilan UI untuk jenis lupa presensi.
 */
export const getJenisLupaAbsenLabel = (jenis: JenisLupaAbsen): string => {
  switch (jenis) {
    case 'masuk':
      return 'Lupa Presensi Masuk';
    case 'pulang':
      return 'Lupa Presensi Pulang';
    case 'masuk_dan_pulang':
      return 'Lupa Presensi Masuk & Pulang';
  }
};

/**
 * Teks formal pada isi surat pernyataan sesuai ketentuan: [Masuk/Pulang/Keduanya].
 */
export const getJenisLupaAbsenSuratText = (jenis: JenisLupaAbsen): string => {
  switch (jenis) {
    case 'masuk':
      return 'Masuk';
    case 'pulang':
      return 'Pulang';
    case 'masuk_dan_pulang':
      return 'Keduanya (Masuk dan Pulang)';
  }
};
