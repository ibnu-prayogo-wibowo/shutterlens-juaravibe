export interface PhotoMetadata {
  id: string;
  url: string;
  extension?: string;
  englishMetadata: { title: string; description: string; keywords: string[] };
  indonesianMetadata: { title: string; description: string; keywords: string[] };
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
  demoMode?: boolean;
  categories?: string[];
  customNotes?: string;
  filter?: 'none' | 'grayscale' | 'sepia';
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}
