"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CampaignsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/sim/play");
  }, [router]);
  return null;
}
