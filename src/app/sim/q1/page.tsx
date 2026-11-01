"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Q1Page() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/sim/play");
  }, [router]);
  return null;
}
