import { jsPDF } from 'jspdf';
import {
  LupaAbsenSettings,
  Pegawai,
  PengajuanLupaAbsen,
  PermintaanIzin,
} from '../types/attendance';
import { INFO_SEKOLAH, KOP_SURAT_RESMI } from '../data/mockData';
import {
  formatJakartaDateIndo,
  formatJakartaDayName,
  getJenisLupaAbsenSuratText,
} from './dateJakarta';
import { LOGO_JATIM_SVG, LOGO_SMKN_SVG } from '../components/KopSuratLogos';

const imageSourceToPngDataUrl = (
  src: string,
  width = 240,
  height = 272
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        ctx.clearRect(0, 0, width, height);
        const scale = Math.min(width / img.width, height / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const offsetX = (width - drawW) / 2;
        const offsetY = (height - drawH) / 2;
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = src;
  });
};

const svgStringToPngDataUrl = (svgStr: string): Promise<string> => {
  const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
  return imageSourceToPngDataUrl(encoded);
};

export const getFullPegawaiName = (pegawai?: Pegawai | null): string => {
  if (!pegawai) return 'Pegawai SMKN 1 Tegalsari';
  return `${pegawai.gelarDepan ? pegawai.gelarDepan + ' ' : ''}${pegawai.nama}${
    pegawai.gelarBelakang ? ', ' + pegawai.gelarBelakang : ''
  }`;
};

/**
 * Mengecek apakah pengaturan Kepsek masih memakai blok stempel & TTD resmi bawaan
 * (/assets/aistudio/image_328916eb.png yang sudah memuat Mengetahui, Kepala Sekolah, TTD, Stempel, Nama, & NIP).
 */
export const isUsingDefaultTtdBlock = (settings: LupaAbsenSettings): boolean => {
  if (settings.ttdKepsekCustomUrl) return false;
  const namaLower = settings.namaKepalaSekolah.trim().toLowerCase();
  const nipClean = settings.nipKepalaSekolah.trim();
  const namaMatch = !namaLower || namaLower.includes('candra suro laksono');
  const nipMatch = !nipClean || nipClean === INFO_SEKOLAH.nipKepalaSekolah;
  return namaMatch && nipMatch;
};

/**
 * Helper menggambar Kop Surat Resmi SMKN 1 Tegalsari di dokumen jsPDF.
 * Mengembalikan koordinat Y setelah garis kop surat.
 */
const drawKopSuratPdf = async (
  doc: jsPDF,
  settings: LupaAbsenSettings
): Promise<number> => {
  const pageWidth = 210;
  const marginLeft = 20;
  const marginRight = 20;
  const centerX = pageWidth / 2;

  let leftLogoPng = '';
  let rightLogoPng = '';
  try {
    leftLogoPng = settings.logoJatimCustomUrl
      ? await imageSourceToPngDataUrl(settings.logoJatimCustomUrl)
      : await svgStringToPngDataUrl(LOGO_JATIM_SVG);
  } catch {
    leftLogoPng = '';
  }

  try {
    rightLogoPng = settings.logoSekolahCustomUrl
      ? await imageSourceToPngDataUrl(settings.logoSekolahCustomUrl)
      : await svgStringToPngDataUrl(LOGO_SMKN_SVG);
  } catch {
    rightLogoPng = '';
  }

  const y = 14;
  if (leftLogoPng) {
    doc.addImage(leftLogoPng, 'PNG', marginLeft, y, 21, 24);
  }
  if (rightLogoPng) {
    doc.addImage(rightLogoPng, 'PNG', pageWidth - marginRight - 21, y, 21, 24);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text(KOP_SURAT_RESMI.pemerintah, centerX, y + 4, { align: 'center' });

  doc.setFontSize(12);
  doc.text(KOP_SURAT_RESMI.dinas, centerX, y + 9.5, { align: 'center' });

  doc.setFontSize(15);
  doc.text(KOP_SURAT_RESMI.sekolah, centerX, y + 15.5, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(KOP_SURAT_RESMI.alamat, centerX, y + 20.5, { align: 'center' });
  doc.text(
    `${KOP_SURAT_RESMI.telepon}  |  Laman ${KOP_SURAT_RESMI.laman}`,
    centerX,
    y + 24.5,
    { align: 'center' }
  );
  doc.text(
    `Pos-el ${KOP_SURAT_RESMI.posEl}  |  NPSN: ${KOP_SURAT_RESMI.npsn}`,
    centerX,
    y + 28.5,
    { align: 'center' }
  );

  const kopLineY = y + 32;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.9);
  doc.line(marginLeft, kopLineY, pageWidth - marginRight, kopLineY);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, kopLineY + 1.2, pageWidth - marginRight, kopLineY + 1.2);

  return kopLineY;
};

/**
 * Menggambar kolom tanda tangan Kepala Sekolah di jsPDF.
 * Jika isApproved === true, stempel & tanda tangan Kepsek otomatis dicetak.
 */
const drawKepsekSignatureColumnPdf = async (
  doc: jsPDF,
  settings: LupaAbsenSettings,
  colX: number,
  startY: number,
  isApproved: boolean
): Promise<void> => {
  const namaKepsek = settings.namaKepalaSekolah.trim() || '........................................';
  const pangkatKepsek = (settings.pangkatKepalaSekolah || '').trim();
  const nipKepsek = settings.nipKepalaSekolah.trim() || '..................................';
  const useDefaultFullBlock = isUsingDefaultTtdBlock(settings);

  if (isApproved && useDefaultFullBlock) {
    try {
      const ttdPng = await imageSourceToPngDataUrl(
        INFO_SEKOLAH.ttdKepsekDefaultUrl,
        495,
        262
      );
      // Gambar blok resmi Kepsek (sudah memuat Mengetahui, Kepala Sekolah, stempel, TTD, nama, & NIP)
      doc.addImage(ttdPng, 'PNG', colX - 3, startY - 3, 72, 38.1);
      return;
    } catch {
      // Fallback ke teks jika gambar gagal dimuat
    }
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(11.5);
  doc.text('Mengetahui,', colX, startY);

  let y = startY + 5.5;
  doc.text('Kepala Sekolah', colX, y);

  if (isApproved && settings.ttdKepsekCustomUrl) {
    try {
      const customTtdPng = await imageSourceToPngDataUrl(
        settings.ttdKepsekCustomUrl,
        480,
        240
      );
      doc.addImage(customTtdPng, 'PNG', colX, y + 2, 46, 20);
    } catch {
      // Abaikan jika gagal konversi
    }
  }

  y += 24;
  doc.setFont('times', 'bold');
  const kepsekLines = doc.splitTextToSize(namaKepsek, 68);
  doc.text(kepsekLines, colX, y);

  if (settings.namaKepalaSekolah.trim()) {
    const wK = Math.min(68, doc.getTextWidth(kepsekLines[0]));
    doc.setLineWidth(0.3);
    doc.line(colX, y + 1, colX + wK, y + 1);
  }

  y += kepsekLines.length * 5.2 + 0.6;
  doc.setFont('times', 'normal');
  if (pangkatKepsek) {
    doc.text(pangkatKepsek, colX, y);
    y += 5;
  }
  doc.text(`NIP. ${nipKepsek}`, colX, y);
};

/**
 * Menghasilkan dan mengunduh file PDF A4 Portrait resmi untuk Surat Pernyataan Lupa Presensi SI-HADIR.
 */
export const downloadSuratLupaAbsenPdf = async (
  item: PengajuanLupaAbsen,
  pegawai: Pegawai | undefined,
  settings: LupaAbsenSettings
): Promise<void> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const centerX = pageWidth / 2;

  const kopLineY = await drawKopSuratPdf(doc, settings);

  // JUDUL SURAT
  let y = kopLineY + 10;
  doc.setFont('times', 'bold');
  doc.setFontSize(12.5);
  const titleText = 'SURAT PERNYATAAN LUPA PRESENSI SI-HADIR';
  doc.text(titleText, centerX, y, { align: 'center' });
  const titleWidth = doc.getTextWidth(titleText);
  doc.setLineWidth(0.4);
  doc.line(centerX - titleWidth / 2, y + 1.2, centerX + titleWidth / 2, y + 1.2);

  // ISI SURAT
  y += 12;
  doc.setFont('times', 'normal');
  doc.setFontSize(11.5);
  doc.text('Yang bertanda tangan di bawah ini:', marginLeft, y);

  y += 8;
  const namaGuru = getFullPegawaiName(pegawai);
  const nipGuru = pegawai?.nip || '-';
  const jabatanGuru = pegawai?.jabatan || '-';

  const labelX = marginLeft + 6;
  const colonX = marginLeft + 34;
  const valueX = marginLeft + 38;
  const valueMaxW = pageWidth - marginRight - valueX;

  const printIdentityRow = (label: string, val: string, isBold = false) => {
    doc.setFont('times', 'normal');
    doc.text(label, labelX, y);
    doc.text(':', colonX, y);
    doc.setFont('times', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(val, valueMaxW);
    doc.text(lines, valueX, y);
    y += Math.max(1, lines.length) * 6;
  };

  printIdentityRow('NAMA', namaGuru, true);
  printIdentityRow('NIP', nipGuru);
  printIdentityRow('JABATAN', jabatanGuru);

  y += 4;
  const hariKejadian = formatJakartaDayName(item.tanggalKejadian);
  const tglKejadianIndo = formatJakartaDateIndo(item.tanggalKejadian);
  const waktuPresensiText = getJenisLupaAbsenSuratText(item.jenisPresensi);
  const jamOpsional = item.jamKejadian ? ` (pukul ${item.jamKejadian} WIB)` : '';

  doc.setFont('times', 'normal');
  const statementPara = `Pada hari ${hariKejadian}, tanggal ${tglKejadianIndo}, menyatakan bahwa saya tidak melakukan presensi SI-HADIR pada waktu ${waktuPresensiText}${jamOpsional}.`;
  const statementLines = doc.splitTextToSize(statementPara, contentWidth);
  doc.text(statementLines, marginLeft, y);
  y += statementLines.length * 6 + 4;

  doc.text('Adapun kronologi kejadian sebagai berikut:', marginLeft, y);
  y += 7;

  const kronologiLines = doc.splitTextToSize(item.kronologi || '-', contentWidth - 4);
  for (let i = 0; i < kronologiLines.length; i++) {
    if (y > 268) {
      doc.addPage();
      y = 20;
    }
    doc.text(kronologiLines[i], marginLeft + 2, y);
    y += 5.8;
  }

  y += 5;
  if (y > 235) {
    doc.addPage();
    y = 22;
  }

  const closingPara =
    'Demikian surat pernyataan ini dibuat dengan sebenarnya untuk dapat dipertanggungjawabkan sebagaimana mestinya.';
  const closingLines = doc.splitTextToSize(closingPara, contentWidth);
  doc.text(closingLines, marginLeft, y);
  y += closingLines.length * 6 + 10;

  if (y > 225) {
    doc.addPage();
    y = 24;
  }

  // DUA KOLOM TANDA TANGAN
  const leftSigX = marginLeft + 2;
  const rightSigX = 122;
  const tglPengajuanIndo = formatJakartaDateIndo(item.tanggalPengajuan);
  const isApproved = item.status === 'disetujui';

  doc.setFont('times', 'normal');
  doc.text(`Banyuwangi, ${tglPengajuanIndo}`, rightSigX, y);
  y += 6;

  // Kiri: Kepala Sekolah (Otomatis muncul TTD & Stempel jika sudah disetujui)
  await drawKepsekSignatureColumnPdf(doc, settings, leftSigX, y, isApproved);

  // Kanan: Yang menyatakan (Guru / Pegawai)
  doc.setFont('times', 'normal');
  doc.text('Yang menyatakan,', rightSigX, y);
  const guruNameY = y + 29.5;
  doc.setFont('times', 'bold');
  const guruLines = doc.splitTextToSize(namaGuru, 68);
  doc.text(guruLines, rightSigX, guruNameY);

  const wG = Math.min(68, doc.getTextWidth(guruLines[0]));
  doc.setLineWidth(0.3);
  doc.line(rightSigX, guruNameY + 1, rightSigX + wG, guruNameY + 1);

  const guruNipY = guruNameY + guruLines.length * 5.2 + 0.8;
  doc.setFont('times', 'normal');
  doc.text(`NIP. ${nipGuru}`, rightSigX, guruNipY);

  const safeName = (pegawai?.nama || 'Pegawai').replace(/[^a-zA-Z0-9]+/g, '_');
  doc.save(`Surat_Pernyataan_Lupa_Absen_${safeName}_${item.tanggalKejadian}.pdf`);
};

/**
 * Menghasilkan dan mengunduh file PDF A4 Portrait resmi untuk semua jenis Izin (Dinas Luar, Cuti, Diklat, Izin Khusus).
 * Jika status sudah 'disetujui', otomatis mencantumkan TTD & Stempel Kepala Sekolah.
 */
export const downloadSuratIzinPdf = async (
  izin: PermintaanIzin,
  settings: LupaAbsenSettings
): Promise<void> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const centerX = pageWidth / 2;

  const kopLineY = await drawKopSuratPdf(doc, settings);

  // JUDUL SURAT
  let y = kopLineY + 10;
  doc.setFont('times', 'bold');
  doc.setFontSize(12.5);
  const titleText = `SURAT KETERANGAN ${izin.subKategori.toUpperCase()}`;
  const titleLines = doc.splitTextToSize(titleText, contentWidth);
  doc.text(titleLines, centerX, y, { align: 'center' });
  const firstTitleWidth = doc.getTextWidth(titleLines[0]);
  doc.setLineWidth(0.4);
  doc.line(
    centerX - firstTitleWidth / 2,
    y + 1.2,
    centerX + firstTitleWidth / 2,
    y + 1.2
  );

  y += titleLines.length * 5.5 + 1;
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  const nomorSurat =
    izin.nomorSurat || `800/IZN-${izin.id.slice(-6)}/SMKN1TGS/2026`;
  doc.text(`Nomor: ${nomorSurat}`, centerX, y, { align: 'center' });

  // ISI SURAT
  y += 11;
  doc.setFont('times', 'normal');
  doc.setFontSize(11.5);
  const introPara =
    izin.status === 'disetujui'
      ? 'Yang bertanda tangan di bawah ini Kepala SMK Negeri 1 Tegalsari menerangkan dan memberikan persetujuan izin kehadiran kepada:'
      : 'Yang mengajukan permohonan izin kehadiran Guru/Pegawai SMK Negeri 1 Tegalsari berikut:';
  const introLines = doc.splitTextToSize(introPara, contentWidth);
  doc.text(introLines, marginLeft, y);
  y += introLines.length * 6 + 3;

  const labelX = marginLeft + 6;
  const colonX = marginLeft + 44;
  const valueX = marginLeft + 48;
  const valueMaxW = pageWidth - marginRight - valueX;

  const printRow = (label: string, val: string, isBold = false) => {
    doc.setFont('times', 'normal');
    doc.text(label, labelX, y);
    doc.text(':', colonX, y);
    doc.setFont('times', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(val || '-', valueMaxW);
    doc.text(lines, valueX, y);
    y += Math.max(1, lines.length) * 5.8;
  };

  printRow('NAMA', izin.pegawaiNama, true);
  printRow('NIP', izin.pegawaiNip);
  printRow('JABATAN', izin.pegawaiJabatan);
  printRow('UNIT ORGANISASI', INFO_SEKOLAH.nama);

  y += 4;
  const tglMulaiIndo = formatJakartaDateIndo(izin.tanggalMulai);
  const tglSelesaiIndo = formatJakartaDateIndo(izin.tanggalSelesai);
  const statusLabel =
    izin.status === 'disetujui'
      ? 'DISETUJUI (SAH)'
      : izin.status === 'ditolak'
      ? 'DITOLAK'
      : 'MENUNGGU PERSETUJUAN';

  printRow('JENIS IZIN', izin.subKategori, true);
  printRow(
    'TANGGAL IZIN',
    izin.tanggalMulai === izin.tanggalSelesai
      ? `${tglMulaiIndo} (${izin.jumlahHari} hari kerja)`
      : `${tglMulaiIndo} s/d ${tglSelesaiIndo} (${izin.jumlahHari} hari kerja)`
  );
  if (izin.tujuanLokasi) {
    printRow('LOKASI / TUJUAN', izin.tujuanLokasi);
  }
  printRow('STATUS PENGAJUAN', statusLabel, true);

  y += 3;
  doc.setFont('times', 'normal');
  doc.text('Dengan alasan / keperluan sebagai berikut:', marginLeft, y);
  y += 6.5;

  const alasanLines = doc.splitTextToSize(izin.alasan || '-', contentWidth - 4);
  for (let i = 0; i < alasanLines.length; i++) {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    doc.text(alasanLines[i], marginLeft + 2, y);
    y += 5.8;
  }

  if (izin.catatanAdmin) {
    y += 3;
    doc.setFont('times', 'italic');
    const catatanLines = doc.splitTextToSize(
      `Catatan Verifikasi: ${izin.catatanAdmin}`,
      contentWidth
    );
    doc.text(catatanLines, marginLeft, y);
    y += catatanLines.length * 5.5;
  }

  y += 5;
  if (y > 235) {
    doc.addPage();
    y = 22;
  }

  doc.setFont('times', 'normal');
  const closingLines = doc.splitTextToSize(
    'Demikian surat keterangan izin ini dibuat untuk dipergunakan sebagaimana mestinya dalam administrasi kepegawaian SMK Negeri 1 Tegalsari.',
    contentWidth
  );
  doc.text(closingLines, marginLeft, y);
  y += closingLines.length * 6 + 10;

  if (y > 220) {
    doc.addPage();
    y = 24;
  }

  // DUA KOLOM TANDA TANGAN
  const leftSigX = marginLeft + 2;
  const rightSigX = 122;
  const tglSuratRaw =
    izin.status === 'disetujui' && izin.tanggalVerifikasi
      ? izin.tanggalVerifikasi.slice(0, 10)
      : izin.tanggalPengajuan.slice(0, 10);
  const tglSuratIndo = formatJakartaDateIndo(tglSuratRaw);
  const isApproved = izin.status === 'disetujui';

  // Kiri: Kepala Sekolah (otomatis TTD & stempel jika disetujui)
  await drawKepsekSignatureColumnPdf(doc, settings, leftSigX, y + 6, isApproved);

  // Kanan: Banyuwangi + Koordinator Waka SDM
  doc.setFont('times', 'normal');
  doc.text(`Banyuwangi, ${tglSuratIndo}`, rightSigX, y);
  doc.text('Koordinator Waka SDM,', rightSigX, y + 6);
  const koordNameY = y + 35.5;
  doc.setFont('times', 'bold');
  const koordLines = doc.splitTextToSize(INFO_SEKOLAH.koordinatorSdm, 68);
  doc.text(koordLines, rightSigX, koordNameY);
  const wK = Math.min(68, doc.getTextWidth(koordLines[0]));
  doc.setLineWidth(0.3);
  doc.line(rightSigX, koordNameY + 1, rightSigX + wK, koordNameY + 1);
  doc.setFont('times', 'normal');
  doc.text(
    `NIP. ${INFO_SEKOLAH.nipKoordinatorSdm}`,
    rightSigX,
    koordNameY + koordLines.length * 5.2 + 0.8
  );

  const safeName = izin.pegawaiNama.replace(/[^a-zA-Z0-9]+/g, '_');
  doc.save(`Surat_Izin_${safeName}_${izin.tanggalMulai}.pdf`);
};
