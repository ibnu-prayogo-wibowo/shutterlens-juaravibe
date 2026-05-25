import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  X,
  Trash2,
  Edit3,
  Download,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Camera,
  FolderOpen,
  Settings,
  Sun,
  Moon,
  FileText,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Info,
  Eye,
  Tag,
  Copy,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Papa from "papaparse";
import { AuthButton } from "./Auth";
import { PhotoMetadata } from "../types";
import { cn } from "../lib/utils";
import { auth, getCachedAccessToken } from "../lib/firebase";
import { SettingsModal } from "./SettingsModal";
import { RenameModal } from "./RenameModal";
import { AutoTaggingModal } from "./AutoTaggingModal";

interface InfoLimit {
  status: "optimal" | "warning" | "critical";
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  label: string;
  message: string;
  currentLength: number;
  recommendation: string;
}

function checkFieldLength(
  text: string,
  type: "title" | "description",
  lang: "en" | "ind",
): InfoLimit {
  const len = text ? text.trim().length : 0;

  if (type === "title") {
    if (len === 0) {
      return {
        status: "critical",
        color: "bg-red-500/80",
        textColor: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/20",
        label: "Kosong",
        message: "Judul metadata stock photography tidak boleh dikosongkan.",
        currentLength: len,
        recommendation:
          "Masukkan setidaknya 3 s.d 10 kata deskriptif yang menggambarkan subjek.",
      };
    } else if (len < 15) {
      return {
        status: "warning",
        color: "bg-yellow-500/80",
        textColor: "text-yellow-400",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/20",
        label: "Terlalu Singkat (Non-SEO)",
        message: `Hanya ${len} karakter. Agensi premium (Shutterstock/Adobe Stock) memerlukan deskripsi mendetail agar foto terindeks pembeli potensial.`,
        currentLength: len,
        recommendation:
          "Tambahkan deskripsi kata benda utama, aksi, lokasi, atau warna dominan.",
      };
    } else if (len > 120 && len <= 200) {
      return {
        status: "optimal",
        color: "bg-emerald-500/80",
        textColor: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
        label: "Rinci & Kompatibel",
        message: `${len} karakter. Cukup informatif dan sangat diterima baik oleh sistem agensi.`,
        currentLength: len,
        recommendation:
          "Pastikan 3-5 kata kunci/subjek paling krusial diletakkan di bagian depan.",
      };
    } else if (len > 200) {
      return {
        status: "critical",
        color: "bg-red-500/80",
        textColor: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/20",
        label: "Melebihi Batas Agensi",
        message: `${len} karakter. Melebihi batas aman indeks pencarian stock photography (maksimal 200 karakter).`,
        currentLength: len,
        recommendation:
          "Pangkas menjadi di bawah 200 karakter agar metadata foto Anda tidak ditolak otomatis.",
      };
    } else {
      return {
        status: "optimal",
        color: "bg-emerald-500/80",
        textColor: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
        label: "Panjang SEO Sempurna",
        message: `${len} karakter. Rentang ukuran ternyaman untuk optimasi pencarian pembeli stock.`,
        currentLength: len,
        recommendation:
          lang === "ind"
            ? "Catatan: Sebagian besar platform makrostok menyukai pemasaran metadata dalam bahasa Inggris (EN)."
            : "Sempurna! Siap diunggah ke Adobe Stock, Shutterstock, dll.",
      };
    }
  } else {
    if (len === 0) {
      return {
        status: "critical",
        color: "bg-red-500/80",
        textColor: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/20",
        label: "Kosong",
        message: "Deskripsi tidak boleh kosong.",
        currentLength: len,
        recommendation:
          "Deskripsi kaya kata kunci membantu calon pembeli visual melisensikan aset Anda.",
      };
    } else if (len < 50) {
      return {
        status: "warning",
        color: "bg-yellow-500/80",
        textColor: "text-yellow-400",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/20",
        label: "Kurang Mendalam",
        message: `Hanya ${len} karakter. Berikan narasi yang kaya, minimal 50 karakter untuk kepuasan pembeli Getty atau Alamy.`,
        currentLength: len,
        recommendation:
          "Jelaskan model (umur/aktivitas), tipe pencahayaan (sunny day, studio light), dan emosi suasana.",
      };
    } else if (len > 250 && len <= 400) {
      return {
        status: "optimal",
        color: "bg-emerald-500/80",
        textColor: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
        label: "Ekstra Rinci & Kompatibel",
        message: `${len} karakter. Sangat bagus untuk pencarian kata kunci yang canggih.`,
        currentLength: len,
        recommendation:
          "Hindari pencantuman kata kunci yang berulang-ulang (keyword stuffing).",
      };
    } else if (len > 400) {
      return {
        status: "critical",
        color: "bg-red-500/80",
        textColor: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/20",
        label: "Terlalu Panjang (IPTC Limit)",
        message: `${len} karakter. Melebihi batas standard transfer metadata IPTC/EXIF di berbagai agensi global.`,
        currentLength: len,
        recommendation: "Sederhanakan kalimat deskripsi di bawah 400 karakter.",
      };
    } else {
      return {
        status: "optimal",
        color: "bg-emerald-500/80",
        textColor: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
        label: "Panjang Deskripsi Ideal",
        message: `${len} karakter. Ukuran optimal untuk menceritakan kisah di balik lensa secara global.`,
        currentLength: len,
        recommendation:
          lang === "ind"
            ? "Platform terkemuka umumnya menerima entri deskripsi bahasa Inggris demi keterjangkauan komersial."
            : "Deskripsi seimbang yang memicu skor SEO penelusur tinggi.",
      };
    }
  }
}

interface MetadataValidatorProps {
  value: string;
  type: "title" | "description";
  lang: "en" | "ind";
}

function MetadataValidator({ value, type, lang }: MetadataValidatorProps) {
  const info = checkFieldLength(value, type, lang);
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="mt-1 flex flex-col gap-1 select-none">
      <div className="flex items-center justify-between text-[11px] font-sans">
        <div className="flex items-center gap-1.5">
          <span
            className={cn("inline-block w-2 h-2 rounded-full", info.color)}
          />
          <span
            className={cn(
              "font-bold tracking-wide uppercase text-[9px]",
              info.textColor,
            )}
          >
            {info.label}
          </span>
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip((prev) => !prev)}
            className="text-gray-500 hover:text-gray-300 transition-colors cursor-help p-0.5"
            title="Klik/Sorot untuk detail panduan metadata agensi"
          >
            <Info size={11} />
          </button>
        </div>
        <span
          className={cn(
            "font-mono font-medium",
            info.status === "critical" ? "text-red-400" : "text-gray-500",
          )}
        >
          {info.currentLength}
          {type === "title" ? "/200" : "/400"}
        </span>
      </div>

      <AnimatePresence>
        {(showTooltip ||
          info.status === "critical" ||
          info.status === "warning") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "px-3 py-2 rounded-xl border text-[10px] leading-relaxed transition-all mt-1",
              info.bgColor,
              info.borderColor,
              info.textColor,
            )}
          >
            <div className="font-bold mb-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide">
              {info.status === "critical" || info.status === "warning" ? (
                <AlertCircle size={11} className="shrink-0" />
              ) : (
                <CheckCircle2 size={11} className="shrink-0" />
              )}
              <span>SEO BEST PRACTICE:</span>
            </div>
            <p className="opacity-90">{info.message}</p>
            <p className="mt-1 font-semibold opacity-100 text-[9.5px]">
              Saran: {info.recommendation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const QUICK_CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Portrait": ["portrait", "people", "face", "human", "expression", "potret", "orang", "wajah", "manusia"],
  "Landscape": ["landscape", "scenic", "outdoors", "nature", "vista", "horizon", "lanskap", "pemandangan", "alam"],
  "Commercial": ["commercial", "product", "studio", "marketing", "advertisement", "komersial", "produk", "studio", "iklan"]
};

export function Dashboard() {
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("shutterlens_theme");
    return saved === "light" || saved === "dark" ? saved : "dark";
  });

  useEffect(() => {
    localStorage.setItem("shutterlens_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "done" | "pending" | "error">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "Portrait" | "Landscape" | "Commercial">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [pickerLoaded, setPickerLoaded] = useState(false);
  const [showDemoWarning, setShowDemoWarning] = useState(false);
  const [aiErrorReason, setAiErrorReason] = useState<string | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isAutoTaggingModalOpen, setIsAutoTaggingModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [bulkCategories, setBulkCategories] = useState<string[]>([]);
  const [bulkQuickCategories, setBulkQuickCategories] = useState<string[]>([]);
  const [bulkCustomNotes, setBulkCustomNotes] = useState("");
  const [bulkCustomKeywords, setBulkCustomKeywords] = useState("");
  const [analyzedModal, setAnalyzedModal] = useState<{
    isOpen: boolean;
    en: { title: string; description: string; keywords: string[] };
    ind: { title: string; description: string; keywords: string[] };
    imageUrl: string;
    allResults?: Array<{
      id: string;
      url: string;
      en: { title: string; description: string; keywords: string[] };
      ind: { title: string; description: string; keywords: string[] };
    }>;
    currentIndex?: number;
  }>({
    isOpen: false,
    en: { title: "", description: "", keywords: [] },
    ind: { title: "", description: "", keywords: [] },
    imageUrl: "",
    allResults: [],
    currentIndex: 0,
  });

  const currentId = analyzedModal.isOpen
    ? (analyzedModal.allResults?.[analyzedModal.currentIndex || 0]?.id || null)
    : null;

  useEffect(() => {
    if (analyzedModal.isOpen || isSettingsOpen || isRenameModalOpen || isCategoryModalOpen || isAutoTaggingModalOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [analyzedModal.isOpen, isSettingsOpen, isRenameModalOpen, isCategoryModalOpen, isAutoTaggingModalOpen]);

  const openPhotoModal = (photo: any) => {
    if (photo.status !== "done") return;
    const donePhotos = photos.filter((p) => p.status === "done");
    const currentIndex = donePhotos.findIndex((p) => p.id === photo.id);
    setAnalyzedModal({
      isOpen: true,
      en: photo.englishMetadata,
      ind: photo.indonesianMetadata,
      imageUrl: photo.url,
      allResults: donePhotos.map((item) => ({
        id: item.id,
        url: item.url,
        en: item.englishMetadata,
        ind: item.indonesianMetadata,
      })),
      currentIndex: currentIndex !== -1 ? currentIndex : 0,
    });
  };

  const [isExportingDoc, setIsExportingDoc] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [exportedDocUrl, setExportedDocUrl] = useState<string | null>(null);
  const [isDocSuccessModalOpen, setIsDocSuccessModalOpen] = useState(false);

  useEffect(() => {
    // Inject the GAPI script dynamically if not present
    if (document.getElementById("gapi-script")) {
      setGapiLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "gapi-script";
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGapiLoaded(true);
      const gapi = (window as any).gapi;
      if (gapi) {
        gapi.load("picker", {
          callback: () => {
            setPickerLoaded(true);
          },
        });
      }
    };
    script.onerror = (err) => {
      console.error("Failed to load Google API Client (GAPI)", err);
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter to trigger analysis
      if (e.ctrlKey && e.key === "Enter") {
        const pendingPhotos = photos.filter(
          (p) =>
            (p.status === "pending" || p.status === "error") && p.url !== "",
        );
        if (pendingPhotos.length > 0) analyzeAll();
      }

      // Delete to remove selected photos
      if (e.key === "Delete" && selectedIds.length > 0) {
        handleBulkAction("delete");
      }

      // Esc to close active modals
      if (e.key === "Escape") {
        if (analyzedModal.isOpen)
          setAnalyzedModal((prev) => ({ ...prev, isOpen: false }));
        if (isSettingsOpen) setIsSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photos, selectedIds, analyzedModal.isOpen, isSettingsOpen]);

  const handleGooglePicker = async () => {
    let token = getCachedAccessToken();
    if (!token) {
      try {
        const { signInWithPopup, GoogleAuthProvider } =
          await import("firebase/auth");
        const { auth, setCachedAccessToken } = await import("../lib/firebase");

        // Isolate the Google Drive readonly and email scope into picker-specific provider
        const driveProvider = new GoogleAuthProvider();
        driveProvider.addScope("profile");
        driveProvider.addScope("email");
        driveProvider.addScope(
          "https://www.googleapis.com/auth/drive.readonly",
        );

        const result = await signInWithPopup(auth, driveProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          token = credential.accessToken;
          setCachedAccessToken(token);
        }
      } catch (err) {
        console.error("Failed to authenticate with Google Drive", err);
        alert("Gagal menghubungkan Google Drive. Harap coba lagi.");
        return;
      }
    }

    if (!token) {
      alert("Harap login menggunakan akun Google Anda terlebih dahulu.");
      return;
    }

    const gapi = (window as any).gapi;
    const google = (window as any).google;

    if (!gapi || !google) {
      alert("Google API sedang memuat, harap tunggu sebentar...");
      return;
    }

    if (!pickerLoaded) {
      gapi.load("picker", {
        callback: () => {
          setPickerLoaded(true);
          showPicker(token!);
        },
      });
    } else {
      showPicker(token);
    }
  };

  const showPicker = (token: string) => {
    const google = (window as any).google;
    if (!google || !google.picker) {
      console.error("Google Picker is not available");
      return;
    }

    const developerKey = "AIzaSyCGiV9xZXQ16GWh8iHEv636P1oTMREXO9A";
    const clientId =
      "1080375327187-0irdrsga6aua39ms218b8rcunffmmucm.apps.googleusercontent.com";
    const appId = "1080375327187"; // Project number from Google Client ID

    const view = new google.picker.View(google.picker.ViewId.DOCS);
    view.setMimeTypes("image/jpeg,image/png");

    const picker = new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(developerKey)
      .setAppId(appId)
      .setOrigin(window.location.origin)
      .setCallback((data: any) => pickerCallback(data, token))
      .build();

    picker.setVisible(true);
  };

  const pickerCallback = async (data: any, token: string) => {
    const google = (window as any).google;
    if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
      const documents = data[google.picker.Response.DOCUMENTS];
      if (!documents || documents.length === 0) return;

      const remainingCount = 100 - photos.length;
      const docsToProcess = documents.slice(0, remainingCount);

      const newPhotosToAppend: PhotoMetadata[] = [];

      for (const doc of docsToProcess) {
        const fileId = doc[google.picker.Document.ID];
        const name = doc[google.picker.Document.NAME] || "Google Drive Image";
        const extension = name.split(".").pop() || "jpg";
        const tempId = "drive-" + Math.random().toString(36).substr(2, 9);

        const placeholderPhoto: PhotoMetadata = {
          id: tempId,
          url: "", // initially empty, will be resolved as object URL below
          extension,
          englishMetadata: { title: name, description: "", keywords: [] },
          indonesianMetadata: { title: name, description: "", keywords: [] },
          status: "pending" as const,
        };
        newPhotosToAppend.push(placeholderPhoto);

        // Fetch image content from Google Drive & convert to local blob object URL
        fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then((res) => {
            if (!res.ok) throw new Error("Gagal mengunduh gambar");
            return res.blob();
          })
          .then((blob) => {
            const objectUrl = URL.createObjectURL(blob);
            setPhotos((prev) =>
              prev.map((p) => (p.id === tempId ? { ...p, url: objectUrl } : p)),
            );
          })
          .catch((err) => {
            console.error("Error downloading Google Drive file content", err);
            setPhotos((prev) =>
              prev.map((p) =>
                p.id === tempId
                  ? { ...p, status: "error", error: "Unduh file gagal" }
                  : p,
              ),
            );
          });
      }

      setPhotos((prev) => [...prev, ...newPhotosToAppend]);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Limit to 100 total
      const remainingCount = 100 - photos.length;
      const filesToProcess = acceptedFiles.slice(0, remainingCount);

      const newPhotos = filesToProcess.map((file) => {
        const url = URL.createObjectURL(file);
        return {
          id: Math.random().toString(36).substr(2, 9),
          url,
          extension: file.name.split(".").pop() || "",
          englishMetadata: { title: file.name, description: "", keywords: [] },
          indonesianMetadata: {
            title: file.name,
            description: "",
            keywords: [],
          },
          status: "pending" as const,
        };
      });

      setPhotos((prev) => [...prev, ...newPhotos]);
    },
    [photos],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png"] },
    multiple: true,
  } as any);

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.url);
      return prev.filter((p) => (p.id === id ? false : true));
    });
  };

  const clearAll = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
  };

  const analyzeAll = async () => {
    const pendingPhotos = photos.filter(
      (p) => (p.status === "pending" || p.status === "error") && p.url !== "",
    );
    if (pendingPhotos.length === 0) return;

    setIsProcessing(true);
    setAnalysisError(null);
    setAiErrorReason(null);

    try {
      // Process in batches of 5 to avoid overloading
      const BATCH_SIZE = 5;
      for (let i = 0; i < pendingPhotos.length; i += BATCH_SIZE) {
        const batch = pendingPhotos.slice(i, i + BATCH_SIZE);

        // Update status to processing, clear previous errors on these structures
        setPhotos((prev) =>
          prev.map((p) =>
            batch.find((bp) => bp.id === p.id)
              ? { ...p, status: "processing", error: undefined }
              : p,
          ),
        );

        // Get base64s with safe error-handling inside image reading
        const base64Batch = await Promise.all(
          batch.map(async (p) => {
            try {
              const res = await fetch(p.url);
              if (!res.ok) throw new Error(`Status HTTP ${res.status}`);
              const blob = await res.blob();
              return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () =>
                  reject(new Error("File conversion aborted"));
                reader.readAsDataURL(blob);
              });
            } catch (fileErr: any) {
              throw new Error(
                `Gagal membaca berkas "${p.title}": ${fileErr.message || "Kesalahan akses file"}`,
              );
            }
          }),
        );

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        const activeToken = getCachedAccessToken();
        if (activeToken) {
          headers["Authorization"] = `Bearer ${activeToken}`;
        }

        const apiKey = localStorage.getItem("GEMINI_API_KEY");
        if (apiKey) {
          headers["X-Gemini-API-Key"] = apiKey;
        }

        const response = await fetch("/api/analyze", {
          method: "POST",
          headers,
          body: JSON.stringify({
            images: base64Batch,
            titles: batch.map((bp) => bp.title),
          }),
        });

        if (!response.ok) {
          let errMsg = `Server returned status text: ${response.statusText || response.status}`;
          try {
            const data = await response.json();
            if (data && data.error) {
              errMsg = data.error;
            }
          } catch (_) {}
          throw new Error(`Gagal menganalisis gambar: ${errMsg}`);
        }

        const {
          results,
          demoMode,
          aiErrorReason: serverErrorReason,
        } = await response.json();

        if (!results || !Array.isArray(results)) {
          throw new Error(
            "Format respons kecerdasan buatan menyimpang dari skema baku.",
          );
        }

        if (demoMode) {
          setShowDemoWarning(true);
          if (serverErrorReason) {
            setAiErrorReason(serverErrorReason);
          }
        }

        setPhotos((prev) =>
          prev.map((p) => {
            const batchIndex = batch.findIndex((bp) => bp.id === p.id);
            if (batchIndex !== -1) {
              const res = results[batchIndex];
              const isSuccess =
                res && res.en?.title && res.en.title !== "Analysis failed";

              if (isSuccess) {
                const currentCount = parseInt(
                  localStorage.getItem("processed_photos_count") || "0",
                  10,
                );
                localStorage.setItem(
                  "processed_photos_count",
                  (currentCount + 1).toString(),
                );

                // Add title to history
                const history = JSON.parse(
                  localStorage.getItem("metadata_history_titles") || "[]",
                );
                const updatedHistory = [res.en.title, ...history].slice(0, 50);
                localStorage.setItem(
                  "metadata_history_titles",
                  JSON.stringify(updatedHistory),
                );
              }

              return {
                ...p,
                englishMetadata: isSuccess ? res.en : p.englishMetadata,
                indonesianMetadata: isSuccess ? res.id : p.indonesianMetadata,
                status: isSuccess ? "done" : "error",
                error: isSuccess
                  ? undefined
                  : "Analisis kecerdasan buatan gagal",
                demoMode: res?.demoMode || false,
              };
            }
            return p;
          }),
        );

        // Instantly construct and launch newly analyzed results in the modal
        const newlyProcessedItems = batch
          .map((bp, bIdx) => {
            const res = results[bIdx];
            const isSuccess =
              res && res.en?.title && res.en.title !== "Analysis failed";
            if (isSuccess) {
              return {
                id: bp.id,
                url: bp.url,
                englishMetadata: res.en,
                indonesianMetadata: res.id,
              };
            }
            return null;
          })
          .filter(Boolean) as Array<{
          id: string;
          url: string;
          englishMetadata: {
            title: string;
            description: string;
            keywords: string[];
          };
          indonesianMetadata: {
            title: string;
            description: string;
            keywords: string[];
          };
        }>;

        if (newlyProcessedItems.length > 0) {
          console.log(
            "Triggering modal popup for successfully analyzed items:",
            newlyProcessedItems,
          );

          setAnalyzedModal({
            isOpen: true,
            en: newlyProcessedItems[0].englishMetadata,
            ind: newlyProcessedItems[0].indonesianMetadata,
            imageUrl: newlyProcessedItems[0].url,
            allResults: newlyProcessedItems.map((item) => ({
              id: item.id,
              url: item.url,
              en: item.englishMetadata,
              ind: item.indonesianMetadata,
            })),
            currentIndex: 0,
          });
        }
      }
    } catch (error: any) {
      console.error("Processing failed", error);
      const userMessage =
        error.message ||
        "Terjadi kesalahan sambungan atau batasan kuota API selama analisis. Harap coba lagi.";
      setAnalysisError(userMessage);

      // Reset any stuck elements in progress to 'error' status with details
      setPhotos((prev) =>
        prev.map((p) =>
          p.status === "processing"
            ? { ...p, status: "error", error: "Analisis gagal berkas" }
            : p,
        ),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const exportData = (format: "csv" | "xml" | "json" | "xml-adobe") => {
    const data = photos.map((p) => ({
      Filename: p.englishMetadata.title + ".jpg",
      Title: p.englishMetadata.title,
      Keywords: p.englishMetadata.keywords.join(", "),
      Description: p.englishMetadata.description || p.englishMetadata.title,
    }));

    let content = "";
    let mimeType = "";
    let extension = "";

    if (format === "csv") {
      content = Papa.unparse(data);
      mimeType = "text/csv";
      extension = "csv";
    } else if (format === "json") {
      content = JSON.stringify(data, null, 2);
      mimeType = "application/json";
      extension = "json";
    } else if (format === "xml") {
      content =
        '<?xml version="1.0" encoding="UTF-8"?>\n<metadata>\n' +
        data
          .map(
            (item) =>
              `  <item>\n    <filename>${item.Filename}</filename>\n    <title>${item.Title}</title>\n    <keywords>${item.Keywords}</keywords>\n    <description>${item.Description}</description>\n  </item>`,
          )
          .join("\n") +
        "\n</metadata>";
      mimeType = "application/xml";
      extension = "xml";
    } else if (format === "xml-adobe") {
      const donePhotos = photos.filter((p) => p.status === "done");
      const xmlItems = donePhotos.map((p) => {
        const rawTitle = p.englishMetadata.title || "untitled";
        const hasExt = /\.(jpg|jpeg|png|gif|webp|tiff|bmp)$/i.test(rawTitle);
        const filename = hasExt ? rawTitle : `${rawTitle}.${p.extension || "jpg"}`;
        
        const xmlEscape = (str: string) => {
          return str.replace(/[<>&'"]/g, (c) => {
            switch (c) {
              case "<": return "&lt;";
              case ">": return "&gt;";
              case "&": return "&amp;";
              case "'": return "&apos;";
              case '"': return "&quot;";
              default: return c;
            }
          });
        };

        const title = xmlEscape((p.englishMetadata.title || "Untitled Image").substring(0, 120));
        const desc = xmlEscape(p.englishMetadata.description || p.englishMetadata.title || "No description");
        
        const cleanedKeywords = (p.englishMetadata.keywords || [])
          .map((k) => k.replace(/#/g, "").trim().toLowerCase())
          .filter((k, idx, self) => k && self.indexOf(k) === idx)
          .slice(0, 50)
          .join(", ");

        const categoryList = (p.categories || []).join(", ") || "Other";

        return `  <Asset>
    <Filename>${xmlEscape(filename)}</Filename>
    <Title>${title}</Title>
    <Description>${desc}</Description>
    <Keywords>${xmlEscape(cleanedKeywords)}</Keywords>
    <Category>${xmlEscape(categoryList)}</Category>
  </Asset>`;
      }).join("\n");

      content = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Adobe Stock Contributor XML Metadata Import Document -->
<!-- Generated by ShutterLens on ${new Date().toISOString()} -->
<AdobeStockMetadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
${xmlItems}
</AdobeStockMetadata>`;
      mimeType = "application/xml";
      extension = "xml";
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `shutterlens-metadata-${new Date().toISOString().split("T")[0]}.${extension}`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPdf = async () => {
    const donePhotos = photos.filter((p) => p.status === "done");
    if (donePhotos.length === 0) {
      alert("Tidak ada foto dengan status selesai (done) untuk diekspor ke PDF.");
      return;
    }

    setIsExportingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF("p", "mm", "a4");

      // Helper to convert browser Image URL to Base64 via Canvas
      const convertUrlToBase64 = (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              try {
                // Compress to JPEG with 0.8 quality
                resolve(canvas.toDataURL("image/jpeg", 0.8));
              } catch (e) {
                reject(e);
              }
            } else {
              reject(new Error("Unable to create canvas context"));
            }
          };
          img.onerror = () => {
            reject(new Error("Failed to download image " + url));
          };
          img.src = url;
        });
      };

      for (let index = 0; index < donePhotos.length; index++) {
        const photo = donePhotos[index];
        if (index > 0) {
          doc.addPage();
        }

        // 1. Sleek Top Ribbon Banner
        doc.setFillColor(15, 23, 42); // slate-900 / dark graphite
        doc.rect(0, 0, 210, 16, "F");
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text("SHUTTERLENS - METADATA REPORT", 15, 10.5);

        // Date of Export right-aligned
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        const dateStr = new Date().toLocaleDateString("id-ID", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        doc.text(`Edisi: ${dateStr}`, 155, 10.5);

        // 2. Center Framed Photograph Area
        let hasImage = false;
        if (photo.url) {
          try {
            const base64Data = await convertUrlToBase64(photo.url);
            // Height = 68, Width = 110 -> Aspect ratio fits beautifully
            doc.addImage(base64Data, "JPEG", 50, 25, 110, 68);

            // Sleek Border around the photo
            doc.setDrawColor(71, 85, 105); // slate-600
            doc.setLineWidth(0.4);
            doc.rect(49.8, 24.8, 110.4, 68.4, "S");
            hasImage = true;
          } catch (e) {
            console.warn("CORS or Load blocker triggered fallback for image preview", e);
          }
        }

        if (!hasImage) {
          // Elegant placeholder rectangle
          doc.setFillColor(248, 250, 252); // slate-50
          doc.rect(50, 25, 110, 68, "F");
          doc.setDrawColor(226, 232, 240); // slate-200
          doc.rect(49.8, 24.8, 110.4, 68.4, "S");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(148, 163, 184); // slate-400
          doc.text("PREVIEW GAMBAR", 89, 54);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(156, 163, 175);
          doc.text("(Direct or Cross-Origin Protected Access)", 78, 60);
        }

        // Horizontal Separator
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.4);
        doc.line(15, 101, 195, 101);

        // Vertical split line separating EN and ID contents
        doc.line(105, 107, 105, 270);

        const leftColX = 15;
        const rightColX = 110;
        const colWidth = 83; // slightly constrained to avoid overlapping split line

        // --- Column 1: ENGLISH METADATA ---
        let yEn = 107;
        
        // Headers with colored badge background
        doc.setFillColor(239, 246, 255); // light blue-50
        doc.rect(leftColX, yEn, colWidth, 7, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(29, 78, 216); // blue-700
        doc.text("ENGLISH METADATA (EN)", leftColX + 3, yEn + 4.8);

        yEn += 13;

        // Title EN
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42); // slate-900
        const titleEnText = photo.englishMetadata.title || "Untitled Photograph";
        const splitTitleEn = doc.splitTextToSize(titleEnText, colWidth);
        doc.text(splitTitleEn, leftColX, yEn);
        yEn += splitTitleEn.length * 5 + 3;

        // Label Description
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text("DESCRIPTION / DESKRIPSI:", leftColX, yEn);
        yEn += 4.5;

        // Desc EN
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85); // slate-700
        const descEnText = photo.englishMetadata.description || "No description generated.";
        const splitDescEn = doc.splitTextToSize(descEnText, colWidth);
        doc.text(splitDescEn, leftColX, yEn);
        yEn += splitDescEn.length * 4.2 + 4;

        // Label Keywords
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text("KEYWORDS / KATA KUNCI:", leftColX, yEn);
        yEn += 4.5;

        // Keywords EN
        doc.setFont("helvetica", "oblique");
        doc.setFontSize(8);
        doc.setTextColor(37, 99, 235); // blue-600
        const keywordsEnText =
          (photo.englishMetadata.keywords || []).map((k) => `#${k}`).join(", ") || "-";
        const splitTagsEn = doc.splitTextToSize(keywordsEnText, colWidth);
        doc.text(splitTagsEn, leftColX, yEn);


        // --- Column 2: INDONESIAN METADATA ---
        let yId = 107;

        // Headers with colored badge background
        doc.setFillColor(240, 253, 244); // light green-50
        doc.rect(rightColX, yId, colWidth, 7, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(21, 128, 61); // green-700
        doc.text("METADATA INDONESIA (ID)", rightColX + 3, yId + 4.8);

        yId += 13;

        // Title ID
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42); // slate-900
        const titleIdText = photo.indonesianMetadata.title || "Foto Tanpa Judul";
        const splitTitleId = doc.splitTextToSize(titleIdText, colWidth);
        doc.text(splitTitleId, rightColX, yId);
        yId += splitTitleId.length * 5 + 3;

        // Label Description
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text("DESCRIPTION / DESKRIPSI:", rightColX, yId);
        yId += 4.5;

        // Desc ID
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85); // slate-700
        const descIdText = photo.indonesianMetadata.description || "Tidak ada deskripsi yang dibuat.";
        const splitDescId = doc.splitTextToSize(descIdText, colWidth);
        doc.text(splitDescId, rightColX, yId);
        yId += splitDescId.length * 4.2 + 4;

        // Label Keywords
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text("KEYWORDS / KATA KUNCI:", rightColX, yId);
        yId += 4.5;

        // Keywords ID
        doc.setFont("helvetica", "oblique");
        doc.setFontSize(8);
        doc.setTextColor(22, 163, 74); // green-600
        const keywordsIdText =
          (photo.indonesianMetadata.keywords || []).map((k) => `#${k}`).join(", ") || "-";
        const splitTagsId = doc.splitTextToSize(keywordsIdText, colWidth);
        doc.text(splitTagsId, rightColX, yId);

        // 3. Document Running Footer
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.4);
        doc.line(15, 280, 195, 280);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`Katalog ShutterLens | Halaman ${index + 1} dari ${donePhotos.length}`, 15, 285.5);
        doc.text("Mempersembahkan Katalog Metadata AI Presisi", 138, 285.5);
      }

      // Download file with styled date stamp
      const reportDate = new Date().toISOString().split("T")[0];
      doc.save(`shutterlens-catalog-${reportDate}.pdf`);
    } catch (error: any) {
      console.error("Failed to generate PDF Catalog", error);
      alert("Ekspor PDF mengalami gangguan: " + (error.message || error));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const exportToGoogleDoc = async () => {
    const donePhotos = photos.filter((p) => p.status === "done");
    if (donePhotos.length === 0) {
      alert(
        "Tidak ada foto dengan status selesai (done) untuk diekspor ke Google Docs.",
      );
      return;
    }

    setIsExportingDoc(true);
    let token = getCachedAccessToken();

    if (!token) {
      try {
        const { signInWithPopup, GoogleAuthProvider } =
          await import("firebase/auth");
        const { auth, setCachedAccessToken } = await import("../lib/firebase");

        const docsProvider = new GoogleAuthProvider();
        docsProvider.addScope("profile");
        docsProvider.addScope("email");
        docsProvider.addScope("https://www.googleapis.com/auth/docs");
        docsProvider.addScope("https://www.googleapis.com/auth/documents");

        const result = await signInWithPopup(auth, docsProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          token = credential.accessToken;
          setCachedAccessToken(token);
        }
      } catch (err) {
        console.error("Failed to authenticate with Google Docs", err);
        alert(
          "Gagal menghubungkan Google Docs. Hubungkan kembali akun Google Anda.",
        );
        setIsExportingDoc(false);
        return;
      }
    }

    if (!token) {
      alert("Harap login menggunakan akun Google Anda terlebih dahulu.");
      setIsExportingDoc(false);
      return;
    }

    try {
      // 1. Create a document REST call
      const createResponse = await fetch(
        "https://docs.googleapis.com/v1/documents",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: `ShutterLens Metadata Export - ${new Date().toISOString().split("T")[0]}`,
          }),
        },
      );

      if (!createResponse.ok) {
        throw new Error("Gagal membuat dokumen Google Docs baru.");
      }

      const docData = await createResponse.json();
      const documentId = docData.documentId;
      const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

      // 2. Prepare content
      let docText = `SHUTTERLENS METADATA EXPORT\n`;
      docText += `Export Date: ${new Date().toLocaleString("id-ID")}\n`;
      docText += `Total Photos Exported: ${donePhotos.length}\n`;
      docText += `======================================================================\n\n`;

      donePhotos.forEach((photo, idx) => {
        docText += `${idx + 1}. FILE: ${photo.englishMetadata.title || "Untitled"}.${photo.extension || "jpg"}\n`;
        docText += `----------------------------------------------------------------------\n`;
        docText += `[ENGLISH METADATA]\n`;
        docText += `Title: ${photo.englishMetadata.title || "-"}\n`;
        docText += `Description: ${photo.englishMetadata.description || "-"}\n`;
        docText += `Keywords: ${(photo.englishMetadata.keywords || []).join(", ") || "-"}\n\n`;

        docText += `[METADATA BAHASA INDONESIA]\n`;
        docText += `Title: ${photo.indonesianMetadata.title || "-"}\n`;
        docText += `Description: ${photo.indonesianMetadata.description || "-"}\n`;
        docText += `Keywords: ${(photo.indonesianMetadata.keywords || []).join(", ") || "-"}\n`;
        docText += `======================================================================\n\n`;
      });

      // 3. Batch Update REST call to insert the text
      const updateResponse = await fetch(
        `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requests: [
              {
                insertText: {
                  text: docText,
                  location: {
                    index: 1,
                  },
                },
              },
            ],
          }),
        },
      );

      if (!updateResponse.ok) {
        throw new Error("Gagal menulis metadata ke dokumen Google Docs.");
      }

      // Success! Open Success Modal
      setExportedDocUrl(documentUrl);
      setIsDocSuccessModalOpen(true);
    } catch (error: any) {
      console.error("Google Docs Export Failed", error);
      alert(`Ekspor Google Docs gagal: ${error.message || "Unknown error"}`);
    } finally {
      setIsExportingDoc(false);
    }
  };

  const updatePhoto = (id: string, updates: Partial<PhotoMetadata>) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    );
  };

  const handleBulkAction = (action: string) => {
    if (selectedIds.length === 0) return;
    if (action === "delete") {
      selectedIds.forEach(removePhoto);
      setSelectedIds([]);
    } else if (action === "reanalyze") {
      setPhotos((prev) =>
        prev.map((p) =>
          selectedIds.includes(p.id) ? { ...p, status: "pending" } : p,
        ),
      );
      setSelectedIds([]);
      // Re-trigger analysis for these
      analyzeAll();
    } else if (action === "rename") {
      setIsRenameModalOpen(true);
    } else if (action === "category") {
      setIsCategoryModalOpen(true);
    } else if (action === "autotag") {
      setIsAutoTaggingModalOpen(true);
    }
  };

  const handleRename = (config: {
    prefix: string;
    suffix: string;
    useSequence: boolean;
    sequenceBase: string;
    sequenceStart: number;
  }) => {
    let counter = config.sequenceStart;
    setPhotos((prev) =>
      prev.map((p) => {
        if (selectedIds.includes(p.id)) {
          let newTitle;
          if (config.useSequence) {
            const formattedCounter = counter.toString().padStart(3, "0");
            newTitle = `${config.sequenceBase}${formattedCounter}`;
            counter++;
          } else {
            newTitle = `${config.prefix}${p.englishMetadata.title}${config.suffix}`;
          }
          return {
            ...p,
            englishMetadata: { ...p.englishMetadata, title: newTitle },
          };
        }
        return p;
      }),
    );
    setIsRenameModalOpen(false);
    setSelectedIds([]);
  };

  const handleApplyAutoTags = (results: { id: string; enTags: string[]; idTags: string[] }[]) => {
    setPhotos((prev) =>
      prev.map((photo) => {
        const found = results.find((r) => r.id === photo.id);
        if (found) {
          const currentEnKeywords = photo.englishMetadata?.keywords || [];
          const updatedEnKeywords = Array.from(
            new Set([...currentEnKeywords, ...found.enTags])
          );

          const currentIdKeywords = photo.indonesianMetadata?.keywords || [];
          const updatedIdKeywords = Array.from(
            new Set([...currentIdKeywords, ...found.idTags])
          );

          return {
            ...photo,
            englishMetadata: {
              ...(photo.englishMetadata || { title: "", description: "", keywords: [] }),
              keywords: updatedEnKeywords,
            },
            indonesianMetadata: {
              ...(photo.indonesianMetadata || { title: "", description: "", keywords: [] }),
              keywords: updatedIdKeywords,
            },
          };
        }
        return photo;
      })
    );
    setIsAutoTaggingModalOpen(false);
    setSelectedIds([]);
  };

  const handleToggleQuickCategory = (cat: string) => {
    const keywordsToHandle = QUICK_CATEGORY_KEYWORDS[cat] || [];
    const isSelected = bulkQuickCategories.includes(cat);
    
    // Update toggle state
    let newQuickCats = [...bulkQuickCategories];
    if (isSelected) {
      newQuickCats = newQuickCats.filter((c) => c !== cat);
    } else {
      newQuickCats.push(cat);
    }
    setBulkQuickCategories(newQuickCats);

    // Update bulkCustomKeywords input
    let currentKws = bulkCustomKeywords
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (isSelected) {
      // Remove those keywords if toggled off
      currentKws = currentKws.filter((kw) => !keywordsToHandle.includes(kw.toLowerCase()));
    } else {
      // Add those keywords if toggled on
      keywordsToHandle.forEach((kw) => {
        if (!currentKws.map(k => k.toLowerCase()).includes(kw.toLowerCase())) {
          currentKws.push(kw);
        }
      });
    }
    setBulkCustomKeywords(currentKws.join(", "));
  };

  const handleBulkCategoryUpdate = () => {
    if (selectedIds.length === 0) {
      alert("Pilih minimal 1 foto untuk mengatur kategori.");
      return;
    }

    setPhotos((prev) =>
      prev.map((p) => {
        if (selectedIds.includes(p.id)) {
          const updatedCategories = [...bulkCategories];
          const updatedCustomNotes = bulkCustomNotes.trim();

          const categoryEnMapping: { [key: string]: string } = {
            "Alam": "nature",
            "Budaya": "culture",
            "Arsitektur": "architecture",
            "Fauna & Flora": "flora_fauna",
            "Portrait": "portrait",
            "Landscape": "landscape",
            "Commercial": "commercial",
            "Lainnya": "other"
          };

          const newEnKeywords = [...p.englishMetadata.keywords];
          const newIdKeywords = [...p.indonesianMetadata.keywords];

          updatedCategories.forEach((cat) => {
            const catEn = categoryEnMapping[cat] || cat.toLowerCase();
            const catId = cat.toLowerCase();

            if (!newEnKeywords.includes(catEn)) {
              newEnKeywords.push(catEn);
            }
            if (!newIdKeywords.includes(catId)) {
              newIdKeywords.push(catId);
            }
          });

          if (bulkCustomKeywords.trim()) {
            const addedKws = bulkCustomKeywords
              .split(",")
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean);

            addedKws.forEach((kw) => {
              if (!newEnKeywords.includes(kw)) {
                newEnKeywords.push(kw);
              }
              if (!newIdKeywords.includes(kw)) {
                newIdKeywords.push(kw);
              }
            });
          }

          let updatedEnDesc = p.englishMetadata.description || "";
          let updatedIdDesc = p.indonesianMetadata.description || "";

          if (updatedCustomNotes) {
            const customNotesIdPrefix = `[Deskripsi Singkat: ${updatedCustomNotes}]`;
            const customNotesEnPrefix = `[Short Description: ${updatedCustomNotes}]`;

            if (!updatedIdDesc.includes(customNotesIdPrefix)) {
              updatedIdDesc = updatedIdDesc
                ? `${customNotesIdPrefix}\n${updatedIdDesc}`
                : customNotesIdPrefix;
            }
            if (!updatedEnDesc.includes(customNotesEnPrefix)) {
              updatedEnDesc = updatedEnDesc
                ? `${customNotesEnPrefix}\n${updatedEnDesc}`
                : customNotesEnPrefix;
            }
          }

          return {
            ...p,
            categories: updatedCategories,
            customNotes: updatedCustomNotes,
            englishMetadata: {
              ...p.englishMetadata,
              keywords: newEnKeywords,
              description: updatedEnDesc,
            },
            indonesianMetadata: {
              ...p.indonesianMetadata,
              keywords: newIdKeywords,
              description: updatedIdDesc,
            },
          };
        }
        return p;
      }),
    );

    // Reset state & close modal
    setIsCategoryModalOpen(false);
    setBulkCategories([]);
    setBulkQuickCategories([]);
    setBulkCustomNotes("");
    setBulkCustomKeywords("");
    setSelectedIds([]);
  };

  return (
    <div
      className={cn(
        "min-h-screen h-auto flex flex-col relative overflow-hidden transition-colors duration-300",
        theme === "dark"
          ? "bg-[#050505] text-gray-200"
          : "bg-white text-gray-800",
      )}
    >
      {isDocSuccessModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div
            className={cn(
              "border rounded-2xl p-6 w-full max-w-md shadow-2xl relative",
              theme === "dark"
                ? "bg-[#111111] border-white/10 text-white"
                : "bg-white border-gray-200 text-gray-900",
            )}
          >
            <button
              onClick={() => setIsDocSuccessModalOpen(false)}
              className={cn(
                "absolute right-4 top-4 p-1.5 rounded-lg transition-colors",
                theme === "dark"
                  ? "text-gray-400 hover:text-white hover:bg-white/5"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100",
              )}
            >
              <X size={16} />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="w-14 h-14 bg-blue-600/10 rounded-full flex items-center justify-center mb-4">
                <FileText size={28} className="text-blue-500 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold mb-2">
                Google Doc Berhasil Dibuat!
              </h2>
              <p
                className={cn(
                  "text-sm mb-6 leading-relaxed",
                  theme === "dark" ? "text-gray-400" : "text-gray-600",
                )}
              >
                Semua judul, deskripsi, dan kata kunci bahasa Inggris &amp;
                Indonesia hasil analisis foto Anda telah berhasil diekspor ke
                Google Docs.
              </p>

              <div className="w-full flex flex-col gap-3">
                <a
                  href={exportedDocUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                >
                  <FileText size={18} />
                  Buka Dokumen Google Docs
                </a>
                <button
                  onClick={() => setIsDocSuccessModalOpen(false)}
                  className={cn(
                    "w-full py-3 px-4 font-bold rounded-xl text-sm transition-all active:scale-95",
                    theme === "dark"
                      ? "bg-white/5 hover:bg-white/10 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700",
                  )}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <RenameModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        theme={theme}
        selectedPhotos={photos.filter((p) => selectedIds.includes(p.id))}
        onRename={handleRename}
      />

      <AutoTaggingModal
        isOpen={isAutoTaggingModalOpen}
        onClose={() => setIsAutoTaggingModalOpen(false)}
        theme={theme}
        selectedPhotos={photos.filter((p) => selectedIds.includes(p.id))}
        onApplyTags={handleApplyAutoTags}
      />

      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-fade-in">
          <div
            className={cn(
              "border rounded-3xl p-6 w-full max-w-lg transition-all duration-300 shadow-2xl relative",
              theme === "dark"
                ? "bg-[#111111] border-white/10 text-white"
                : "bg-white border-gray-200 text-gray-850",
            )}
          >
            <button
              onClick={() => {
                setIsCategoryModalOpen(false);
                setBulkCategories([]);
                setBulkQuickCategories([]);
                setBulkCustomNotes("");
                setBulkCustomKeywords("");
              }}
              className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-500/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                <Tag size={24} />
              </div>
              <div>
                <h2
                  className={cn(
                    "text-xl font-bold font-sans",
                    theme === "dark" ? "text-white" : "text-gray-950",
                  )}
                >
                  Kategori Tambahan Massal
                </h2>
                <p className="text-xs text-gray-500 font-medium font-sans">
                  Mengatur {selectedIds.length} foto terpilih sekaligus
                </p>
              </div>
            </div>

            {/* Checklist Kategorinya */}
            <div className="mb-5">
              <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-2 font-sans">
                Pilih Kategori Foto (Bisa lebih dari satu)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {["Alam", "Budaya", "Arsitektur", "Fauna & Flora", "Portrait", "Landscape", "Commercial", "Lainnya"].map((cat) => {
                  const isChecked = bulkCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setBulkCategories((prev) =>
                          isChecked
                            ? prev.filter((c) => c !== cat)
                            : [...prev, cat]
                        );
                      }}
                      className={cn(
                        "flex items-center gap-2 p-3 text-xs font-bold rounded-xl border text-left transition-all active:scale-95 cursor-pointer font-sans",
                        isChecked
                          ? theme === "dark"
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                            : "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-inner"
                          : theme === "dark"
                            ? "bg-white/5 border-white/5 hover:border-white/10 text-gray-400 hover:text-white"
                            : "bg-gray-50 border-gray-150 hover:bg-gray-100 text-gray-650 hover:text-gray-800"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="accent-emerald-500 cursor-pointer w-4 h-4 rounded"
                      />
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Category Selection */}
            <div className="mb-5">
              <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block mb-2 font-sans flex items-center gap-1">
                <Sparkles size={12} className="text-purple-400 animate-pulse" />
                Quick Photography Category (Auto-Pilih Kata Kunci)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "Portrait", label: "Portrait (Potret)", colorClasses: {
                    darkActive: "bg-purple-500/20 border-purple-500/40 text-purple-300",
                    lightActive: "bg-purple-50 border-purple-200 text-purple-700 shadow-inner",
                    darkInactive: "bg-white/5 border-white/5 hover:border-white/10 text-gray-400 hover:text-white",
                    lightInactive: "bg-gray-50 border-gray-150 hover:bg-gray-100 text-gray-650 hover:text-gray-800"
                  }},
                  { name: "Landscape", label: "Landscape (Lanskap)", colorClasses: {
                    darkActive: "bg-blue-500/20 border-blue-500/40 text-blue-300",
                    lightActive: "bg-blue-50 border-blue-200 text-blue-700 shadow-inner",
                    darkInactive: "bg-white/5 border-white/5 hover:border-white/10 text-gray-400 hover:text-white",
                    lightInactive: "bg-gray-50 border-gray-150 hover:bg-gray-100 text-gray-650 hover:text-gray-800"
                  }},
                  { name: "Commercial", label: "Commercial (Komersial)", colorClasses: {
                    darkActive: "bg-amber-500/20 border-amber-500/40 text-amber-300",
                    lightActive: "bg-amber-50 border-amber-200 text-amber-700 shadow-inner",
                    darkInactive: "bg-white/5 border-white/5 hover:border-white/10 text-gray-400 hover:text-white",
                    lightInactive: "bg-gray-50 border-gray-150 hover:bg-gray-100 text-gray-650 hover:text-gray-800"
                  }}
                ].map(({ name, label, colorClasses }) => {
                  const isChecked = bulkQuickCategories.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleToggleQuickCategory(name)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border text-left transition-all active:scale-95 cursor-pointer font-sans",
                        isChecked
                          ? theme === "dark"
                            ? colorClasses.darkActive
                            : colorClasses.lightActive
                          : theme === "dark"
                            ? colorClasses.darkInactive
                            : colorClasses.lightInactive
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="accent-purple-500 cursor-pointer w-3.5 h-3.5 rounded"
                      />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Deskripsi Singkat */}
            <div className="mb-4">
              <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1 font-sans">
                Deskripsi Singkat / Catatan (misal info tumbuhan dll)
              </label>
              <textarea
                placeholder="Tulis informasi khusus, nama spesies tumbuhan (misal: Rafflesia arnoldii), lokasi, atau deskripsi tambahan lainnya..."
                value={bulkCustomNotes}
                onChange={(e) => setBulkCustomNotes(e.target.value)}
                rows={4}
                className={cn(
                  "w-full p-3.5 text-sm border rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                    : "bg-gray-50 border-gray-150 text-gray-800 placeholder:text-gray-400",
                )}
              />
            </div>

            {/* Kata Kunci Tambahan */}
            <div className="mb-6">
              <label 
                htmlFor="bulk-custom-keywords-input"
                className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1 font-sans"
              >
                Kata Kunci Tambahan (Pisahkan dengan koma)
              </label>
              <input
                id="bulk-custom-keywords-input"
                type="text"
                placeholder="misal: hutan, langka, pegunungan, herbal"
                value={bulkCustomKeywords}
                onChange={(e) => setBulkCustomKeywords(e.target.value)}
                className={cn(
                  "w-full p-3 text-sm border rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all",
                  theme === "dark"
                    ? "bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                    : "bg-gray-50 border-gray-150 text-gray-800 placeholder:text-gray-400",
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setBulkCategories([]);
                  setBulkQuickCategories([]);
                  setBulkCustomNotes("");
                  setBulkCustomKeywords("");
                }}
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
                onClick={handleBulkCategoryUpdate}
                disabled={bulkCategories.length === 0 && !bulkCustomNotes.trim() && !bulkCustomKeywords.trim()}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm active:scale-95 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-sans"
              >
                Terapkan Kategori
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/5 blur-[100px] rounded-full -ml-32 -mb-32 pointer-events-none" />

      {/* Top Bar */}
      <header
        className={cn(
          "backdrop-blur-md border-b flex-shrink-0 sticky top-0 z-50 transition-colors duration-300",
          theme === "dark"
            ? "bg-[#050505]/80 border-white/5"
            : "bg-white/80 border-gray-200",
        )}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Camera size={18} className="text-white" />
              </div>
              <span
                className={cn(
                  "font-bold text-xl tracking-tight italic hidden sm:inline-block",
                  theme === "dark" ? "text-white" : "text-gray-900",
                )}
              >
                ShutterLens
              </span>
            </div>

            {/* Shutterstock Profile Link */}
            <a
              href="https://www.shutterstock.com/id/g/photogrhapy_ibnu_1"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all hover:-translate-y-0.5 active:translate-y-0 ml-2 shadow-sm",
                theme === "dark"
                  ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30"
                  : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200",
              )}
              title="Kunjungi Profil Shutterstock Saya"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              <span>Shutterstock Me</span>
              <ExternalLink size={10} className="opacity-60" />
            </a>

            {/* 500px Profile Link */}
            <a
              href="https://500px.com/p/prayogo_wibowo"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-sm",
                theme === "dark"
                  ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                  : "bg-cyan-50 hover:bg-cyan-100 text-cyan-600 border-cyan-200",
              )}
              title="Kunjungi Profil 500px Saya"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
              <span>500px Profile</span>
              <ExternalLink size={10} className="opacity-60" />
            </a>
          </div>
          <div className="flex items-center gap-4">
            {photos.length > 0 && (
              <button
                onClick={clearAll}
                className={cn(
                  "text-sm font-bold transition-colors",
                  theme === "dark"
                    ? "text-gray-500 hover:text-red-500"
                    : "text-gray-400 hover:text-red-500",
                )}
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={cn(
                "text-sm font-bold transition-colors",
                theme === "dark"
                  ? "text-gray-500 hover:text-white"
                  : "text-gray-600 hover:text-gray-900",
              )}
            >
              <Settings size={18} />
            </button>
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className={cn(
                "text-sm font-bold transition-colors",
                theme === "dark"
                  ? "text-gray-500 hover:text-white"
                  : "text-gray-600 hover:text-gray-900",
              )}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <AuthButton />
          </div>
        </div>
      </header>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onResetSession={() => {
          localStorage.removeItem("processed_photos_count");
          clearAll();
        }}
        theme={theme}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-visible p-6 relative z-10">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={cn(
              "relative border rounded-[32px] p-20 text-center transition-all cursor-pointer overflow-hidden group",
              theme === "dark"
                ? "border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20"
                : "border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-200",
              isDragActive ? "border-blue-500/50 bg-blue-500/5 scale-95" : "",
              photos.length > 0 && "py-10",
            )}
          >
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4 relative z-10">
              <div
                className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center text-blue-500 shadow-inner",
                  theme === "dark" ? "bg-blue-600/10" : "bg-blue-50",
                )}
              >
                <Upload size={32} />
              </div>
              <div className="text-center">
                <p
                  className={cn(
                    "text-lg font-bold tracking-tight",
                    theme === "dark" ? "text-white" : "text-gray-900",
                  )}
                >
                  Seret foto kamu ke sini
                </p>
                <p className="text-gray-500 text-sm">
                  Mendukung JPEG, PNG. Maksimal 100 foto.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-px w-8",
                    theme === "dark" ? "bg-white/10" : "bg-gray-200",
                  )}
                />
                <span className="text-[10px] font-bold text-gray-500 tracking-wider">
                  ATAU
                </span>
                <div
                  className={cn(
                    "h-px w-8",
                    theme === "dark" ? "bg-white/10" : "bg-gray-200",
                  )}
                />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGooglePicker();
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all text-xs font-bold cursor-pointer shadow-lg shadow-blue-500/10 active:scale-95"
              >
                <FolderOpen size={16} />
                Pilih dari Google Drive
              </button>
            </div>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {analysisError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/10 border border-red-500/20 text-red-200 p-5 rounded-[24px] flex items-center justify-between gap-4 shadow-xl relative z-30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 font-bold shrink-0">
                    !
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-white">
                      Gagal Menganalisis Foto
                    </h5>
                    <p className="text-xs text-red-300 opacity-90 mt-0.5">
                      {analysisError}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAnalysisError(null)}
                  className="p-1 px-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 hover:border-red-500/30 text-white font-bold rounded-lg text-xs transition-colors"
                >
                  Tutup
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Demo Fallback Warning Banner */}
          <AnimatePresence>
            {showDemoWarning && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-amber-500/10 border border-amber-500/20 text-amber-200 p-5 rounded-[24px] flex items-center justify-between gap-4 shadow-xl relative z-30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold shrink-0">
                    i
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-white font-sans">
                      Mode Demo Aktif
                    </h5>
                    <p className="text-xs text-amber-300 opacity-95 mt-0.5 leading-relaxed font-sans">
                      {aiErrorReason === "API_KEY_SERVICE_BLOCKED" ? (
                        <>
                          Kunci API Gemini yang Anda gunakan terdeteksi diblokir
                          (
                          <strong className="text-red-400">
                            API_KEY_SERVICE_BLOCKED
                          </strong>{" "}
                          untuk{" "}
                          <strong className="text-white font-mono">
                            generativelanguage.googleapis.com
                          </strong>
                          ). Ini biasanya terjadi jika API Key milik Google
                          Picker/Drive Anda dibatasi agar tidak mengakses
                          layanan model AI. Silakan buat atau gunakan API Key
                          murni gratis dari{" "}
                          <a
                            href="https://aistudio.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-blue-400 hover:text-blue-300 font-bold"
                          >
                            Google AI Studio
                          </a>{" "}
                          dan pasang sebagai{" "}
                          <strong className="text-white">GEMINI_API_KEY</strong>{" "}
                          di panel{" "}
                          <strong className="text-white">
                            Settings &gt; Secrets
                          </strong>
                          .
                        </>
                      ) : aiErrorReason === "VERTEX_DISABLED" ? (
                        <>
                          Layanan Vertex AI dinonaktifkan di Google Cloud
                          Project ini (
                          <strong className="text-red-400 font-mono">
                            aiplatform.googleapis.com is disabled
                          </strong>
                          ). Silakan buat atau gunakan API Key murni gratis dari{" "}
                          <a
                            href="https://aistudio.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-blue-400 hover:text-blue-300 font-bold"
                          >
                            Google AI Studio
                          </a>{" "}
                          lalu masukkan sebagai{" "}
                          <strong className="text-white">GEMINI_API_KEY</strong>{" "}
                          di menu{" "}
                          <strong className="text-white">
                            Settings &gt; Secrets
                          </strong>{" "}
                          di AI Studio untuk melakukan analisis foto riil.
                        </>
                      ) : aiErrorReason ? (
                        <>
                          Kesalahan Analisis AI:{" "}
                          <span className="text-red-400 font-mono font-bold bg-black/25 px-1.5 py-0.5 rounded">
                            {aiErrorReason}
                          </span>
                          . Kami mengaktifkan mode demo lokal berkualitas tinggi
                          agar seluruh alur ekspor CSV, pengubahan manual
                          metadata, dan fitur Google Drive Anda tetap berjalan
                          dengan lancar. Atur variabel{" "}
                          <strong className="text-white">GEMINI_API_KEY</strong>{" "}
                          di menu{" "}
                          <strong className="text-white">
                            Settings &gt; Secrets
                          </strong>{" "}
                          untuk analisis riil.
                        </>
                      ) : (
                        <>
                          Kunci API Gemini belum dikonfigurasi secara lengkap di
                          panel Secrets Anda. Kami mendemonstrasikan hasil
                          pembuatan judul dan kata kunci berkualitas profesional
                          secara lokal agar Anda tetap dapat mengekspor CSV,
                          mengedit metadata, dan menguji fitur Google Drive.
                          Atur variabel{" "}
                          <strong className="text-white">GEMINI_API_KEY</strong>{" "}
                          di menu{" "}
                          <strong className="text-white">
                            Settings &gt; Secrets
                          </strong>{" "}
                          di AI Studio untuk melakukan analisis foto riil dengan
                          kecerdasan buatan.
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDemoWarning(false)}
                  className="p-1 px-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/20 hover:border-amber-500/30 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shrink-0 self-start"
                >
                  Tutup
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Bar */}
          <AnimatePresence>
            {photos.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={cn(
                  "flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-5 md:p-6 rounded-3xl border shadow-2xl sticky top-20 z-40 transition-all duration-300",
                  theme === "dark"
                    ? "bg-[#111111] border-white/10"
                    : "bg-white border-gray-200",
                )}
              >
                <div className="flex flex-wrap items-center gap-4 justify-between lg:justify-start">
                  <input
                    type="checkbox"
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked ? photos.map((p) => p.id) : [],
                      )
                    }
                    checked={
                      selectedIds.length === photos.length && photos.length > 0
                    }
                    className="accent-blue-600 w-4 h-4 cursor-pointer"
                  />
                  <div className="px-4 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-[2px]">
                    {photos.length} PHOTOS
                  </div>
                  <div
                    className={cn(
                      "hidden sm:block h-4 w-px",
                      theme === "dark" ? "bg-white/10" : "bg-gray-200",
                    )}
                  />
                  <div
                    className={cn(
                      "text-sm hidden sm:block",
                      theme === "dark" ? "text-gray-500" : "text-gray-600",
                    )}
                  >
                    {photos.filter((p) => p.status === "done").length} diproses
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto justify-start sm:justify-end">
                  {selectedIds.length > 0 && (
                    <select
                      onChange={(e) => {
                        handleBulkAction(e.target.value);
                        e.target.value = "";
                      }}
                      className={cn(
                        "border rounded-xl px-4 py-2 text-sm focus:outline-none transition-all",
                        theme === "dark"
                          ? "bg-white/5 border-white/10 text-white"
                          : "bg-white border-gray-200 text-gray-800",
                      )}
                    >
                      <option
                        value=""
                        className={
                          theme === "dark"
                            ? "bg-[#111111] text-white"
                            : "bg-white text-gray-800"
                        }
                      >
                        Bulk Actions
                      </option>
                      <option
                        value="delete"
                        className={
                          theme === "dark"
                            ? "bg-[#111111] text-white"
                            : "bg-white text-gray-800"
                        }
                      >
                        Delete Selected
                      </option>
                      <option
                        value="reanalyze"
                        className={
                          theme === "dark"
                            ? "bg-[#111111] text-white"
                            : "bg-white text-gray-800"
                        }
                      >
                        Re-Analyze Selected
                      </option>
                      <option
                        value="rename"
                        className={
                          theme === "dark"
                            ? "bg-[#111111] text-white"
                            : "bg-white text-gray-800"
                        }
                      >
                        Rename Selected
                      </option>
                      <option
                        value="category"
                        className={
                          theme === "dark"
                            ? "bg-[#111111] text-white"
                            : "bg-white text-gray-800"
                        }
                      >
                        Atur Kategori & Catatan Massal
                      </option>
                      <option
                        value="autotag"
                        className={
                          theme === "dark"
                            ? "bg-[#111111] text-white"
                            : "bg-white text-gray-800"
                        }
                      >
                        Auto-Tagging AI Sugesti
                      </option>
                    </select>
                  )}
                  {/* Real-time search/filter input */}
                  <div className="relative flex items-center w-full sm:w-64">
                    <span className="absolute left-3.5 text-gray-400">
                      <Search size={15} />
                    </span>
                    <input
                      type="text"
                      placeholder="Cari judul / file..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn(
                        "w-full pl-10 pr-3.5 py-2 text-sm border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all",
                        theme === "dark"
                          ? "bg-white/5 border-white/10 text-white placeholder-gray-500 focus:bg-white/10"
                          : "bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:shadow-sm"
                      )}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                        title="Hapus pencarian"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className={cn(
                      "border rounded-xl px-4 py-2 text-sm focus:outline-none transition-all",
                      theme === "dark"
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-800",
                    )}
                  >
                    <option
                      value="all"
                      className={
                        theme === "dark"
                          ? "bg-[#111111] text-white"
                          : "bg-white text-gray-800"
                      }
                    >
                      All Status
                    </option>
                    <option
                      value="done"
                      className={
                        theme === "dark"
                          ? "bg-[#111111] text-white"
                          : "bg-white text-gray-800"
                      }
                    >
                      Done
                    </option>
                    <option
                      value="pending"
                      className={
                        theme === "dark"
                          ? "bg-[#111111] text-white"
                          : "bg-white text-gray-800"
                      }
                    >
                      Pending
                    </option>
                    <option
                      value="error"
                      className={
                        theme === "dark"
                          ? "bg-[#111111] text-white"
                          : "bg-white text-gray-800"
                      }
                    >
                      Error
                    </option>
                  </select>
                  <button
                    disabled={
                      isProcessing ||
                      !photos.some(
                        (p) =>
                          (p.status === "pending" || p.status === "error") &&
                          p.url !== "",
                      )
                    }
                    onClick={analyzeAll}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:bg-blue-500 shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    {isProcessing ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Sparkles size={18} />
                    )}
                    {isProcessing
                      ? "Sedang Menganalisis..."
                      : "Mulai Analisis AI"}
                  </button>
                  <button
                    disabled={!photos.some((p) => p.status === "done")}
                    onClick={() => {
                      const metadata = photos
                        .filter((p) => p.status === "done")
                        .map(
                          (p) =>
                            `Title (EN): ${p.englishMetadata.title}\nDescription (EN): ${p.englishMetadata.description}\nKeywords (EN): ${p.englishMetadata.keywords.join(", ")}\n\nJudul (ID): ${p.indonesianMetadata.title}\nDeskripsi (ID): ${p.indonesianMetadata.description}\nKata Kunci (ID): ${p.indonesianMetadata.keywords.join(", ")}\n-------------------\n`,
                        )
                        .join("\n");
                      navigator.clipboard.writeText(metadata);
                      alert(
                        "Metadata semua foto (status: done) berhasil disalin ke clipboard!",
                      );
                    }}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 transition-all active:scale-95 border shadow-sm",
                      theme === "dark"
                        ? "bg-white/5 hover:bg-white/10 text-white border-white/5"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-200",
                    )}
                  >
                    <Edit3 size={18} />
                    Salin Semua Metadata
                  </button>
                   <button
                    disabled={selectedIds.length === 0}
                    onClick={() => setIsCategoryModalOpen(true)}
                    title={
                      selectedIds.length === 0
                        ? "Pilih minimal 1 foto dengan mencentang kotak untuk mengatur kategori"
                        : "Atur kategori tambahan untuk foto terpilih"
                    }
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 border shadow-sm",
                      selectedIds.length === 0
                        ? theme === "dark"
                          ? "bg-white/5 text-gray-500 border-white/5 cursor-not-allowed opacity-40"
                          : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50"
                        : theme === "dark"
                          ? "bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-400 border-emerald-500/30 cursor-pointer"
                          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 cursor-pointer"
                    )}
                  >
                    <Tag size={18} />
                    Kategori Tambahan
                    {selectedIds.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 text-[10px] bg-emerald-500 text-white rounded-full">
                        {selectedIds.length}
                      </span>
                    )}
                  </button>
                  <button
                    disabled={selectedIds.length === 0}
                    onClick={() => setIsAutoTaggingModalOpen(true)}
                    title={
                      selectedIds.length === 0
                        ? "Pilih minimal 1 foto dengan mencentang kotak untuk menggunakan Auto-Tagging AI"
                        : "Gunakan Auto-Tagging AI Sugesti untuk foto terpilih"
                    }
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 border shadow-sm",
                      selectedIds.length === 0
                        ? theme === "dark"
                          ? "bg-white/5 text-gray-500 border-white/5 cursor-not-allowed opacity-40"
                          : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50"
                        : theme === "dark"
                          ? "bg-purple-600/20 hover:bg-purple-600/35 text-purple-400 border-purple-500/30 cursor-pointer"
                          : "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 cursor-pointer"
                    )}
                  >
                    <Sparkles size={18} />
                    Auto-Tagging AI
                    {selectedIds.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 text-[10px] bg-purple-500 text-white rounded-full">
                        {selectedIds.length}
                      </span>
                    )}
                  </button>
                  <div
                    className="relative"
                    onMouseEnter={() => setIsExportDropdownOpen(true)}
                    onMouseLeave={() => setIsExportDropdownOpen(false)}
                  >
                    <button
                      onClick={() => setIsExportDropdownOpen((prev) => !prev)}
                      disabled={!photos.some((p) => p.status === "done")}
                      className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 transition-all active:scale-95 shadow-md cursor-pointer",
                        theme === "dark"
                          ? "bg-white text-black hover:bg-gray-200"
                          : "bg-blue-600 text-white hover:bg-blue-500",
                      )}
                    >
                      <Download size={18} />
                      Export
                    </button>
                    {isExportDropdownOpen && (
                      <div className="absolute right-0 top-full pt-1.5 z-50">
                        <div
                          className={cn(
                            "w-48 border rounded-xl shadow-xl p-2 transition-colors",
                            theme === "dark"
                              ? "bg-[#1a1a1a] border-white/10 text-white"
                              : "bg-white border-gray-200 text-gray-800",
                          )}
                        >
                          <button
                            onClick={() => {
                              exportData("csv");
                              setIsExportDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer",
                              theme === "dark"
                                ? "text-gray-300 hover:bg-white/5 hover:text-white"
                                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                            )}
                          >
                            Export CSV
                          </button>
                          <button
                            onClick={() => {
                              exportData("xml");
                              setIsExportDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer",
                              theme === "dark"
                                ? "text-gray-300 hover:bg-white/5 hover:text-white"
                                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                            )}
                          >
                            Export XML (Sederhana)
                          </button>
                          <button
                            onClick={() => {
                              exportData("xml-adobe");
                              setIsExportDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer font-medium text-purple-400 hover:bg-purple-500/10",
                              theme === "dark"
                                ? "hover:text-purple-300"
                                : "text-purple-650 hover:bg-purple-50 hover:text-purple-700",
                            )}
                          >
                            Export XML (Adobe Stock)
                          </button>
                          <button
                            onClick={() => {
                              exportData("json");
                              setIsExportDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer",
                              theme === "dark"
                                ? "text-gray-300 hover:bg-white/5 hover:text-white"
                                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                            )}
                          >
                            Export JSON
                          </button>
                          <div
                            className={cn(
                              "h-[1px] my-1",
                              theme === "dark" ? "bg-white/10" : "bg-gray-100",
                            )}
                          />
                          <button
                            onClick={async () => {
                              await exportToGoogleDoc();
                              setIsExportDropdownOpen(false);
                            }}
                            disabled={isExportingDoc}
                            className={cn(
                              "w-full text-left px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 font-medium cursor-pointer",
                              theme === "dark"
                                ? "text-blue-400 hover:bg-white/5 hover:text-white"
                                : "text-blue-600 hover:bg-blue-50 hover:text-blue-700",
                            )}
                          >
                            {isExportingDoc ? (
                              <>
                                <Loader2
                                  className="animate-spin text-blue-500"
                                  size={14}
                                />
                                Mengekspor...
                              </>
                            ) : (
                              <>
                                <FileText size={14} />
                                Export Google Docs
                              </>
                            )}
                          </button>
                          <div
                            className={cn(
                              "h-[1px] my-1",
                              theme === "dark" ? "bg-white/10" : "bg-[#f3f4f6]",
                            )}
                          />
                          <button
                            onClick={async () => {
                              await exportToPdf();
                              setIsExportDropdownOpen(false);
                            }}
                            disabled={isExportingPdf}
                            className={cn(
                              "w-full text-left px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 font-medium cursor-pointer",
                              theme === "dark"
                                ? "text-red-400 hover:bg-white/5 hover:text-white"
                                : "text-red-600 hover:bg-red-50 hover:text-red-700",
                            )}
                          >
                            {isExportingPdf ? (
                              <>
                                <Loader2
                                  className="animate-spin text-red-500"
                                  size={14}
                                />
                                Mengekspor PDF...
                              </>
                            ) : (
                              <>
                                <FileText size={14} className="text-red-500" />
                                Export PDF (Katalog)
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dedicated Category Filter Bar */}
          {photos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-3.5 mb-6 rounded-3xl border transition-all duration-300",
                theme === "dark"
                  ? "bg-white/[0.02] border-white/5"
                  : "bg-gray-50/55 border-gray-150"
              )}
            >
              <div className="flex items-center gap-2">
                <Tag
                  size={14}
                  className={theme === "dark" ? "text-emerald-400" : "text-emerald-650"}
                />
                <span className={cn(
                  "text-[11px] font-black uppercase tracking-wider font-sans",
                  theme === "dark" ? "text-gray-400" : "text-gray-550"
                )}>
                  Kategori Tinjauan Cepat
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: "all", label: "Semua Kategori" },
                  { id: "Portrait", label: "Portrait" },
                  { id: "Landscape", label: "Landscape" },
                  { id: "Commercial", label: "Commercial" }
                ].map((item) => {
                  const isActive = categoryFilter === item.id;
                  const matchingCount = item.id === "all" 
                    ? photos.length 
                    : photos.filter((p) => p.categories?.includes(item.id)).length;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCategoryFilter(item.id as any)}
                      className={cn(
                        "flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all active:scale-95 cursor-pointer font-sans",
                        isActive
                          ? theme === "dark"
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-500/10"
                            : "bg-emerald-55 border-emerald-555 text-white font-semibold shadow-md shadow-emerald-600/10"
                          : theme === "dark"
                            ? "bg-white/5 border-white/5 hover:border-white/10 text-gray-400 hover:text-white"
                            : "bg-white border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-800"
                      )}
                    >
                      <span>{item.label}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-lg font-black",
                        isActive
                          ? theme === "dark"
                            ? "bg-emerald-500/30 text-emerald-250"
                            : "bg-white/20 text-white"
                          : theme === "dark"
                            ? "bg-white/10 text-gray-400"
                            : "bg-gray-100 text-gray-500"
                      )}>
                        {matchingCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Photos Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {photos
                .filter((p) => {
                  const matchesStatus = filter === "all" || p.status === filter;
                  if (!matchesStatus) return false;

                  // Category filter bar matches
                  if (categoryFilter !== "all") {
                    const hasCat = p.categories?.includes(categoryFilter);
                    if (!hasCat) return false;
                  }

                  if (!searchQuery.trim()) return true;

                  const q = searchQuery.toLowerCase();
                  const matchesEnTitle = p.englishMetadata?.title?.toLowerCase().includes(q);
                  const matchesIdTitle = p.indonesianMetadata?.title?.toLowerCase().includes(q);

                  return matchesEnTitle || matchesIdTitle;
                })
                .map((photo) => (
                  <motion.div
                    key={photo.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => {
                      if (photo.status === "done" && editingId !== photo.id) {
                        openPhotoModal(photo);
                      }
                    }}
                    className={cn(
                      "border overflow-hidden shadow-xl flex flex-col group transition-all duration-300 rounded-3xl",
                      photo.status === "done" && editingId !== photo.id && "cursor-pointer",
                      theme === "dark"
                        ? "bg-[#111111] border-white/5 hover:border-white/10"
                        : "bg-white border-gray-150 hover:border-gray-200 hover:shadow-2xl",
                    )}
                  >
                    {/* Thumbnail Area */}
                    <div
                      className="aspect-video relative overflow-hidden bg-white/5 flex items-center justify-center animate-fade-in"
                    >
                      {photo.url ? (
                        <img
                          src={photo.url}
                          alt="Preview"
                          className={cn(
                            "w-full h-full object-cover group-hover:scale-110 transition-all duration-700",
                            photo.filter === "grayscale" && "grayscale",
                            photo.filter === "sepia" && "sepia"
                          )}
                          style={
                            photo.filter === "grayscale"
                              ? { filter: "grayscale(100%)" }
                              : photo.filter === "sepia"
                              ? { filter: "sepia(100%)" }
                              : undefined
                          }
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2
                            className="animate-spin text-blue-500"
                            size={24}
                          />
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest animate-pulse">
                            Mengunduh dari Drive...
                          </span>
                        </div>
                      )}

                      {/* Filter Capsule Switcher */}
                      {photo.url && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute bottom-3 right-3 z-20 flex gap-1 bg-[#141414]/85 border border-white/10 px-1.5 py-1 rounded-xl shadow-lg backdrop-blur-md opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 pointer-events-auto"
                        >
                          {(["none", "grayscale", "sepia"] as const).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => updatePhoto(photo.id, { filter: mode })}
                              className={cn(
                                "px-2 py-0.5 text-[9px] font-bold rounded-lg transition-all capitalize cursor-pointer",
                                (photo.filter || "none") === mode
                                  ? "bg-blue-600 text-white shadow"
                                  : "text-gray-400 hover:text-white hover:bg-white/5"
                              )}
                              title={`Terapkan efek ${mode === "none" ? "normal" : mode}`}
                            >
                              {mode === "none" ? "Normal" : mode === "grayscale" ? "Mono" : "Sepia"}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Selection Checkbox (Sangat mudah diakses & selalu terlihat agar tombol Kategori/Rename bisa digunakan) */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="absolute top-4 left-4 z-20 flex items-center"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedIds((prev) =>
                              prev.includes(photo.id)
                                ? prev.filter((s) => s !== photo.id)
                                : [...prev, photo.id],
                            );
                          }}
                          className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-full border shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer",
                            selectedIds.includes(photo.id)
                              ? "bg-blue-600 text-white border-blue-400/40"
                              : theme === "dark"
                                ? "bg-black/60 border-white/10 text-gray-400 hover:text-white"
                                : "bg-white border-gray-200 text-gray-500 hover:text-gray-900",
                          )}
                          title="Pilih foto ini"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(photo.id)}
                            onChange={() => {}} /* Handled by button tap click wrapper */
                            className="accent-blue-500 w-4 h-4 cursor-pointer"
                          />
                        </button>
                      </div>

                      {/* Status Overlay & Delete Button on Hover */}
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-4 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removePhoto(photo.id);
                          }}
                          className="p-2 bg-[#141414]/80 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors border border-white/10 shadow-lg"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {photo.status === "done" && (
                        <div className="absolute inset-x-0 bottom-4 flex items-center justify-center pointer-events-none z-20">
                          <span className="px-3.5 py-2 rounded-full bg-blue-600/90 backdrop-blur-md text-white border border-blue-400/20 text-[10px] font-bold font-sans tracking-wide shadow-lg flex items-center gap-1.5 transition-all duration-300 transform scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100">
                            <Eye size={12} /> Lihat Detail Metadata
                          </span>
                        </div>
                      )}

                      {photo.status === "processing" && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-[4px] flex flex-col items-center justify-center gap-3">
                          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-[10px] font-black uppercase tracking-[3px] text-blue-400 animate-pulse">
                            Menganalisis...
                          </span>
                        </div>
                      )}

                      {photo.status === "error" && (
                        <div className="absolute inset-0 bg-red-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-2 p-6 text-center">
                          <X size={32} className="text-red-500" />
                          <p className="text-xs font-bold text-red-400 uppercase tracking-widest">
                            {photo.error || "Failed"}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Content Area */}
                    <div className="p-6 flex-1 flex flex-col gap-4">
                      {editingId === photo.id ? (
                        <div onClick={(e) => e.stopPropagation()} className="space-y-4">
                          <div>
                            <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">
                              Title
                            </label>
                            <input
                              autoFocus
                              value={photo.englishMetadata.title}
                              onChange={(e) =>
                                updatePhoto(photo.id, {
                                  englishMetadata: {
                                    ...photo.englishMetadata,
                                    title: e.target.value,
                                  },
                                })
                              }
                              className={cn(
                                "w-full p-2 text-sm border rounded-lg focus:border-blue-500 focus:outline-none transition-colors",
                                theme === "dark"
                                  ? "bg-white/5 border-white/10 text-white"
                                  : "bg-gray-50 border-gray-200 text-gray-800",
                              )}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">
                              Description
                            </label>
                            <textarea
                              value={photo.englishMetadata.description || ""}
                              onChange={(e) =>
                                updatePhoto(photo.id, {
                                  englishMetadata: {
                                    ...photo.englishMetadata,
                                    description: e.target.value,
                                  },
                                })
                              }
                              className={cn(
                                "w-full p-2 text-xs border rounded-lg min-h-[50px] focus:border-blue-500 focus:outline-none transition-colors",
                                theme === "dark"
                                  ? "bg-white/5 border-white/10 text-gray-300"
                                  : "bg-gray-50 border-gray-200 text-gray-700",
                              )}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">
                              Keywords
                            </label>
                            <textarea
                              value={photo.englishMetadata.keywords.join(", ")}
                              onChange={(e) =>
                                updatePhoto(photo.id, {
                                  englishMetadata: {
                                    ...photo.englishMetadata,
                                    keywords: e.target.value
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  },
                                })
                              }
                              className={cn(
                                "w-full p-2 text-xs border rounded-lg min-h-[60px] focus:border-blue-500 focus:outline-none transition-colors",
                                theme === "dark"
                                  ? "bg-white/5 border-white/10 text-gray-300"
                                  : "bg-gray-50 border-gray-200 text-gray-700",
                              )}
                            />
                          </div>

                          {/* Kategori Tumbuhan / Foto Edit Langsung */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">
                              Kategori Tumbuhan / Foto
                            </label>
                            <div className="flex flex-wrap gap-1">
                              {["Alam", "Budaya", "Arsitektur", "Fauna & Flora", "Lainnya"].map((cat) => {
                                const currentCats = photo.categories || [];
                                const isCatSelected = currentCats.includes(cat);
                                return (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => {
                                      const updatedCats = isCatSelected
                                        ? currentCats.filter((c) => c !== cat)
                                        : [...currentCats, cat];
                                      updatePhoto(photo.id, { categories: updatedCats });
                                    }}
                                    className={cn(
                                      "flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold rounded-lg border transition-all active:scale-95 cursor-pointer font-sans",
                                      isCatSelected
                                        ? theme === "dark"
                                          ? "bg-[#10b981]/20 border-[#10b981]/40 text-[#34d399]"
                                          : "bg-[#ecfdf5] border-[#a7f3d0] text-[#047857]"
                                        : theme === "dark"
                                          ? "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                                          : "bg-gray-50 border-gray-150 hover:bg-gray-100 text-gray-600 hover:text-gray-800"
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isCatSelected}
                                      readOnly
                                      className="accent-emerald-500 cursor-pointer w-3 h-3 rounded"
                                    />
                                    {cat}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Deskripsi Singkat Edit Langsung */}
                          <div>
                            <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">
                              Deskripsi Singkat / Catatan
                            </label>
                            <textarea
                              rows={2}
                              value={photo.customNotes || ""}
                              placeholder="Keterangan tumbuhan, lokasi penemuan, dll."
                              onChange={(e) =>
                                updatePhoto(photo.id, { customNotes: e.target.value })
                              }
                              className={cn(
                                "w-full p-2 text-xs border rounded-lg resize-none min-h-[44px] focus:border-blue-500 focus:outline-none transition-colors",
                                theme === "dark"
                                  ? "bg-white/5 border-white/10 text-gray-300"
                                  : "bg-gray-50 border-gray-200 text-gray-700",
                              )}
                            />
                          </div>

                          <button
                            onClick={() => setEditingId(null)}
                            className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500"
                          >
                            Simpan Perubahan
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                  Title
                                </span>
                                {photo.extension && (
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.5 text-[9px] font-bold rounded uppercase",
                                      theme === "dark"
                                        ? "bg-white/10 text-gray-400"
                                        : "bg-gray-150 text-gray-650",
                                    )}
                                  >
                                    {photo.extension}
                                  </span>
                                )}
                              </div>
                              <h4
                                className={cn(
                                  "font-bold text-sm line-clamp-2 leading-tight",
                                  theme === "dark"
                                    ? "text-white"
                                    : "text-gray-900",
                                  photo.status === "pending" &&
                                    "text-gray-500 italic font-normal",
                                )}
                              >
                                {photo.status === "pending"
                                  ? "Menunggu analisis..."
                                  : photo.englishMetadata.title}
                              </h4>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(photo.id);
                              }}
                              className={cn(
                                "p-2 hover:text-blue-500 transition-colors rounded-lg shrink-0",
                                theme === "dark"
                                  ? "text-gray-600 bg-white/5"
                                  : "text-gray-400 bg-gray-100 hover:bg-gray-200",
                              )}
                            >
                              <Edit3 size={14} />
                            </button>
                          </div>

                          {photo.status === "done" && photo.categories && photo.categories.length > 0 && (
                            <div className="mt-1">
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1 font-sans">
                                Kategori
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {photo.categories.map((cat, i) => (
                                  <span
                                    key={i}
                                    className={cn(
                                      "px-2 py-0.5 text-[9px] font-bold rounded-lg border uppercase tracking-wider font-sans",
                                      theme === "dark"
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                                        : "bg-emerald-50 border-emerald-150 text-emerald-700"
                                    )}
                                  >
                                    {cat}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {photo.status === "done" && photo.customNotes && (
                            <div>
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1 font-sans">
                                Deskripsi Singkat & Catatan
                              </span>
                              <p className={cn(
                                "text-xs italic leading-relaxed font-semibold border-l-2 pl-2 font-sans",
                                theme === "dark"
                                  ? "text-emerald-300 border-emerald-500"
                                  : "text-emerald-800 border-emerald-300"
                              )}>
                                {photo.customNotes}
                              </p>
                            </div>
                          )}

                          {photo.status === "done" &&
                            photo.englishMetadata.description && (
                              <div>
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-1">
                                  Description
                                </span>
                                <p className={cn("text-xs line-clamp-2 leading-relaxed font-normal", theme === "dark" ? "text-gray-400" : "text-gray-650")}>
                                  {photo.englishMetadata.description}
                                </p>
                              </div>
                            )}

                          {photo.status === "done" &&
                            photo.englishMetadata.keywords && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-bold text-gray-650 uppercase tracking-widest block font-sans">
                                    Keywords ({photo.englishMetadata.keywords.length})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const formatted = (photo.englishMetadata.keywords || [])
                                        .map((k) => k.replace(/#/g, "").trim().toLowerCase())
                                        .filter((k, idx, self) => k && self.indexOf(k) === idx)
                                        .slice(0, 50)
                                        .join(", ");
                                      navigator.clipboard.writeText(formatted);
                                      alert("Keywords EN (Format Stock Agency: Huruf Kecil, Koma, Maks 50) disalin!");
                                    }}
                                    className="text-[10px] text-blue-500 hover:text-blue-600 font-bold flex items-center gap-1 cursor-pointer font-sans active:scale-95 transition-all"
                                    title="Salin untuk form kontributor stock (koma, huruf kecil, maks 50 kata)"
                                  >
                                    <Copy size={9} />
                                    Salin Format Stock
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {(photo.englishMetadata.keywords || [])
                                    .slice(0, 12)
                                    .map((tag, i) => (
                                      <span
                                        key={i}
                                        className={cn(
                                          "px-2 py-0.5 border text-[10px] rounded-md transition-all duration-350",
                                          theme === "dark"
                                            ? "bg-blue-500/10 border-blue-500/20 text-blue-300"
                                            : "bg-blue-50 border-blue-100 text-blue-600",
                                        )}
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                  {(photo.englishMetadata.keywords || [])
                                    .length > 12 && (
                                    <span className="text-[10px] text-gray-650 font-medium self-center">
                                      +
                                      {photo.englishMetadata.keywords.length -
                                        12}{" "}
                                      more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          
                          {photo.status === "done" && (
                            <div className="pt-3 border-t border-gray-100 dark:border-white/10 mt-auto flex gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(photo.id);
                                }}
                                className={cn(
                                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition-all border active:scale-95 cursor-pointer font-sans",
                                  theme === "dark"
                                    ? "bg-white/5 hover:bg-white/10 border-white/5 text-gray-300 hover:text-white"
                                    : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-650 hover:text-gray-800"
                                )}
                              >
                                <Edit3 size={11} />
                                Edit Kategori & Catatan
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPhotoModal(photo);
                                }}
                                className={cn(
                                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition-all border active:scale-95 cursor-pointer font-sans",
                                  theme === "dark"
                                    ? "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-300"
                                    : "bg-emerald-50 hover:bg-emerald-100 border-emerald-250 text-emerald-700"
                                )}
                              >
                                <Eye size={11} />
                                Detail & AI
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>

          {photos.length === 0 && (
            <div className="h-[40vh] flex flex-col items-center justify-center text-gray-700">
              <ImageIcon
                size={64}
                strokeWidth={1}
                className="mb-4 opacity-20"
              />
              <p className="font-medium tracking-tight">
                Belum ada foto yang diupload.
              </p>
            </div>
          )}

          {photos.length > 0 &&
            photos.filter((p) => {
              const matchesStatus = filter === "all" || p.status === filter;
              if (!matchesStatus) return false;

              // Category filter bar matches
              if (categoryFilter !== "all") {
                const hasCat = p.categories?.includes(categoryFilter);
                if (!hasCat) return false;
              }

              if (!searchQuery.trim()) return true;

              const q = searchQuery.toLowerCase();
              const matchesEnTitle = p.englishMetadata?.title?.toLowerCase().includes(q);
              const matchesIdTitle = p.indonesianMetadata?.title?.toLowerCase().includes(q);

              return matchesEnTitle || matchesIdTitle;
            }).length === 0 && (
              <div className="h-[40vh] flex flex-col items-center justify-center text-gray-400 dark:text-gray-650">
                <Search
                  size={64}
                  strokeWidth={1}
                  className="mb-4 opacity-20 animate-pulse"
                />
                <p className="font-medium tracking-tight text-sm">
                  Tidak ada foto yang cocok dengan pencarian atau filter Anda.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("all");
                    setFilter("all");
                  }}
                  className="mt-3 px-6 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-blue-600/10"
                >
                  Reset Semua Filter
                </button>
              </div>
            )}
        </div>
      </main>

      {/* Dynamic Results Popup Modal */}
      <AnimatePresence>
        {analyzedModal.isOpen && (
          <div
            id="shutterlens-results-modal"
            className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8 z-[999999] overflow-y-auto"
            onClick={() =>
              setAnalyzedModal((prev) => ({ ...prev, isOpen: false }))
            }
          >
            {/* Modal Body Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className={cn(
                "border rounded-[32px] w-full max-w-4xl shadow-2xl overflow-hidden relative z-[99999] flex flex-col md:flex-row transition-all duration-300 md:h-[85vh] max-h-[800px] my-auto",
                theme === "dark"
                  ? "bg-[#0e0e0e] border-blue-500/30"
                  : "bg-white border-gray-200 shadow-2xl",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image Preview and Navigation Panels */}
              <div className="md:w-1/2 bg-black flex flex-col justify-between p-6 relative min-h-[300px] md:h-full border-b md:border-b-0 md:border-r border-white/5">
                <div className="absolute top-4 left-4 bg-blue-600/90 backdrop-blur-md text-white font-bold text-xs px-3.5 py-1.5 rounded-full z-10 shadow-lg shadow-blue-500/20">
                  Hasil Analisis AI
                </div>

                <div className="flex-1 flex items-center justify-center overflow-hidden rounded-2xl bg-white/[0.02] border border-white/5 relative group">
                  <img
                    src={analyzedModal.imageUrl}
                    alt="Analyzed Photo"
                    referrerPolicy="no-referrer"
                    className={cn(
                      "w-full h-full object-contain max-h-[350px] transition-transform duration-500 group-hover:scale-105",
                      (() => {
                        const activePhotoInModal = photos.find((p) => p.id === currentId);
                        return activePhotoInModal?.filter === "grayscale"
                          ? "grayscale"
                          : activePhotoInModal?.filter === "sepia"
                          ? "sepia"
                          : "";
                      })()
                    )}
                    style={(() => {
                      const activePhotoInModal = photos.find((p) => p.id === currentId);
                      return activePhotoInModal?.filter === "grayscale"
                        ? { filter: "grayscale(100%)" }
                        : activePhotoInModal?.filter === "sepia"
                        ? { filter: "sepia(100%)" }
                        : undefined;
                    })()}
                  />
                </div>

                {/* Batch Browsing Pagination Controls */}
                {analyzedModal.allResults &&
                  analyzedModal.allResults.length > 1 && (
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <span className="text-xs text-gray-500 font-mono">
                        Foto {(analyzedModal.currentIndex || 0) + 1} dari{" "}
                        {analyzedModal.allResults.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const idx = analyzedModal.currentIndex || 0;
                            if (idx > 0) {
                              const prevItem =
                                analyzedModal.allResults![idx - 1];
                              setAnalyzedModal((prev) => ({
                                ...prev,
                                currentIndex: idx - 1,
                                en: prevItem.en,
                                ind: prevItem.ind,
                                imageUrl: prevItem.url,
                              }));
                            }
                          }}
                          disabled={(analyzedModal.currentIndex || 0) === 0}
                          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:pointer-events-none transition-all border border-white/5 font-sans font-bold text-xs"
                        >
                          ← Prev
                        </button>
                        <button
                          onClick={() => {
                            const idx = analyzedModal.currentIndex || 0;
                            if (idx < analyzedModal.allResults!.length - 1) {
                              const nextItem =
                                analyzedModal.allResults![idx + 1];
                              setAnalyzedModal((prev) => ({
                                ...prev,
                                currentIndex: idx + 1,
                                en: nextItem.en,
                                ind: nextItem.ind,
                                imageUrl: nextItem.url,
                              }));
                            }
                          }}
                          disabled={
                            (analyzedModal.currentIndex || 0) ===
                            analyzedModal.allResults!.length - 1
                          }
                          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:pointer-events-none transition-all border border-white/5 font-sans font-bold text-xs"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
              </div>

              {/* Data Representation & Copy / Edit Forms */}
              <div
                className={cn(
                  "md:w-1/2 p-8 flex flex-col justify-between gap-6 transition-all duration-300 md:h-full md:overflow-y-auto",
                  theme === "dark"
                    ? "bg-gradient-to-b from-[#0e0e0e] to-black text-white"
                    : "bg-gray-50 text-gray-800 border-t md:border-t-0 md:border-l border-gray-150",
                )}
              >
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-widest font-sans">
                        Gemini API Hasil Riil
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setAnalyzedModal((prev) => ({ ...prev, isOpen: false }))
                      }
                      className={cn(
                        "p-2 rounded-xl transition-all border border-transparent",
                        theme === "dark"
                          ? "text-gray-500 hover:text-white hover:bg-white/5 hover:border-white/10"
                          : "text-gray-400 hover:text-gray-800 hover:bg-gray-100 hover:border-gray-200",
                      )}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Title View and Editor */}
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[#a8a8a8] block">
                            Title (EN)
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                analyzedModal.en.title,
                              );
                              alert("Copied EN Title");
                            }}
                            className="text-[9px] text-blue-400 hover:underline font-bold"
                          >
                            Salin
                          </button>
                        </div>
                        <input
                          type="text"
                          value={analyzedModal.en.title}
                          onChange={(e) => {
                            const nextVal = e.target.value;
                            setAnalyzedModal((prev) => ({
                              ...prev,
                              en: { ...prev.en, title: nextVal },
                            }));
                            const currentId =
                              analyzedModal.allResults?.[
                                analyzedModal.currentIndex || 0
                              ]?.id;
                            if (currentId) {
                              const photo = photos.find(
                                (p) => p.id === currentId,
                              );
                              if (photo)
                                updatePhoto(currentId, {
                                  englishMetadata: {
                                    ...photo.englishMetadata,
                                    title: nextVal,
                                  },
                                });
                            }
                          }}
                          className={cn(
                            "w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/70 transition-colors",
                            theme === "dark"
                              ? "bg-white/[0.03] border-white/10 text-white"
                              : "bg-white border-gray-250 text-gray-800",
                          )}
                        />
                        <MetadataValidator
                          value={analyzedModal.en.title}
                          type="title"
                          lang="en"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[#a8a8a8] block">
                            Judul (ID)
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                analyzedModal.ind.title,
                              );
                              alert("Copied ID Title");
                            }}
                            className="text-[9px] text-blue-400 hover:underline font-bold"
                          >
                            Salin
                          </button>
                        </div>
                        <input
                          type="text"
                          value={analyzedModal.ind.title}
                          onChange={(e) => {
                            const nextVal = e.target.value;
                            setAnalyzedModal((prev) => ({
                              ...prev,
                              ind: { ...prev.ind, title: nextVal },
                            }));
                            const currentId =
                              analyzedModal.allResults?.[
                                analyzedModal.currentIndex || 0
                              ]?.id;
                            if (currentId) {
                              const photo = photos.find(
                                (p) => p.id === currentId,
                              );
                              if (photo)
                                updatePhoto(currentId, {
                                  indonesianMetadata: {
                                    ...photo.indonesianMetadata,
                                    title: nextVal,
                                  },
                                });
                            }
                          }}
                          className={cn(
                            "w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/70 transition-colors",
                            theme === "dark"
                              ? "bg-white/[0.03] border-white/10 text-white"
                              : "bg-white border-gray-250 text-gray-800",
                          )}
                        />
                        <MetadataValidator
                          value={analyzedModal.ind.title}
                          type="title"
                          lang="ind"
                        />
                      </div>
                    </div>

                    {/* Description View and Editor */}
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[#a8a8a8] block">
                            Description (EN)
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                analyzedModal.en.description,
                              );
                              alert("Copied EN Description");
                            }}
                            className="text-[9px] text-blue-400 hover:underline font-bold"
                          >
                            Salin
                          </button>
                        </div>
                        <textarea
                          value={analyzedModal.en.description}
                          onChange={(e) => {
                            const nextVal = e.target.value;
                            setAnalyzedModal((prev) => ({
                              ...prev,
                              en: { ...prev.en, description: nextVal },
                            }));
                            const currentId =
                              analyzedModal.allResults?.[
                                analyzedModal.currentIndex || 0
                              ]?.id;
                            if (currentId) {
                              const photo = photos.find(
                                (p) => p.id === currentId,
                              );
                              if (photo)
                                updatePhoto(currentId, {
                                  englishMetadata: {
                                    ...photo.englishMetadata,
                                    description: nextVal,
                                  },
                                });
                            }
                          }}
                          rows={3}
                          className={cn(
                            "w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500/70 transition-colors resize-none",
                            theme === "dark"
                              ? "bg-white/[0.03] border-white/10 text-gray-300"
                              : "bg-white border-gray-250 text-gray-800",
                          )}
                        />
                        <MetadataValidator
                          value={analyzedModal.en.description}
                          type="description"
                          lang="en"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[#a8a8a8] block">
                            Deskripsi (ID)
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                analyzedModal.ind.description,
                              );
                              alert("Copied ID Description");
                            }}
                            className="text-[9px] text-blue-400 hover:underline font-bold"
                          >
                            Salin
                          </button>
                        </div>
                        <textarea
                          value={analyzedModal.ind.description}
                          onChange={(e) => {
                            const nextVal = e.target.value;
                            setAnalyzedModal((prev) => ({
                              ...prev,
                              ind: { ...prev.ind, description: nextVal },
                            }));
                            const currentId =
                              analyzedModal.allResults?.[
                                analyzedModal.currentIndex || 0
                              ]?.id;
                            if (currentId) {
                              const photo = photos.find(
                                (p) => p.id === currentId,
                              );
                              if (photo)
                                updatePhoto(currentId, {
                                  indonesianMetadata: {
                                    ...photo.indonesianMetadata,
                                    description: nextVal,
                                  },
                                });
                            }
                          }}
                          rows={3}
                          className={cn(
                            "w-full border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-emerald-500/70 transition-colors resize-none",
                            theme === "dark"
                              ? "bg-white/[0.03] border-white/10 text-gray-300"
                              : "bg-white border-gray-250 text-gray-800",
                          )}
                        />
                        <MetadataValidator
                          value={analyzedModal.ind.description}
                          type="description"
                          lang="ind"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Keywords View and Editor (EN/ID) */}
                  <div className="space-y-4">
                    {["en", "ind"].map((lang) => (
                      <div key={lang}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[#a8a8a8]">
                            Kata Kunci ({lang === "en" ? "EN" : "ID"}) (
                            {
                              analyzedModal[lang as "en" | "ind"].keywords
                                .length
                            }
                            )
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  analyzedModal[
                                    lang as "en" | "ind"
                                  ].keywords.join(", "),
                                );
                                alert(
                                  `Keywords ${lang.toUpperCase()} disalin ke clipboard!`,
                                );
                              }}
                              className="text-[10.5px] text-blue-400 font-bold tracking-wider hover:underline"
                            >
                              Salin
                            </button>
                            <span className="text-[10px] text-gray-500 font-bold">•</span>
                            <button
                              onClick={() => {
                                const formatted = analyzedModal[lang as "en" | "ind"].keywords
                                  .map((k) => k.replace(/#/g, "").trim().toLowerCase())
                                  .filter((k, idx, self) => k && self.indexOf(k) === idx)
                                  .slice(0, 50)
                                  .join(", ");
                                navigator.clipboard.writeText(formatted);
                                alert(
                                  `Keywords ${lang.toUpperCase()} (Format Stock: Maks 50 kata, koma, huruf kecil) disalin ke clipboard!`
                                );
                              }}
                              className="text-[10.5px] text-emerald-400 hover:text-emerald-300 font-bold tracking-wider hover:underline flex items-center gap-1"
                              title="Salin untuk form kontributor Shutterstock, Adobe Stock, dll. (Huruf kecil, tanpa #, dipisahkan koma, maks 50 kata)"
                            >
                              <Copy size={9} />
                              Salin Format Stock
                            </button>
                          </div>
                        </div>

                        <div className={cn(
                            "max-h-[100px] overflow-y-auto p-3.5 border rounded-xl space-y-3",
                            theme === "dark"
                              ? "bg-white/[0.02] border-white/5"
                              : "bg-white border-gray-200",
                          )}>
                          <div className="flex flex-wrap gap-1.5">
                            {analyzedModal[lang as "en" | "ind"].keywords.map(
                              (tag, i) => (
                                <span
                                  key={i}
                                  onClick={() => {
                                    const nextTags = analyzedModal[
                                      lang as "en" | "ind"
                                    ].keywords.filter(
                                      (_, tagIdx) => tagIdx !== i,
                                    );
                                    setAnalyzedModal((prev) => ({
                                      ...prev,
                                      [lang]: {
                                        ...prev[lang as "en" | "ind"],
                                        keywords: nextTags,
                                      },
                                    }));
                                  }}
                                  className={cn(
                                    "px-2 py-0.5 border text-[9px] rounded-md cursor-pointer transition-colors",
                                    theme === "dark"
                                      ? "bg-blue-500/10 hover:bg-red-500/20 hover:text-red-300 border-blue-500/20 hover:border-red-500/30 text-blue-300"
                                      : "bg-blue-50 hover:bg-red-50 hover:text-red-650 border-blue-100 hover:border-red-200 text-blue-600",
                                  )}
                                  title="Klik untuk menghapus"
                                >
                                  #{tag}
                                </span>
                              ),
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder="Tambah kata kunci..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === ",") {
                                e.preventDefault();
                                const val = e.currentTarget.value
                                  .trim()
                                  .replace(/,/g, "");
                                if (
                                  val &&
                                  !analyzedModal[
                                    lang as "en" | "ind"
                                  ].keywords.includes(val)
                                ) {
                                  setAnalyzedModal((prev) => ({
                                    ...prev,
                                    [lang]: {
                                      ...prev[lang as "en" | "ind"],
                                      keywords: [
                                        ...prev[lang as "en" | "ind"].keywords,
                                        val,
                                      ],
                                    },
                                  }));
                                }
                                e.currentTarget.value = "";
                              }
                            }}
                            className={cn(
                              "w-full text-[10px] px-3 py-1.5 rounded-lg border focus:outline-none focus:border-blue-500 font-sans",
                              theme === "dark"
                                ? "bg-white/[0.04] border-white/5 text-gray-300"
                                : "bg-white border-gray-250 text-gray-700",
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kategori Tumbuhan / Foto (Single Edit) */}
                {currentId && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block mb-1 font-sans">
                      Kategori Tumbuhan / Foto (Edit)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {["Alam", "Budaya", "Arsitektur", "Fauna & Flora", "Portrait", "Landscape", "Commercial", "Lainnya"].map((cat) => {
                        const currentPhotoObj = photos.find((p) => p.id === currentId);
                        const isCatSelected = currentPhotoObj?.categories?.includes(cat) || false;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              const photoObj = photos.find((p) => p.id === currentId);
                              if (photoObj) {
                                const currentCats = photoObj.categories || [];
                                const updatedCats = currentCats.includes(cat)
                                  ? currentCats.filter((c) => c !== cat)
                                  : [...currentCats, cat];
                                updatePhoto(currentId, { categories: updatedCats });
                              }
                            }}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-xl border transition-all active:scale-95 cursor-pointer font-sans",
                              isCatSelected
                                ? theme === "dark"
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                                  : "bg-emerald-50 border-emerald-250 text-emerald-700 shadow-inner"
                                : theme === "dark"
                                  ? "bg-white/5 border-white/5 hover:border-white/10 text-gray-400 hover:text-white"
                                  : "bg-gray-50 border-gray-150 hover:bg-gray-100 text-gray-650 hover:text-gray-850"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isCatSelected}
                              readOnly
                              className="accent-emerald-500 cursor-pointer w-3.5 h-3.5 rounded"
                            />
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Deskripsi Singkat/Catatan Khusus untuk Single Edit */}
                {currentId && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#a8a8a8] block font-sans">
                      Deskripsi Singkat / Catatan Khusus
                    </span>
                    <textarea
                      rows={2}
                      placeholder="Identifikasi spesies, catatan lokasi, keunikan, dll."
                      value={photos.find((p) => p.id === currentId)?.customNotes || ""}
                      onChange={(e) => {
                        updatePhoto(currentId, { customNotes: e.target.value });
                      }}
                      className={cn(
                        "w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500/70 transition-colors resize-none font-sans",
                        theme === "dark"
                          ? "bg-[#141414] border-white/10 text-white placeholder:text-gray-600"
                          : "bg-white border-gray-250 text-gray-800 placeholder:text-gray-400",
                      )}
                    />
                  </div>
                )}

                {/* Confirm Actions and Emergency Alerts */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => {
                        const alertData = {
                          en: analyzedModal.en,
                          id: analyzedModal.id,
                        };
                        alert(
                          `[DEBUG BACKUP DATA]\n\nEN Title: ${alertData.en.title}\n\nID Title: ${alertData.id.title}\n\nEN Keywords (${alertData.en.keywords.length}): ${alertData.en.keywords.join(", ")}\n\nID Keywords (${alertData.id.keywords.length}): ${alertData.id.keywords.join(", ")}`,
                        );
                      }}
                      type="button"
                      className={cn(
                        "px-4 py-3 font-sans font-bold text-xs rounded-xl transition-all border cursor-pointer active:scale-95",
                        theme === "dark"
                          ? "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-white/5"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-250",
                      )}
                    >
                      💡 Tes Cadangan Alert
                    </button>

                    <button
                      onClick={() =>
                        setAnalyzedModal((prev) => ({ ...prev, isOpen: false }))
                      }
                      type="button"
                      className="flex-1 py-3 bg-blue-600 font-sans font-bold hover:bg-blue-500 text-xs text-white rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-center flex items-center justify-center gap-1.5"
                    >
                      ✓ Simpan & Konfirmasi
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
