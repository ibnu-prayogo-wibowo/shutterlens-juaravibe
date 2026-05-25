import React from "react";
import { motion } from "motion/react";
import { Camera, Image as ImageIcon, Sparkles, Download, CheckCircle2, ChevronRight, HelpCircle, ExternalLink } from "lucide-react";
import { AuthButton, saveUserProfile } from "./Auth";
import { cn } from "../lib/utils";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, googleProvider, setCachedAccessToken } from "../lib/firebase";

const Section = ({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) => (
  <section id={id} className={cn("py-20 px-6 max-w-7xl mx-auto", className)}>
    {children}
  </section>
);

const FeatureCard = ({ icon: Icon, title, description, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    viewport={{ once: true }}
    className="p-8 rounded-2xl bg-white/5 border border-white/10 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
  >
    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 blur-2xl rounded-full -mr-8 -mt-8 group-hover:bg-blue-600/10 transition-colors" />
    <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center mb-6 text-blue-400">
      <Icon size={24} />
    </div>
    <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
    <p className="text-gray-400 leading-relaxed text-sm">{description}</p>
  </motion.div>
);

export function LandingPage() {
  const handleHeroLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setCachedAccessToken(credential.accessToken);
      }
      if (result.user) {
        await saveUserProfile(result.user);
      }
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const steps = [
    {
      icon: ImageIcon,
      title: "Upload Foto",
      description: "Drag and drop ratusan foto sekaligus. Sistem kami memrosesnya di memori tanpa disimpan di server."
    },
    {
      icon: Sparkles,
      title: "AI Menganalisis",
      description: "Google Gemini AI secara otomatis mengenali objek, suasana, dan teknis foto untuk membuat metadata."
    },
    {
      icon: Download,
      title: "Download CSV",
      description: "Ekspor semua data ke format CSV yang kompatibel dengan Adobe Stock, Shutterstock, dan lainnya."
    }
  ];

  const faqs = [
    {
      q: "Apakah ShutterLens gratis?",
      a: "Ya, ShutterLens 100% gratis digunakan. Kami mengandalkan Google Cloud Free Tier untuk menjalankan layanan ini."
    },
    {
      q: "Apakah foto saya aman?",
      a: "Sangat aman. Foto Anda hanya diproses di memori server sementara untuk dianalisis oleh AI, kemudian langsung dihapus. Kami tidak menyimpannya di database."
    },
    {
      q: "Format apa yang didukung?",
      a: "Saat ini kami mendukung format JPEG dan PNG. Maksimal 100 foto per sesi upload untuk menjaga kecepatan."
    }
  ];

  return (
    <div className="bg-[#050505] text-gray-200 overflow-visible relative h-auto">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full -ml-32 -mb-32 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Camera size={18} className="text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white italic">ShutterLens</span>
            </div>

            {/* Shutterstock Profile Link */}
            <a 
              href="https://www.shutterstock.com/id/g/photogrhapy_ibnu_1" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 font-semibold text-xs border border-red-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 ml-2 shadow-sm"
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 font-semibold text-xs border border-cyan-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-sm"
              title="Kunjungi Profil 500px Saya"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
              <span>500px Profile</span>
              <ExternalLink size={10} className="opacity-60" />
            </a>
          </div>
          <AuthButton />
        </div>
      </header>

      {/* Hero */}
      <Section className="text-center pt-32 pb-40 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/5 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
            AI-Powered Metadata Tool
          </span>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] text-white italic">
            BEBASKAN WAKTUMU. <br /> 
            <span className="text-blue-500 font-serif not-italic">BIAR AI</span> YANG TULIS.
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Deskripsi, judul, dan keyword untuk ratusan foto dalam hitungan detik. Siap ekspor ke agensi microstock favorit Anda.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button 
              onClick={handleHeroLogin}
              className="bg-blue-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
            >
              Mulai Gratis Sekarang
            </button>
            <a href="#how-it-works" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-white transition-colors px-6 py-2">
              Lihat Cara Kerjanya <ChevronRight size={16} />
            </a>
          </div>
        </motion.div>
      </Section>

      {/* How it Works */}
      <div id="how-it-works" className="bg-white/[0.02] border-y border-white/5 relative z-10">
        <Section>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-white">Mulai dalam 3 Langkah</h2>
            <p className="text-gray-400">Alur kerja fotografer profesional yang dioptimalkan untuk kecepatan.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <FeatureCard key={i} {...step} delay={i * 0.1} />
            ))}
          </div>
        </Section>
      </div>

      {/* Demo / Showcase Visual */}
      <Section className="grid lg:grid-cols-2 gap-20 items-center overflow-hidden relative z-10">
        <div>
          <h2 className="text-4xl font-bold mb-6 text-white leading-tight">Analisis Visual <br /><span className="text-blue-500">Presisi Tinggi.</span></h2>
          <p className="text-lg text-gray-400 mb-8 leading-relaxed">
            AI kami tidak hanya mengenali objek, tapi juga memahami nuansa, mood, dan konteks foto. 
            Hasilnya adalah deskripsi yang mengundang klik dan kata kunci yang meningkatkan visibility karyamu.
          </p>
          <ul className="space-y-4">
            {[
              "Pengenalan objek makro & landscape detail",
              "Pemahaman konteks sosial & emosi",
              "Format siap pakai untuk Adobe Stock, Shutterstock, dll.",
              "Edit cepat langsung di dashboard"
            ].map((text, i) => (
              <li key={i} className="flex items-center gap-3 text-gray-300">
                <CheckCircle2 size={20} className="text-blue-500 flex-shrink-0" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="bg-[#111111] border border-white/10 rounded-3xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
              </div>
              <span className="text-[10px] uppercase tracking-tighter text-gray-500 font-mono">Dashboard Processing v.1.0</span>
            </div>
            
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-6 bg-gray-900 group">
              <img 
                src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" 
                className="w-full h-full object-cover opacity-80" 
                alt="Landscape"
              />
              <div className="absolute inset-0 border-2 border-blue-500/50 rounded-xl"></div>
              <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,1)] animate-pulse"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                  <span className="text-xs font-mono text-blue-400">Scanning Metadata... 92%</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="text-[10px] text-blue-400 uppercase font-bold block mb-1">Title</span>
                <p className="text-sm text-white">Cinematic Alpenglow over Dolomite Mountain Range</p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="text-[10px] text-blue-400 uppercase font-bold block mb-1">Keywords</span>
                <div className="flex flex-wrap gap-2">
                  {["Mountain", "Sunset", "Landscape", "Alps", "Golden Hour"].map(tag => (
                    <span key={tag} className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] text-blue-300">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="absolute -bottom-6 -right-6 bg-blue-600 p-4 rounded-2xl shadow-xl border border-white/20">
            <Download className="text-white" size={24} />
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section className="bg-white/5 text-white border border-white/5 rounded-[40px] my-20 relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <div className="w-16 h-16 rounded-full bg-blue-600/10 flex items-center justify-center mx-auto mb-6 text-blue-400">
               <HelpCircle size={32} />
            </div>
            <h2 className="text-3xl font-bold">Pertanyaan Umum</h2>
          </div>
          <div className="space-y-8">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-white/10 pb-8 last:border-0">
                <h3 className="text-xl font-medium mb-3 text-white">{faq.q}</h3>
                <p className="text-gray-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="mt-auto py-12 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-end gap-10">
          <div className="flex flex-wrap gap-16">
            <div>
              <span className="text-2xl font-bold text-white block mb-1">01</span>
              <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold">Upload Foto</p>
              <p className="text-xs text-gray-600 mt-1">Drag & Drop bulk upload</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-white block mb-1">02</span>
              <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold">AI Analysis</p>
              <p className="text-xs text-gray-600 mt-1">Auto keywords & titles</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-white block mb-1">03</span>
              <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold">Export CSV</p>
              <p className="text-xs text-gray-600 mt-1">Ready for Microstock</p>
            </div>
          </div>

          <div className="text-right text-[11px] text-gray-600 uppercase tracking-widest leading-relaxed">
            <p>© 2026 ShutterLens Ibnu Prayogo • Powered by Google Gemini • Secured with Firebase</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
