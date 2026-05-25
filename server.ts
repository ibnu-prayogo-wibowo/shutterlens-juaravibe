import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Detect GCP Project ID from Google Metadata Server dynamically (only in Cloud GCP environments)
  let gcpProjectId: string | null = null;
  try {
    const res = await fetch("http://metadata.google.internal/computeMetadata/v1/project/project-id", {
      headers: { "Metadata-Flavor": "Google" },
      signal: AbortSignal.timeout(1000)
    });
    if (res.ok) {
      gcpProjectId = (await res.text()).trim();
      console.log("Metadata server detected active Google Cloud Project ID:", gcpProjectId);
    }
  } catch (_) {
    // Non-GCP or local environment
  }

  // Safe lazy-loaded helper inside startServer to initialize GoogleGenAI
  let aiClient: GoogleGenAI | null = null;
  let lastApiKey: string | null = null;
  let isVertexServiceDisabled = false;

  function getAiClient(apiKeyOverride?: string): GoogleGenAI | null {
    const key = apiKeyOverride || process.env.GEMINI_API_KEY;
    if (key) {
      if (!aiClient || lastApiKey !== key) {
        console.log(apiKeyOverride ? "Using client-provided API Key" : "Using process.env.GEMINI_API_KEY");
        aiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
        lastApiKey = key;
      }
      return aiClient;
    }

    if (isVertexServiceDisabled) {
      return null;
    }

    if (aiClient) return aiClient;

    const resolvedProject = process.env.GOOGLE_CLOUD_PROJECT || gcpProjectId;
    if (!resolvedProject || resolvedProject === "shutterlens") {
      console.warn("No GEMINI_API_KEY or valid Google Cloud Project detected. Vertex AI Service Account initialization skipped. Please log in with Google (OAuth) or set your API key in Settings > Secrets.");
      return null;
    }

    try {
      console.log(`Initializing GoogleGenAI with Vertex AI (Service Account) on project: ${resolvedProject}...`);
      aiClient = new GoogleGenAI({
        vertexai: true,
        project: resolvedProject,
        location: process.env.GOOGLE_CLOUD_REGION || "asia-east1"
      });
      return aiClient;
    } catch (err: any) {
      console.warn("Failed to initialize Vertex AI client with Service Account:", err.message);
    }

    return null;
  }

  // API Routes
  app.post("/api/verify-key", async (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: "API Key required" });
    
    try {
        const ai = new GoogleGenAI({ apiKey });
        await ai.models.generateContent({
             model: "gemini-3.5-flash",
             contents: "test"
        });
        res.json({ valid: true });
    } catch (e: any) {
        console.error("Key verification failed:", e.message);
        res.status(401).json({ valid: false, error: e.message });
    }
  });

  app.post("/api/analyze", async (req, res) => {
    try {
      const { images, titles } = req.body; // array of base64 images and optional corresponding titles

      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "At least one image is required." });
      }

      // Check for user OAuth Bearer token
      const authHeader = req.headers.authorization || "";
      let userToken: string | null = null;
      if (authHeader.startsWith("Bearer ")) {
        userToken = authHeader.substring(7).trim();
      }

      const apiKey = req.headers['x-gemini-api-key'] as string;
      const ai = getAiClient(apiKey);
      const results = [];
      let anyDemo = false;
      let aiErrorReason: string | null = null;

      // Helper to generate professional-level metadata based on the raw file title/filename
      const getFallbackResult = (imgIndex: number) => {
        const titleInput = (titles && titles[imgIndex]) || "Scenic Photo Capture";
        
        // Strip file extensions and replace dashes/underscores with spaces
        let cleanName = titleInput.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
        if (!cleanName || cleanName.toLowerCase() === "image" || cleanName.toLowerCase() === "file") {
          cleanName = "Scenic Landscape Capture";
        }
        
        // Capitalize words nicely
        const formattedTitle = cleanName.replace(/\b\w/g, c => c.toUpperCase());
        
        // Generate high-density keywords based on words in filename and stock photography terms
        const wordTokens = cleanName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const microstockBackbone = [
          "photography", "microstock", "professional capture", "high resolution", 
          "shutterlens", "beautiful composition", "vibrant colors", "editorial shot", 
          "commercial stock", "digital image", "lens capture", "studio focus", 
          "depth of field", "sharp focus"
        ];
        
        const combinedKeywords = Array.from(new Set([...wordTokens, ...microstockBackbone]));
        // Make sure it has plenty of stock-friendly tags (30 to 50 tags)
        while (combinedKeywords.length < 35) {
          combinedKeywords.push("stock photo");
          combinedKeywords.push("exquisite shot");
          combinedKeywords.push("master class");
        }
        // Unique elements up to 40 titles
        const keywords = Array.from(new Set(combinedKeywords)).slice(0, 40);

        return {
          en: {
            title: `${formattedTitle} - Stock Photo`,
            description: `A professionally captured stock photograph featuring ${formattedTitle.toLowerCase()}. High resolution, perfect composition, suitable for creative digital media and commercial advertising.`,
            keywords: keywords,
          },
          id: {
            title: `${formattedTitle} - Foto Stock`,
            description: `Foto stok profesional yang menampilkan ${formattedTitle.toLowerCase()}. Resolusi tinggi, komposisi sempurna, cocok untuk media digital kreatif dan iklan komersial.`,
            keywords: keywords, // Using same keywords for now
          },
          demoMode: true
        };
      };

      const prompt = `Analisis visual gambar ini menggunakan istilah fotografi profesional.
      WAJIB berikan output JSON murni (tanpa markdown markers, tanpa teks tambahan) dengan struktur persis ini:
      {
        "title_id": "Judul dalam Bahasa Indonesia",
        "desc_id": "Deskripsi detail dalam Bahasa Indonesia",
        "keywords_id": ["keyword1", "keyword2", "..."],
        "title_en": "Title in English",
        "desc_en": "Detailed description in English",
        "keywords_en": ["keyword1", "keyword2", "..."]
      }`;

      for (let i = 0; i < images.length; i++) {
        const base64Data = images[i];
        let mimeType = "image/jpeg";
        // Do not strip prefix, model might need it to detect format
        let data = base64Data;

        // If the API insists on a specific format for inlineData, 
        // passing the base64 with the prefix might work better.
        // We will pass the full base64 string to inlineData.
        
        // Ensure mimeType is extracted for the inlineData object if needed
        if (base64Data.includes(";base64,")) {
          const parts = base64Data.split(";base64,");
          const mimeMatch = parts[0].match(/data:(.*?);/);
          mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        }

        let isAnalyzed = false;

        // Force use of API Key if available, ignore Vertex if not configured
        if (ai) {
          try {
            console.log(`Analyzing image ${i} using AI client with mimeType: ${mimeType}, dataPrefix: ${data.substring(0, 30)}...`);
            const response = await ai.models.generateContent({
              model: "gemini-3.5-flash",
              contents: {
                parts: [
                  { inlineData: { mimeType, data: data.substring(data.indexOf(',') + 1) } },
                  { text: prompt }
                ]
              },
              config: {
                responseMimeType: "application/json"
              }
            });

            let jsonText = response.text || "{}";
            jsonText = jsonText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
            const parsed = JSON.parse(jsonText);
            
            results.push({
              en: {
                title: parsed.title_en || "Untitled Photo",
                description: parsed.desc_en || "High quality image.",
                keywords: parsed.keywords_en || []
              },
              id: {
                title: parsed.title_id || "Foto Tanpa Judul",
                description: parsed.desc_id || "Foto berkualitas tinggi.",
                keywords: parsed.keywords_id || []
              },
              demoMode: false
            });
            isAnalyzed = true;
          } catch (apiError: any) {
            const errMsg = apiError.message || String(apiError);
            console.error(`AI analysis failed for index ${i}:`, errMsg);
            if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("aiplatform.googleapis.com") || errMsg.includes("SERVICE_DISABLED")) {
              console.warn("\x1b[33m%s\x1b[0m", "💡 TROUBLESHOOTING TIP: Vertex AI API is disabled or not configured properly. Disabling Vertex for this session.");
              isVertexServiceDisabled = true;
            }
          }
        }

        if (!isAnalyzed) {
          anyDemo = true;
          results.push(getFallbackResult(i));
        }
      }

      res.json({ results, demoMode: anyDemo, aiErrorReason });
    } catch (error: any) {
      console.error("General API Route Error:", error);
      res.status(500).json({ error: error.message || "Unknown error during AI analysis" });
    }
  });

  const startListening = () => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running at http://0.0.0.0:${PORT}`);
    });
  };

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    import("vite").then(({ createServer: createViteServer }) => {
      createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      }).then((vite) => {
        app.use(vite.middlewares);
        startListening();
      });
    });
  } else {
    // Correctly serve the production build
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    startListening();
  }
}

startServer();