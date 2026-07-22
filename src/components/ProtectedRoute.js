"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh - 4rem)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} className="spinner" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return user ? children : null;
}
