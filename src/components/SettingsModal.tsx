import React, { useState, useEffect, useRef } from 'react';
import { X, Key, ShieldAlert, Eye, EyeOff, QrCode, HelpCircle } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { cn } from '../lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetSession: () => void;
  theme?: 'light' | 'dark';
}

export function SettingsModal({ isOpen, onClose, onResetSession, theme = 'dark' }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyingStatus, setVerifyingStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isKeyVisible) {
        timeout = setTimeout(() => {
            setIsKeyVisible(false);
        }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [isKeyVisible]);

  useEffect(() => {
    // Load existing key if any
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) setApiKey(savedKey);
    
    // Load usage stats
    const stats = localStorage.getItem('processed_photos_count');
    setUsageStats(stats ? parseInt(stats, 10) : 0);

    // Load history
    const historyData = localStorage.getItem('metadata_history_titles');
    if (historyData) setHistory(JSON.parse(historyData));
  }, []);

  const handleDeleteHistoryItem = (indexToDelete: number) => {
    const updatedHistory = history.filter((_, i) => i !== indexToDelete);
    setHistory(updatedHistory);
    localStorage.setItem('metadata_history_titles', JSON.stringify(updatedHistory));
  };

  const handleClearHistory = () => {
    if (confirm('Apakah Anda yakin ingin menghapus semua riwayat metadata?')) {
      setHistory([]);
      localStorage.removeItem('metadata_history_titles');
    }
  };

  const handleSave = () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setError('Format API Key tidak valid. API Key tidak boleh kosong.');
      return;
    }

    if (!trimmedKey.startsWith('AIza')) {
      setError('API Key tidak valid. Harus dimulai dengan "AIza".');
      return;
    }

    if (trimmedKey.length < 39) {
      setError(`API Key terlalu pendek. Panjang yang dimasukkan baru ${trimmedKey.length} karakter, minimal diperlukan setidaknya 39 karakter.`);
      return;
    }

    const geminiPattern = /^AIza[a-zA-Z0-9-_]{35,}$/;
    if (!geminiPattern.test(trimmedKey)) {
      setError('Format API Key tidak valid. Kunci harus berupa karakter alfanumerik (huruf, angka, tanda hubung, atau garis bawah) yang sah dari Google.');
      return;
    }

    setError(null);
    localStorage.setItem('GEMINI_API_KEY', trimmedKey);
    alert('API Key berhasil disimpan!');
    onClose();
  };

  const handleVerify = async () => {
      setVerifying(true);
      setVerifyingStatus('idle');
      try {
          const res = await fetch('/api/verify-key', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey })
          });
          if (res.ok) {
              setVerifyingStatus('success');
          } else {
              setVerifyingStatus('error');
          }
      } catch (err) {
          setVerifyingStatus('error');
      } finally {
          setVerifying(false);
      }
  };

  useEffect(() => {
      if (isScanning) {
          const scanner = new Html5QrcodeScanner(
              "reader",
              { fps: 10, qrbox: { width: 250, height: 250 } },
              false
          );
          
          scanner.render(
              (decodedText) => {
                  setApiKey(decodedText);
                  setIsScanning(false);
                  scanner.clear();
              },
              (error) => {
                  console.warn(error);
              }
          );
          scannerRef.current = scanner;
      } else {
          if (scannerRef.current) {
              scannerRef.current.clear();
          }
      }

      return () => {
          if (scannerRef.current) {
              scannerRef.current.clear();
          }
      };
  }, [isScanning]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999999] p-4">
      <div className={cn(
        "border rounded-3xl p-8 max-w-md w-full shadow-2xl transition-all duration-300",
        theme === 'dark' ? "bg-[#111111] border-white/10" : "bg-white border-gray-200"
      )}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={cn("text-xl font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>Pengaturan API</h2>
          <button onClick={onClose} className={cn("transition-colors", theme === 'dark' ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")}><X size={20} /></button>
        </div>
        
        {/* Security Warning */}
        <div className={cn(
          "p-4 rounded-xl mb-6 flex gap-3 border text-xs leading-relaxed",
          theme === 'dark' 
            ? "bg-yellow-950/30 border-yellow-800/30 text-yellow-250" 
            : "bg-amber-50 border-amber-200 text-amber-800"
        )}>
          <ShieldAlert className={cn("shrink-0", theme === 'dark' ? "text-yellow-500" : "text-yellow-600")} size={24} />
          <p>
            <strong>Peringatan Keamanan:</strong> Menyimpan API Key di browser (localStorage) tidak aman. Gunakan hanya untuk kebutuhan pengembangan atau jika Anda mengerti risikonya. Jangan bagikan perangkat pengujian Anda.
          </p>
        </div>

        {/* Usage Stats */}
        <div className={cn(
          "border rounded-xl p-4 mb-6",
          theme === 'dark' ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
        )}>
          <div className="flex justify-between items-center mb-1">
            <div className={cn("text-[10px] font-bold uppercase tracking-widest", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
              Total Foto Diproses
            </div>
            <button
               onClick={() => {
                 if (confirm('Apakah Anda yakin ingin mereset sesi? Ini akan menghapus semua foto dan data sesi.')) {
                   onResetSession();
                   onClose();
                 }
               }}
               className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase"
            >
              Reset Sesi
            </button>
          </div>
          <div className={cn("text-2xl font-bold mb-4", theme === 'dark' ? "text-white" : "text-gray-900")}>{usageStats}</div>
          
          <div className="flex justify-between items-center mb-2">
            <div className={cn("text-[10px] font-bold uppercase tracking-widest", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
              Riwayat Judul (Terbaru)
            </div>
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase transition-colors"
                title="Hapus Semua Riwayat"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
            {history.length > 0 ? history.map((title, i) => (
                <div key={i} className={cn(
                  "group flex items-center justify-between gap-2 p-1.5 border rounded-lg transition-colors",
                  theme === 'dark'
                    ? "bg-white/5 border-white/5 hover:bg-white/10 text-gray-350"
                    : "bg-white border-gray-150 hover:bg-gray-50 text-gray-700"
                )}>
                  <span className="text-xs truncate flex-1">{title}</span>
                  <button 
                    onClick={() => handleDeleteHistoryItem(i)}
                    className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Hapus dari riwayat"
                  >
                    <X size={12} />
                  </button>
                </div>
            )) : <div className="text-xs text-gray-400 italic">Belum ada riwayat.</div>}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Key size={14} /> Gemini API Key
              <div className="relative group inline-block">
                <HelpCircle size={14} className={cn("cursor-help transition-colors", theme === 'dark' ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-950")} />
                <div className={cn(
                  "absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 border text-[11px] rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[999999] leading-relaxed font-normal text-left",
                  theme === 'dark' ? "bg-black/95 border-white/10 text-gray-200" : "bg-white border-gray-200 text-gray-700"
                )}>
                  <p className={cn("font-semibold mb-1", theme === 'dark' ? "text-white" : "text-gray-900")}>Kenapa API Key diperlukan?</p>
                  API Key digunakan untuk menghubungkan aplikasi dengan model AI Gemini guna melakukan analisis foto dan pembuatan metadata (judul, deskripsi, kata kunci) berkualitas profesional secara otomatis.
                  <div className={cn("absolute top-full left-1/2 -translate-x-1/2 border-dashed border-4 border-transparent", theme === 'dark' ? "border-t-black/95" : "border-t-white")}></div>
                </div>
              </div>
            </span>
            <div className="flex items-center gap-3">
                <button 
                    onClick={handleVerify}
                    disabled={verifying}
                    className={`hover:underline ${verifyingStatus === 'success' ? 'text-green-500' : verifyingStatus === 'error' ? 'text-red-500' : 'text-blue-500'} hover:text-opacity-80`}
                >
                    {verifying ? 'Verifying...' : verifyingStatus === 'success' ? '✔ Valid' : verifyingStatus === 'error' ? '✖ Invalid' : 'Test Key'}
                </button>
                <button
                    onClick={() => setIsScanning(!isScanning)}
                    className="text-blue-500 hover:text-blue-400"
                    title="Scan QR Code"
                >
                    <QrCode size={16} />
                </button>
                <a 
                href="https://aistudio.google.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-400 hover:underline"
                >
                Get API Key
                </a>
            </div>
          </label>

          {isScanning && <div id="reader" className="mb-4"></div>}
          <div className="relative">
            <input
              type={isKeyVisible ? "text" : "password"}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                if (error) setError(null);
              }}
              onBlur={() => setIsKeyVisible(false)}
              className={cn(
                "w-full border rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none pr-10 transition-colors",
                error 
                  ? "border-red-500 bg-red-500/5 text-red-900" 
                  : (theme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-205 text-gray-800")
              )}
              placeholder="AIza..."
            />
            <button
              type="button"
              onClick={() => setIsKeyVisible(!isKeyVisible)}
              className={cn("absolute right-3 top-1/2 -translate-y-1/2", theme === 'dark' ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-800")}
            >
              {isKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <div className={cn(
            "text-xs mt-3 p-3 rounded-xl border",
            theme === 'dark'
              ? "text-gray-400 bg-white/5 border-white/5"
              : "text-gray-600 bg-blue-50/10 border-blue-105"
          )}>
             <p className={cn("font-bold mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-700")}>Cara mendapatkan API Key:</p>
             <ul className={cn("list-disc list-inside space-y-0.5", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>
                 <li>Buka <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-semibold">Google AI Studio</a></li>
                 <li>Klik tombol "Get API key"</li>
                 <li>Pilih "Create API key in a new project"</li>
                 <li>Salin API Key tersebut</li>
              </ul>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20"
        >
          Simpan & Gunakan
        </button>
      </div>
    </div>
  );
}
