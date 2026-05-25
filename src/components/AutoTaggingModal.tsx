import { useState, useEffect } from "react";
import { X, Sparkles, Check, CheckSquare, Square, Tag, Layers, RefreshCw, HelpCircle, Eye } from "lucide-react";
import { PhotoMetadata } from "../types";
import { cn } from "../lib/utils";

export interface AutoTagGroup {
  id: string;
  category: string;
  name: string;
  enKeywords: string[];
  idKeywords: string[];
  triggers: string[];
}

export const PREDEFINED_GROUPS: AutoTagGroup[] = [
  // Seasons
  {
    id: "season_summer",
    category: "Seasons (Musim)",
    name: "Summer Themes",
    enKeywords: ["Summer-Vibe", "Warm Weather", "Sunny Day", "Bright Sunlight"],
    idKeywords: ["Nuansa Musim Panas", "Cuaca Hangat", "Hari Cerah", "Cahaya Terang"],
    triggers: ["summer", "panas", "sun", "sunny", "beach", "pantai", "desert", "cerah", "pasir", "sand", "ocean"]
  },
  {
    id: "season_winter",
    category: "Seasons (Musim)",
    name: "Winter Themes",
    enKeywords: ["Wintertime", "Snowy Landscape", "Cold Weather", "Frosty View"],
    idKeywords: ["Musim Dingin", "Pemandangan Salju", "Cuaca Dingin", "Nuansa Es"],
    triggers: ["winter", "salju", "snow", "ice", "es", "cold", "dingin", "frost", "frozen", "gletser", "glacier"]
  },
  {
    id: "season_autumn",
    category: "Seasons (Musim)",
    name: "Autumn Themes",
    enKeywords: ["Scenic Autumn", "Leaves Fall", "Warm Palette", "Aesthetic Autumn"],
    idKeywords: ["Musim Gugur", "Daun Berguguran", "Daun Kering", "Palet Warna Hangat"],
    triggers: ["autumn", "gugur", "fall", "dry leaf", "daun kering", "maple", "jingga", "orange leaves"]
  },
  {
    id: "season_spring",
    category: "Seasons (Musim)",
    name: "Spring Themes",
    enKeywords: ["Spring Season", "Floral Bloom", "Vibrant Garden", "Fresh Blossom"],
    idKeywords: ["Musim Semi", "Mekar Bunga", "Taman Riang", "Kuncup Segar"],
    triggers: ["spring", "semi", "flower", "bunga", "bloom", "blossom", "garden", "park", "kebun", "taman", "flora"]
  },

  // Colors & Palettes
  {
    id: "color_greenery",
    category: "Colors & Palettes (Warna)",
    name: "Greenery & Woods",
    enKeywords: ["Lush Greenery", "Forest Green", "Tropical Flora", "Natural Bush"],
    idKeywords: ["Dedaunan Hijau", "Hijau Hutan", "Flora Tropis", "Tumbuhan Alami"],
    triggers: ["green", "hijau", "leaf", "daun", "plant", "tumbuhan", "forest", "hutan", "grass", "rumput", "moss", "lumut", "jungle", "rimba"]
  },
  {
    id: "color_blue_water",
    category: "Colors & Palettes (Warna)",
    name: "Sky & Oceanic",
    enKeywords: ["Serene Blue", "Sky Atmosphere", "Water Surface", "Oceanic Breeze"],
    idKeywords: ["Biru Tenang", "Atmosfer Langit", "Refleksi Air", "Angin Laut"],
    triggers: ["blue", "biru", "sky", "langit", "cloud", "awan", "ocean", "laut", "sea", "beach", "air", "water", "lake", "danau", "river", "sungai", "pantai", "gelombang", "wave"]
  },
  {
    id: "color_gold_yellow",
    category: "Colors & Palettes (Warna)",
    name: "Sunrise & Sunset Glow",
    enKeywords: ["Golden Hour Glow", "Warm Sunset", "Sunlight Highlights", "Vibrant Amber"],
    idKeywords: ["Pijar Golden Hour", "Senja Hangat", "Sorotan Sinar Matahari", "Warna Amber"],
    triggers: ["sunset", "sunrise", "golden hour", "fajar", "senja", "dusk", "dawn", "gold", "emas", "yellow", "kuning", "sore", "pagi", "sunlight"]
  },
  {
    id: "color_red_crimson",
    category: "Colors & Palettes (Warna)",
    name: "Vibrant Reds",
    enKeywords: ["Crimson Highlights", "Bold Red Accent", "Organic Pigment", "Fiery Red"],
    idKeywords: ["Merah Membara", "Aksen Merah Berani", "Pigmen Organik", "Sorot Merah"],
    triggers: ["red", "merah", "scarlet", "crimson", "fire", "api", "rose", "mawar", "chili", "cabai", "darah", "blood"]
  },

  // Environment & Subjects
  {
    id: "env_nature",
    category: "Environment & Subjects (Aspek)",
    name: "Wild Landscape & Habitat",
    enKeywords: ["Pristine Wilderness", "Scenic Outdoors", "Ecological Beauty", "Organic Texture"],
    idKeywords: ["Rimba Liar", "Luar Ruangan Indah", "Keindahan Ekologi", "Tekstur Organik"],
    triggers: ["nature", "alam", "wild", "liar", "hutan", "forest", "mountain", "gunung", "hill", "bukit", "landscape", "pemandangan", "tree", "pohon", "biodiversity"]
  },
  {
    id: "env_urban",
    category: "Environment & Subjects (Aspek)",
    name: "Urban & Architecture",
    enKeywords: ["Metropolitan", "City Geometry", "Man-made Landscape", "Urban Explorer"],
    idKeywords: ["Struktur Metropolitan", "Geometri Kota", "Sentuhan Manusia", "Penjelajah Kota"],
    triggers: ["city", "kota", "building", "gedung", "architecture", "arsitektur", "street", "jalan", "monument", "concrete", "beton", "sejarah", "historic"]
  },
  {
    id: "env_macro",
    category: "Environment & Subjects (Aspek)",
    name: "Macro & Plant Details",
    enKeywords: ["Macro Composition", "Intimate Texture", "Microscopic Details", "Sharp Focal Point"],
    idKeywords: ["Komposisi Makro", "Tekstur Intim", "Detail Mikroskopis", "Titik Fokus Tajam"],
    triggers: ["macro", "close up", "detail", "texture", "tekstur", "pattern", "pola", "fiber", "serabut", "vein", "urat", "pollen", "serbuk", "bunga", "petal"]
  }
];

// Helper to determine if metadata matches triggers
export const matchTriggers = (photo: PhotoMetadata, triggers: string[]): boolean => {
  const enTitle = (photo.englishMetadata?.title || "").toLowerCase();
  const enDesc = (photo.englishMetadata?.description || "").toLowerCase();
  const enKws = (photo.englishMetadata?.keywords || []).map(k => k.toLowerCase());

  const idTitle = (photo.indonesianMetadata?.title || "").toLowerCase();
  const idDesc = (photo.indonesianMetadata?.description || "").toLowerCase();
  const idKws = (photo.indonesianMetadata?.keywords || []).map(k => k.toLowerCase());

  return triggers.some(trigger => {
    const t = trigger.toLowerCase().trim();
    if (!t) return false;
    
    // Check titles and descriptions
    if (enTitle.includes(t) || enDesc.includes(t) || idTitle.includes(t) || idDesc.includes(t)) {
      return true;
    }
    // Check keywords matches
    if (enKws.some(kw => kw.toLowerCase().includes(t)) || idKws.some(kw => kw.toLowerCase().includes(t))) {
      return true;
    }
    return false;
  });
};

export interface AutoTaggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "light" | "dark";
  selectedPhotos: PhotoMetadata[];
  onApplyTags: (results: { id: string; enTags: string[]; idTags: string[] }[]) => void;
}

export function AutoTaggingModal({
  isOpen,
  onClose,
  theme,
  selectedPhotos,
  onApplyTags,
}: AutoTaggingModalProps) {
  // Store selected groups for each photo: Record<photoId, Record<groupId, boolean>>
  const [selections, setSelections] = useState<Record<string, Record<string, boolean>>>({});
  const [activePhotoId, setActivePhotoId] = useState<string>("");
  const [applyToEn, setApplyToEn] = useState(true);
  const [applyToId, setApplyToId] = useState(true);

  // Initialize and run auto-matching on photo analysis data
  useEffect(() => {
    if (isOpen && selectedPhotos.length > 0) {
      const initialSelections: Record<string, Record<string, boolean>> = {};
      
      selectedPhotos.forEach((photo) => {
        initialSelections[photo.id] = {};
        PREDEFINED_GROUPS.forEach((group) => {
          // If match found, auto-check by default
          const hasMatch = matchTriggers(photo, group.triggers);
          initialSelections[photo.id][group.id] = hasMatch;
        });
      });
      
      setSelections(initialSelections);
      setActivePhotoId(selectedPhotos[0].id);
    }
  }, [isOpen, selectedPhotos]);

  if (!isOpen) return null;

  const activePhoto = selectedPhotos.find((p) => p.id === activePhotoId) || selectedPhotos[0];

  // Count matches globally
  const getGlobalMatchCount = () => {
    let matches = 0;
    Object.values(selections).forEach((photoGroup) => {
      Object.values(photoGroup).forEach((isSelected) => {
        if (isSelected) matches++;
      });
    });
    return matches;
  };

  const handleToggleGroupForPhoto = (photoId: string, groupId: string) => {
    setSelections((prev) => {
      const photoSelect = { ...(prev[photoId] || {}) };
      photoSelect[groupId] = !photoSelect[groupId];
      return {
        ...prev,
        [photoId]: photoSelect
      };
    });
  };

  const handleToggleGroupForAllSelected = (groupId: string, turnOn: boolean) => {
    setSelections((prev) => {
      const updated = { ...prev };
      selectedPhotos.forEach((photo) => {
        updated[photo.id] = {
          ...(updated[photo.id] || {}),
          [groupId]: turnOn
        };
      });
      return updated;
    });
  };

  const handleApply = () => {
    const results = selectedPhotos.map((photo) => {
      const photoGroupSelections = selections[photo.id] || {};
      const enTagsToApply: string[] = [];
      const idTagsToApply: string[] = [];

      PREDEFINED_GROUPS.forEach((group) => {
        if (photoGroupSelections[group.id]) {
          if (applyToEn) {
            enTagsToApply.push(...group.enKeywords);
          }
          if (applyToId) {
            idTagsToApply.push(...group.idKeywords);
          }
        }
      });

      return {
        id: photo.id,
        enTags: Array.from(new Set(enTagsToApply)), // unique
        idTags: Array.from(new Set(idTagsToApply)), // unique
      };
    });

    onApplyTags(results);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-fade-in">
      <div
        className={cn(
          "border rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col transition-all duration-300 shadow-2xl relative overflow-hidden",
          theme === "dark"
            ? "bg-[#111111] border-white/10 text-white"
            : "bg-white border-gray-200 text-gray-850",
        )}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-500/10 transition-colors cursor-pointer z-10"
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-gray-500/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <div>
              <h2
                className={cn(
                  "text-xl font-bold font-sans flex items-center gap-2",
                  theme === "dark" ? "text-white" : "text-gray-950",
                )}
              >
                Auto-Tagging AI Sugesti
              </h2>
              <p className="text-xs text-gray-500 font-medium font-sans">
                Gunakan kecerdasan buatan untuk menganalisis metadata & secara otomatis merekomendasikan kata kunci kaya fitur.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body: Two Columns */}
        <div className="flex-1 flex min-h-0 overflow-hidden divide-x divide-gray-500/10">
          
          {/* Left Column: Photo List */}
          <div className="w-1/3 flex flex-col overflow-y-auto p-4 gap-3 bg-gray-500/[0.02]">
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 font-sans px-2">
              Daftar Foto ({selectedPhotos.length})
            </span>
            <div className="space-y-2">
              {selectedPhotos.map((photo) => {
                const isActive = photo.id === activePhotoId;
                const photoGroup = selections[photo.id] || {};
                const matchedCount = Object.values(photoGroup).filter(Boolean).length;

                return (
                  <button
                    key={photo.id}
                    onClick={() => setActivePhotoId(photo.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer",
                      isActive
                        ? theme === "dark"
                          ? "bg-blue-600/10 border-blue-500/40 text-white"
                          : "bg-blue-50 border-blue-200 text-blue-900 shadow-sm"
                        : theme === "dark"
                          ? "bg-[#181818] border-white/5 text-gray-400 hover:border-white/10 hover:text-white"
                          : "bg-white border-gray-200 text-gray-650 hover:bg-gray-50 hover:text-gray-950"
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-500/10 flex-shrink-0 relative border border-white/10">
                      <img
                        src={photo.url}
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {matchedCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-emerald-500 text-white font-sans text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-black shadow">
                          {matchedCount}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">
                        {photo.englishMetadata?.title || photo.indonesianMetadata?.title || "Untitled Image"}
                      </p>
                      <p className="text-[10px] text-gray-450 truncate font-mono mt-0.5">
                        {matchedCount > 0 ? `${matchedCount} rekomendasi aktif` : "Tidak ada rekomendasi"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Dynamic Recommendations Panel */}
          {activePhoto && (
            <div className="w-2/3 flex flex-col min-h-0 overflow-y-auto p-6">
              
              {/* Target Photo Banner */}
              <div
                className={cn(
                  "p-4 border rounded-3xl mb-6 flex items-start gap-4",
                  theme === "dark" ? "bg-white/[0.03] border-white/10" : "bg-gray-50 border-gray-200",
                )}
              >
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-500/10 border flex-shrink-0">
                  <img
                    src={activePhoto.url}
                    alt="Active View"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={cn("text-sm font-bold font-sans truncate", theme === "dark" ? "text-white" : "text-gray-900")}>
                    {activePhoto.englishMetadata?.title || "Foto Terpilih"}
                  </h3>
                  <p className="text-xs text-gray-400 font-sans mt-1 line-clamp-2">
                    {activePhoto.englishMetadata?.description || activePhoto.indonesianMetadata?.description || "Tidak ada deskripsi analitis"}
                  </p>
                  
                  {/* Detected features tag row */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Array.from(new Set([
                      ...(activePhoto.englishMetadata?.keywords || []).slice(0, 4),
                      ...(activePhoto.indonesianMetadata?.keywords || []).slice(0, 4)
                    ])).map((word, i) => (
                      <span key={i} className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-gray-500/10 text-gray-400 rounded border border-gray-500/5">
                        #{word}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Suggestions Grid */}
              <div className="flex-1 space-y-6">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#a855f7] font-sans block mb-3">
                    Sugesti Kata Kunci Berdasarkan Fitur AI
                  </span>

                  <div className="space-y-4">
                    {/* Render by categories */}
                    {Array.from(new Set(PREDEFINED_GROUPS.map(g => g.category))).map((catName) => (
                      <div key={catName} className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-400 border-b border-gray-500/10 pb-1 font-sans">{catName}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {PREDEFINED_GROUPS.filter(g => g.category === catName).map((group) => {
                            const isGroupSelected = !!selections[activePhoto.id]?.[group.id];
                            const hasNaturalMatch = matchTriggers(activePhoto, group.triggers);

                            return (
                              <div
                                key={group.id}
                                className={cn(
                                  "p-3 rounded-2xl border transition-all text-left flex flex-col justify-between gap-2.5",
                                  isGroupSelected
                                    ? theme === "dark"
                                      ? "bg-blue-600/10 border-blue-500/40 text-white"
                                      : "bg-blue-50 border-blue-200 text-blue-950"
                                    : theme === "dark"
                                      ? "bg-black/20 border-white/5 text-gray-400"
                                      : "bg-gray-100/50 border-gray-200 text-gray-700"
                                )}
                              >
                                <div className="flex items-start justify-between min-w-0">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-bold font-sans truncate">{group.name}</p>
                                      {hasNaturalMatch && (
                                        <span className="text-[8px] font-bold bg-emerald-500/10 text-emerald-400 px-1 py-0.2 rounded border border-emerald-500/20 font-sans shrink-0 animate-pulse">
                                          Cocok AI
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-sans mt-0.5 line-clamp-1 italic text-wrap">
                                      Pemicu: {group.triggers.slice(0, 5).join(", ")}
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleGroupForPhoto(activePhoto.id, group.id)}
                                    className="p-1 rounded-lg hover:bg-gray-500/10 text-blue-500 flex-shrink-0 cursor-pointer"
                                  >
                                    {isGroupSelected ? (
                                      <CheckSquare size={18} className="text-blue-500" />
                                    ) : (
                                      <Square size={18} className="text-gray-400" />
                                    )}
                                  </button>
                                </div>

                                {/* Keyword highlights */}
                                <div className="flex flex-wrap gap-1">
                                  {applyToEn && group.enKeywords.slice(0, 2).map((k, idx) => (
                                    <span key={`en-${idx}`} className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">
                                      {k}
                                    </span>
                                  ))}
                                  {applyToId && group.idKeywords.slice(0, 2).map((k, idx) => (
                                    <span key={`id-${idx}`} className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md">
                                      {k}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-500/10 flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-500/[0.02]">
          
          {/* Left panel options */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-bold text-gray-400 font-sans">
              Lokasi Penambahan Kata Kunci:
            </span>
            <label className="flex items-center gap-2 text-xs font-sans font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={applyToEn}
                onChange={(e) => setApplyToEn(e.target.checked)}
                className="accent-blue-500 w-4 h-4 rounded cursor-pointer"
              />
              English Keywords
            </label>
            <label className="flex items-center gap-2 text-xs font-sans font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={applyToId}
                onChange={(e) => setApplyToId(e.target.checked)}
                className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
              />
              Indonesian (Kata Kunci)
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className={cn(
                "flex-grow sm:flex-grow-0 py-2.5 px-5 font-bold rounded-xl transition-all border text-sm active:scale-95 cursor-pointer font-sans",
                theme === "dark"
                  ? "bg-white/5 hover:bg-white/10 border-transparent text-white"
                  : "bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700",
              )}
            >
              Batal
            </button>
            <button
              onClick={handleApply}
              disabled={getGlobalMatchCount() === 0}
              className="flex-grow sm:flex-grow-0 py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm active:scale-95 shadow-md shadow-blue-600/25 transition-all disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer font-sans flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Terapkan Sugest({getGlobalMatchCount()})
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
