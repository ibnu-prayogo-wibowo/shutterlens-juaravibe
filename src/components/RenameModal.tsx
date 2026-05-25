import { useState, FormEvent } from "react";
import { X, Type, ListOrdered, Sparkles } from "lucide-react";
import { PhotoMetadata } from "../types";
import { cn } from "../lib/utils";

export interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "light" | "dark";
  selectedPhotos: PhotoMetadata[];
  onRename: (config: {
    prefix: string;
    suffix: string;
    useSequence: boolean;
    sequenceBase: string;
    sequenceStart: number;
  }) => void;
}

export function RenameModal({
  isOpen,
  onClose,
  theme,
  selectedPhotos,
  onRename,
}: RenameModalProps) {
  const [useSequence, setUseSequence] = useState(false);
  const [renamePrefix, setRenamePrefix] = useState("");
  const [renameSuffix, setRenameSuffix] = useState("");
  const [sequenceBase, setSequenceBase] = useState("Katalog_");
  const [sequenceStart, setSequenceStart] = useState(1);

  if (!isOpen) return null;

  const totalSelected = selectedPhotos.length;

  // Helper to generate preview name of a specific photo at a given sequence/index
  const getPreviewName = (photo: PhotoMetadata, index: number) => {
    if (useSequence) {
      const currentNumber = sequenceStart + index;
      const formattedCounter = currentNumber.toString().padStart(3, "0");
      return `${sequenceBase}${formattedCounter}`;
    } else {
      const originalTitle = photo.englishMetadata?.title || "Foto";
      return `${renamePrefix}${originalTitle}${renameSuffix}`;
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onRename({
      prefix: renamePrefix,
      suffix: renameSuffix,
      useSequence,
      sequenceBase,
      sequenceStart,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-fade-in">
      <div
        className={cn(
          "border rounded-3xl p-6 w-full max-w-md transition-all duration-300 shadow-2xl relative",
          theme === "dark"
            ? "bg-[#111111] border-white/10 text-white"
            : "bg-white border-gray-200 text-gray-850",
        )}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-500/10 transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
            <Type size={24} />
          </div>
          <div>
            <h2
              className={cn(
                "text-xl font-bold font-sans",
                theme === "dark" ? "text-white" : "text-gray-950",
              )}
            >
              Ubah Nama Massal
            </h2>
            <p className="text-xs text-gray-500 font-medium font-sans">
              Akan mengubah nama {totalSelected} foto terpilih sekaligus secara instan
            </p>
          </div>
        </div>

        {/* Dynamic Live Previews Box */}
        {totalSelected > 0 && (
          <div
            className={cn(
              "mb-5 p-4 border rounded-2xl",
              theme === "dark"
                ? "bg-white/5 border-white/10 text-gray-400"
                : "bg-gray-50 border-gray-150 text-gray-600",
            )}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#a855f7] flex items-center gap-1.5 font-sans">
                <Sparkles size={11} /> Live Preview Hasil
              </span>
              <span className="text-[10px] font-bold text-gray-400 font-sans">
                {totalSelected} Foto Terpilih
              </span>
            </div>

            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {selectedPhotos.slice(0, 3).map((photo, idx) => {
                const previewName = getPreviewName(photo, idx);
                const originalTitle = photo.englishMetadata?.title || "Foto Tanpa Nama";
                return (
                  <div key={photo.id} className="flex justify-between items-center text-xs gap-3">
                    <span className="truncate text-gray-400 font-mono max-w-[150px]" title={originalTitle}>
                      {idx + 1}. {originalTitle}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 font-sans">➔</span>
                    <span className={cn(
                      "font-mono font-bold truncate text-right max-w-[180px]",
                      theme === "dark" ? "text-emerald-400" : "text-emerald-700"
                    )}>
                      {previewName}
                    </span>
                  </div>
                );
              })}
              {totalSelected > 3 && (
                <p className="text-[10px] text-gray-400 italic text-center pt-1 font-sans">
                  + {totalSelected - 3} foto terpilih lainnya akan mengikuti format yang sama
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Renaming Mode Switcher */}
          <div className="flex gap-2.5 mb-5 p-1 bg-gray-500/5 rounded-xl">
            <button
              type="button"
              onClick={() => setUseSequence(false)}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans",
                !useSequence
                  ? theme === "dark"
                    ? "bg-white/10 text-white shadow-sm border border-white/5"
                    : "bg-white text-gray-950 shadow-sm border border-gray-150"
                  : "text-gray-400 hover:text-gray-500"
              )}
            >
              <Type size={13} />
              Format Prefix & Suffix
            </button>
            <button
              type="button"
              onClick={() => setUseSequence(true)}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans",
                useSequence
                  ? theme === "dark"
                    ? "bg-white/10 text-white shadow-sm border border-white/5"
                    : "bg-white text-gray-950 shadow-sm border border-gray-150"
                  : "text-gray-400 hover:text-gray-500"
              )}
            >
              <ListOrdered size={13} />
              Format Urutan (Sequence)
            </button>
          </div>

          {/* Form Fields depends on Mode */}
          {!useSequence ? (
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1.5 font-sans">
                  Prefix (Awalan Nama)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Liburan_2026_"
                  value={renamePrefix}
                  onChange={(e) => setRenamePrefix(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-all font-mono",
                    theme === "dark"
                      ? "bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                      : "bg-white border-gray-200 text-gray-850 placeholder:text-gray-400",
                  )}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1.5 font-sans">
                  Suffix (Akhiran Nama)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: _Selesai"
                  value={renameSuffix}
                  onChange={(e) => setRenameSuffix(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-all font-mono",
                    theme === "dark"
                      ? "bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                      : "bg-white border-gray-200 text-gray-850 placeholder:text-gray-400",
                  )}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1.5 font-sans">
                  Nama Dasar (Base Name)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Foto_Spesimen_"
                  value={sequenceBase}
                  onChange={(e) => setSequenceBase(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-all font-mono",
                    theme === "dark"
                      ? "bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                      : "bg-white border-gray-200 text-gray-850 placeholder:text-gray-400",
                  )}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1.5 font-sans">
                  Nomor Mulai (Start Number)
                </label>
                <div className="relative w-full">
                  <input
                    type="number"
                    min="1"
                    placeholder="Contoh: 1"
                    value={sequenceStart}
                    onChange={(e) => setSequenceStart(Math.max(1, parseInt(e.target.value) || 1))}
                    className={cn(
                      "w-full rounded-xl px-4 py-2.5 border text-sm focus:outline-none focus:border-blue-500 pr-12 transition-all font-mono",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-850",
                    )}
                  />
                  <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-center">
                    <button
                      type="button"
                      onClick={() => setSequenceStart((s) => s + 1)}
                      className="text-gray-400 hover:text-blue-500 px-1 hover:scale-110 transition-transform text-xs cursor-pointer"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => setSequenceStart((s) => Math.max(1, s - 1))}
                      className="text-gray-400 hover:text-blue-500 px-1 hover:scale-110 transition-transform text-xs cursor-pointer"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "flex-1 py-3 px-4 font-bold rounded-xl transition-all border text-sm active:scale-95 cursor-pointer font-sans",
                theme === "dark"
                  ? "bg-white/5 hover:bg-white/10 border-transparent text-white"
                  : "bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700",
              )}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={
                !useSequence && !renamePrefix.trim() && !renameSuffix.trim()
                  ? true
                  : useSequence && !sequenceBase.trim()
                  ? true
                  : false
              }
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm active:scale-95 shadow-lg shadow-blue-600/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-sans"
            >
              Ubah Nama
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
