"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { createContext, useContext } from "react";

interface GoogleProviderContextValue {
  clientId: string | null;
  isConfigured: boolean;
}

const Ctx = createContext<GoogleProviderContextValue>({
  clientId: null,
  isConfigured: false,
});

export const useGoogleConfig = () => useContext(Ctx);

export function GoogleProvider({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const isConfigured = !!clientId;

  if (!isConfigured) {
    // Client ID 未設定の場合は OAuth プロバイダーをスキップ
    return (
      <Ctx.Provider value={{ clientId: null, isConfigured: false }}>
        {children}
      </Ctx.Provider>
    );
  }

  return (
    <Ctx.Provider value={{ clientId, isConfigured: true }}>
      <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>
    </Ctx.Provider>
  );
}
