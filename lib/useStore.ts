"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Store } from "@/types";

export function useStore() {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("selected_store");
    if (!raw) {
      router.push("/select-store");
      return;
    }
    setStore(JSON.parse(raw));
  }, [router]);

  return store;
}
