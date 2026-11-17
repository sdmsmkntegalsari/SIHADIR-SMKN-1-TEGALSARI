import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, AlertTriangle } from 'lucide-react';
import { LupaAbsenSettings, Pegawai, PengajuanLupaAbsen } from '../types/attendance';
import { INFO_SEKOLAH, KOP_SURAT_RESMI } from '../data/mockData';
import {
  formatJakartaDateIndo,
  formatJakartaDayName,
  getJenisLupaAbsenSuratText,
} from '../utils/dateJakarta';
import {
  downloadSuratLupaAbsenPdf,
  getFullPegawaiName,
  isUsingDefaultTtdBlock,
} from '../utils/lupaAbsenPdf';
import { LogoPemprovJatim, LogoSmknTegalsari } from './KopSuratLogos';

interface SuratLupaAbsenModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PengajuanLupaAbsen | null;
  pegawai: Pegawai | undefined;
  settings: LupaAbsenSettings;
  isAdmin?: boolean;
  onOpenSettings?: () => void;
}

const SuratA4Content: React.FC<{
  item: PengajuanLupaAbsen;
  pegawai: Pegawai | undefined;
  settings: LupaAbsenSettings;
}> = ({ item, pegawai, settings }) => {
  const namaGuru = getFullPegawaiName(pegawai);
  const nipGuru = pegawai?.nip || '-';
  const jabatanGuru = pegawai?.jabatan || '-';
  const hariKejadian = formatJakartaDayName(item.tanggalKejadian);
  const tglKejadianIndo = formatJakartaDateIndo(item.tanggalKejadian);
  const tglPengajuanIndo = formatJakartaDateIndo(item.tanggalPengajuan);
  const waktuText = getJenisLupaAbsenSuratText(item.jenisPresensi);
  const namaKepsek = settings.namaKepalaSekolah.trim();
  const pangkatKepsek = (settings.pangkatKepalaSekolah || '').trim();
  const nipKepsek = settings.nipKepalaSekolah.trim();
  const isApproved = item.status === 'disetujui';
  const useDefaultFullBlock = isUsingDefaultTtdBlock(settings);

  return (
    <div
      className="bg-white text-black mx-auto"
      style={{
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: '12pt',
        lineHeight: 1.55,
      }}
    >
      {/* Kop Surat Resmi */}
      <div className="flex items-center justify-between gap-4 pb-2.5 border-b-[3px] border-black relative">
        {/* Garis tipis ganda di bawah garis tebal */}
        <div
          className="absolute left-0 right-0 -bottom-[6px] border-b border-black"
          aria-hidden="true"
        />

        {/* Logo Pemprov Jawa Timur (Kiri) */}
        <div className="w-20 h-22 flex items-center justify-center shrink-0">
          <LogoPemprovJatim
            customUrl={settings.logoJatimCustomUrl}
            className="w-18 h-20"
          />
        </div>

        {/* Teks Kop Tengah */}
        <div className="flex-1 text-center leading-tight">
          <div className="text-[12pt] font-bold uppercase tracking-wide">
            {KOP_SURAT_RESMI.pemerintah}
          </div>
          <div className="text-[12pt] font-bold uppercase tracking-wide">
            {KOP_SURAT_RESMI.dinas}
          </div>
          <div className="text-[15.5pt] font-bold uppercase tracking-tight mt-0.5">
            {KOP_SURAT_RESMI.sekolah}
          </div>
          <div className="text-[9.5pt] mt-1">
            {KOP_SURAT_RESMI.alamat}
          </div>
          <div className="text-[9.5pt]">
            {KOP_SURAT_RESMI.telepon}
          </div>
          <div className="text-[9.5pt]">
            Laman {KOP_SURAT_RESMI.laman} &nbsp;|&nbsp; Pos-el {KOP_SURAT_RESMI.posEl}
          </div>
          <div className="text-[9.5pt] font-bold">
            NPSN: {KOP_SURAT_RESMI.npsn}
          </div>
        </div>

        {/* Logo SMK Negeri 1 Tegalsari (Kanan) */}
        <div className="w-20 h-22 flex items-center justify-center shrink-0">
          <LogoSmknTegalsari
            customUrl={settings.logoSekolahCustomUrl}
            className="w-18 h-20"
          />
        </div>
      </div>

      {/* Judul Surat */}
      <div className="text-center mt-8 mb-6">
        <h2 className="text-[13pt] font-bold uppercase underline underline-offset-4 tracking-wide">
          SURAT PERNYATAAN LUPA PRESENSI SI-HADIR
        </h2>
      </div>

      {/* Isi Surat */}
      <div className="space-y-4 text-[12pt] text-justify">
        <p>Yang bertanda tangan di bawah ini:</p>

        <table className="w-full border-collapse ml-3">
          <tbody>
            <tr>
              <td className="py-0.5 w-28 align-top">NAMA</td>
              <td className="py-0.5 w-4 align-top">:</td>
              <td className="py-0.5 font-bold align-top">{namaGuru}</td>
            </tr>
            <tr>
              <td className="py-0.5 w-28 align-top">NIP</td>
              <td className="py-0.5 w-4 align-top">:</td>
              <td className="py-0.5 align-top">{nipGuru}</td>
            </tr>
            <tr>
              <td className="py-0.5 w-28 align-top">JABATAN</td>
              <td className="py-0.5 w-4 align-top">:</td>
              <td className="py-0.5 align-top">{jabatanGuru}</td>
            </tr>
          </tbody>
        </table>

        <p>
          Pada hari <strong>{hariKejadian}</strong>, tanggal{' '}
          <strong>{tglKejadianIndo}</strong>, menyatakan bahwa saya tidak
          melakukan presensi SI-HADIR pada waktu{' '}
          <strong>{waktuText}</strong>
          {item.jamKejadian ? ` (sekitar pukul ${item.jamKejadian} WIB)` : ''}.
        </p>

        <p>Adapun kronologi kejadian sebagai berikut:</p>

        <div className="pl-2 pr-1 whitespace-pre-wrap leading-relaxed">
          {item.kronologi}
        </div>

        <p className="pt-2">
          Demikian surat pernyataan ini dibuat dengan sebenarnya untuk dapat
          dipertanggungjawabkan sebagaimana mestinya.
        </p>
      </div>

      {/* Dua Kolom Tanda Tangan */}
      <div className="mt-10 grid grid-cols-2 gap-8 text-[12pt] break-inside-avoid">
        {/* Sebelah Kiri: Kepala Sekolah (TTD + Stempel otomatis muncul bila status disetujui) */}
        <div className="text-left">
          <div className="h-[1.55em]" aria-hidden="true" />
          {isApproved && useDefaultFullBlock ? (
            <img
              src={INFO_SEKOLAH.ttdKepsekDefaultUrl}
              alt="Mengetahui Kepala SMK Negeri 1 Tegalsari - Candra Suro Laksono, S.Pi"
              className="w-[248px] max-w-full h-auto object-contain mix-blend-multiply -ml-2 -mt-1 select-none"
            />
          ) : (
            <>
              <p>Mengetahui,</p>
              <p>Kepala Sekolah</p>
              <div className="h-20 flex items-center">
                {isApproved && settings.ttdKepsekCustomUrl ? (
                  <img
                    src={settings.ttdKepsekCustomUrl}
                    alt="Tanda Tangan Kepala SMK Negeri 1 Tegalsari"
                    className="max-h-20 w-auto object-contain mix-blend-multiply select-none"
                  />
                ) : null}
              </div>
              <p className={`font-bold ${namaKepsek ? 'underline underline-offset-2' : ''}`}>
                {namaKepsek || '........................................'}
              </p>
              <p>NIP. {nipKepsek || '..................................'}</p>
            </>
          )}
        </div>

        {/* Sebelah Kanan: Guru / Yang Menyatakan */}
        <div className="text-left pl-6">
          <p>Banyuwangi, {tglPengajuanIndo}</p>
          <p>Yang menyatakan,</p>
          <div className="h-[1.55em]" aria-hidden="true" />
          <div className="h-20" />
          <p className="font-bold underline underline-offset-2">{namaGuru}</p>
          <p>NIP. {nipGuru}</p>
        </div>
      </div>
    </div>
  );
};

export const SuratLupaAbsenModal: React.FC<SuratLupaAbsenModalProps> = ({
  isOpen,
  onClose,
  item,
  pegawai,
  settings,
  isAdmin = false,
  onOpenSettings,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !item) return null;

  const isKepsekEmpty =
    !settings.namaKepalaSekolah.trim() || !settings.nipKepalaSekolah.trim();

  const handlePrint = () => {
    document.body.setAttribute('data-print-mode', 'surat-lupa-absen');
    const cleanup = () => {
      document.body.removeAttribute('data-print-mode');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    // Fallback cleanup bila browser tidak memicu afterprint
    setTimeout(() => {
      document.body.removeAttribute('data-print-mode');
    }, 1000);
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await downloadSuratLupaAbsenPdf(item, pegawai, settings);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      {/* Modal Pratinjau di Layar */}
      <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/65 backdrop-blur-xs">
        <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[95vh]">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 bg-slate-50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Pratinjau Surat Pernyataan Lupa Presensi (Ukuran A4)
              </h3>
              <p className="text-xs text-slate-500">
                Format resmi SMK Negeri 1 Tegalsari ·{' '}
                {item.status === 'disetujui' ? (
                  <span className="font-semibold text-emerald-700">
                    Disetujui — TTD & Stempel Kepala Sekolah tersemat otomatis
                  </span>
                ) : (
                  <span>TTD & Stempel Kepala Sekolah terbit otomatis setelah disetujui</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isDownloading ? 'Menyiapkan PDF...' : 'Unduh PDF'}</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Peringatan jika identitas Kepala Sekolah belum diisi Admin */}
          {isKepsekEmpty && (
            <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Nama & NIP Kepala Sekolah belum diatur pada Pengaturan Admin. Kolom tanda tangan Kepala Sekolah akan dicetak kosong sampai diisi.
                </span>
              </div>
              {isAdmin && onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="font-bold text-amber-950 underline hover:text-blue-900 whitespace-nowrap"
                >
                  Atur Sekarang
                </button>
              )}
            </div>
          )}

          {/* Area Kertas A4 Preview */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-8 bg-slate-200">
            <div
              className="bg-white shadow-md mx-auto w-full max-w-[210mm] min-h-[297mm] px-6 py-8 sm:px-[20mm] sm:py-[16mm] border border-slate-300"
            >
              <SuratA4Content item={item} pegawai={pegawai} settings={settings} />
            </div>
          </div>
        </div>
      </div>

      {/* Portal Khusus Cetak A4 Portrait Tanpa Terpotong */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="print-surat-portal">
            <SuratA4Content item={item} pegawai={pegawai} settings={settings} />
          </div>,
          document.body
        )}
    </>
  );
};
