"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const GameRecapContent = () => {
  const searchParams = useSearchParams();
  const gameId = searchParams?.get("gameId") || "N/A";

  return (
    <main style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", flexDirection: "column" }}>
      <h1>Game Recap</h1>
      <h2 style={{ marginTop: "20px", fontSize: "24px" }}>
        Game ID: {gameId !== "N/A" ? gameId : <span style={{ color: "red" }}>Not Found</span>}
      </h2>
    </main>
  );
};

export default function GameRecap() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GameRecapContent />
    </Suspense>
  );
}
