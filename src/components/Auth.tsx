import { signInWithPopup, signOut, onAuthStateChanged, User, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, googleProvider, setCachedAccessToken, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { useEffect, useState } from "react";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { cn } from "../lib/utils";

export async function saveUserProfile(user: User) {
  const userRef = doc(db, "users", user.uid);
  try {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "",
      photoURL: user.photoURL || "",
      lastActive: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

export function AuthButton({ className }: { className?: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        saveUserProfile(user).catch(console.error);
      } else {
        setCachedAccessToken(null);
      }
      setLoading(false);
    });
  }, []);

  const login = async () => {
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

  const logout = async () => {
    try {
      await signOut(auth);
      setCachedAccessToken(null);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (loading) return <div className="w-10 h-10 rounded-full animate-pulse bg-white/5" />;

  if (user) {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <div className="flex items-center gap-2">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || ""} className="w-8 h-8 rounded-full border border-white/10" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <UserIcon size={16} className="text-gray-400" />
            </div>
          )}
          <span className="text-sm font-medium hidden sm:inline-block text-white">{user.displayName}</span>
        </div>
        <button
          onClick={logout}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className={cn(
        "flex items-center gap-2 px-6 py-2 bg-white text-black rounded-full font-bold transition-all hover:bg-gray-200 active:scale-95",
        className
      )}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      <span>Mulai Gratis</span>
    </button>
  );
}
