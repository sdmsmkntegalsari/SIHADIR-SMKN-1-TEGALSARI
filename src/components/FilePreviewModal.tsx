import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Printer,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { LupaAbsenSettings, PermintaanIzin } from '../types/attendance';
import { INFO_SEKOLAH, KOP_SURAT_RESMI } from '../data/mockData';
import { getLupaAbsenSettings } from '../utils/storage';
import { formatJakartaDateIndo } from '../utils/dateJakarta';
import {
  downloadSuratIzinPdf,
  isUsingDefaultTtdBlock,
} from '../utils/lupaAbsenPdf';
import { LogoPemprovJatim, LogoSmknTegalsari } from './KopSuratLogos';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  izin: PermintaanIzin | null;
}

const SuratIzinA4Content: React.FC<{
  izin: PermintaanIzin;
  settings: LupaAbsenSettings;
}> = ({ izin, settings }) => {
  const isApproved = izin.status === 'disetujui';
  const useDefaultFullBlock = isUsingDefaultTtdBlock(settings);
  const namaKepsek = settings.namaKepalaSekolah.trim();
  const pangkatKepsek = (settings.pangkatKepalaSekolah || '').trim();
  const nipKepsek = settings.nipKepalaSekolah.trim();

  const tglSuratRaw =
    isApproved && izin.tanggalVerifikasi
      ? izin.tanggalVerifikasi.slice(0, 10)
      : izin.tanggalPengajuan.slice(0, 10);
  const tglSuratIndo = formatJakartaDateIndo(tglSuratRaw);
  const tglMulaiIndo = formatJakartaDateIndo(izin.tanggalMulai);
  const tglSelesaiIndo = formatJakartaDateIndo(izin.tanggalSelesai);

  const nomorSurat =
    izin.nomorSurat || `800/IZN-${izin.id.slice(-6)}/SMKN1TGS/2026`;

  const statusText =
    izin.status === 'disetujui'
      ? 'DISETUJUI (SAH)'
      : izin.status === 'ditolak'
      ? 'DITOLAK'
      : 'MENUNGGU PERSETUJUAN ADMIN / KEPSEK';

  return (
    <div
      className="bg-white text-black mx-auto"
      style={{
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: '12pt',
        lineHeight: 1.5,
      }}
    >
      {/* Kop Surat Resmi */}
      <div className="flex items-center justify-between gap-4 pb-2.5 border-b-[3px] border-black relative">
        <div
          className="absolute left-0 right-0 -bottom-[6px] border-b border-black"
          aria-hidden="true"
        />

        <div className="w-20 h-22 flex items-center justify-center shrink-0">
          <LogoPemprovJatim
            customUrl={settings.logoJatimCustomUrl}
            className="w-18 h-20"
          />
        </div>

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
          <div className="text-[9.5pt] mt-1">{KOP_SURAT_RESMI.alamat}</div>
          <div className="text-[9.5pt]">{KOP_SURAT_RESMI.telepon}</div>
          <div className="text-[9.5pt]">
            Laman {KOP_SURAT_RESMI.laman} &nbsp;|&nbsp; Pos-el {KOP_SURAT_RESMI.posEl}
          </div>
          <div className="text-[9.5pt] font-bold">NPSN: {KOP_SURAT_RESMI.npsn}</div>
        </div>

        <div className="w-20 h-22 flex items-center justify-center shrink-0">
          <LogoSmknTegalsari
            customUrl={settings.logoSekolahCustomUrl}
            className="w-18 h-20"
          />
        </div>
      </div>

      {/* Judul Dokumen */}
      <div className="text-center mt-7 mb-6">
        <h2 className="text-[13pt] font-bold uppercase underline underline-offset-4 tracking-wide">
          SURAT KETERANGAN {izin.subKategori.toUpperCase()}
        </h2>
        <p className="text-[11pt] mt-1 tabular-nums">Nomor: {nomorSurat}</p>
      </div>

      {/* Isi Surat */}
      <div className="space-y-4 text-[12pt] text-justify">
        <p>
          {isApproved
            ? 'Yang bertanda tangan di bawah ini Kepala SMK Negeri 1 Tegalsari menerangkan dan memberikan persetujuan izin kehadiran kepada:'
            : 'Yang mengajukan permohonan izin kehadiran Guru / Pegawai SMK Negeri 1 Tegalsari berikut:'}
        </p>

        <table className="w-full border-collapse ml-3">
          <tbody>
            <tr>
              <td className="py-0.5 w-40 align-top">NAMA</td>
              <td className="py-0.5 w-4 align-top">:</td>
              <td className="py-0.5 font-bold align-top">{izin.pegawaiNama}</td>
            </tr>
            <tr>
              <td className="py-0.5 w-40 align-top">NIP</td>
              <td className="py-0.5 w-4 align-top">:</td>
              <td className="py-0.5 align-top tabular-nums">{izin.pegawaiNip}</td>
            </tr>
            <tr>
              <td className="py-0.5 w-40 align-top">JABATAN</td>
              <td className="py-0.5 w-4 align-top">:</td>
              <td className="py-0.5 align-top">{izin.pegawaiJabatan}</td>
            </tr>
            <tr>
              <td className="py-0.5 w-40 align-top">UNIT ORGANISASI</td>
              <td className="py-0.5 w-4 align-top">:</td>
              <td className="py-0.5 align-top">{INFO_SEKOLAH.nama}</td>
            </tr>
            <tr>
              <td className="py-0.5 w-40 align-top">JENIS IZIN</td>
              <td className="py-0.5 w-4 align-top">:</td>
              <td className="py-0.5 font-bold align-top">{izin.subKategori}</td>
            </tr>
            <tr>
              <td className="py-0.5 w-40 align-top">TANGGAL IZIN</td>
              <td className="py-0.5 w-4 align-top">:</td>
              <td className="py-0.5 align-top">
                {izin.tanggalMulai === izin.tanggalSelesai
                  ? `${tglMulaiIndo} (${izin.jumlahHari} hari kerja)`
                  : `${tglMulaiIndo} s/d ${tglSelesaiIndo} (${izin.jumlahHari} hari kerja)`}
              </td>
            </tr>
            {izin.tujuanLokasi && (
              <tr>
                <td className="py-0.5 w-40 align-top">LOKASI / TUJUAN</td>
                <td className="py-0.5 w-4 align-top">:</td>
                <td className="py-0.5 align-top">{izin.tujuanLokasi}</td>
              </tr>
            )}
            <tr>
              <td className="py-0.5 w-40 align-top">STATUS PENGAJUAN</td>
              <td className="py-0.5 w-4 align-top">:</td>
              <td className="py-0.5 font-bold align-top">{statusText}</td>
            </tr>
          </tbody>
        </table>

        <p>Dengan alasan / keperluan sebagai berikut:</p>

        <div className="pl-2 pr-1 whitespace-pre-wrap leading-relaxed">
          {izin.alasan}
        </div>

        {izin.catatanAdmin && (
          <p className="italic text-[11pt]">
            Catatan Verifikasi: {izin.catatanAdmin}
          </p>
        )}

        <p className="pt-2">
          Demikian surat keterangan izin ini dibuat untuk dipergunakan sebagaimana mestinya dalam administrasi kepegawaian SMK Negeri 1 Tegalsari.
        </p>
      </div>

      {/* Dua Kolom Tanda Tangan */}
      <div className="mt-10 grid grid-cols-2 gap-8 text-[12pt] break-inside-avoid">
        {/* Sebelah Kiri: Kepala Sekolah (Otomatis muncul TTD & Stempel jika sudah ACC/Disetujui) */}
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
              <p className="tabular-nums">NIP. {nipKepsek || '..................................'}</p>
            </>
          )}
        </div>

        {/* Sebelah Kanan: Banyuwangi + Koordinator Waka SDM */}
        <div className="text-left pl-6">
          <p>Banyuwangi, {tglSuratIndo}</p>
          <p>Koordinator Waka SDM,</p>
          <div className="h-[1.55em]" aria-hidden="true" />
          <div className="h-20" />
          <p className="font-bold underline underline-offset-2">{INFO_SEKOLAH.koordinatorSdm}</p>
          <p className="tabular-nums">NIP. {INFO_SEKOLAH.nipKoordinatorSdm}</p>
        </div>
      </div>
    </div>
  );
};

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  izin,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !izin) return null;

  const settings = getLupaAbsenSettings();

  const handlePrint = () => {
    document.body.setAttribute('data-print-mode', 'surat-izin');
    const cleanup = () => {
      document.body.removeAttribute('data-print-mode');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(() => {
      document.body.removeAttribute('data-print-mode');
    }, 1000);
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await downloadSuratIzinPdf(izin, settings);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/65 backdrop-blur-xs">
        <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[95vh]">
          {/* Modal Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-100 text-blue-800 rounded-lg shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Pratinjau & Cetak Surat Izin Resmi (A4)
                  </h3>
                  {izin.status === 'disetujui' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Disetujui · TTD Kepsek Aktif</span>
                    </span>
                  )}
                  {izin.status === 'menunggu' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Menunggu ACC</span>
                    </span>
                  )}
                  {izin.status === 'ditolak' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Ditolak</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-mono truncate">
                  {izin.berkasNama || 'Surat_Keterangan_Izin_Resmi.pdf'}
                  {izin.berkasSize ? ` · ${izin.berkasSize}` : ''}
                </p>
              </div>
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
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body: A4 Paper Preview */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-8 bg-slate-200">
            <div className="bg-white shadow-md mx-auto w-full max-w-[210mm] min-h-[297mm] px-6 py-8 sm:px-[20mm] sm:py-[16mm] border border-slate-300">
              <SuratIzinA4Content izin={izin} settings={settings} />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-white">
            <div className="text-xs text-slate-500">
              {izin.status === 'disetujui'
                ? 'Izin telah di-ACC. Tanda tangan & stempel Kepala Sekolah otomatis tampil dan siap dicetak.'
                : 'Tanda tangan & stempel Kepala Sekolah akan muncul otomatis setelah izin di-ACC oleh Admin/Pimpinan.'}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      </div>

      {/* Portal Khusus Cetak A4 Portrait Tanpa Terpotong */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="print-surat-portal">
            <SuratIzinA4Content izin={izin} settings={settings} />
          </div>,
          document.body
        )}
    </>
  );
};
