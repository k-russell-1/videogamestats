"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function GameEntryPageContent() {
  const searchParams = useSearchParams();
  const [gameData, setGameData] = useState<any>(null);

  useEffect(() => {
    if (searchParams) {
      const parsedData = {
        gameId: searchParams.get("gameId"),
        players: JSON.parse(searchParams.get("players") as string),
        order: JSON.parse(searchParams.get("order") as string),
        userTeam: searchParams.get("userTeam"),
        opponentTeam: searchParams.get("opponentTeam"),
      };
      setGameData(parsedData);
    }
  }, [searchParams]);

  if (!gameData) {
    return <div>Loading...</div>;
  }

  return (
    <main>
      <h1>Game Entry</h1>
      <h2>Game ID: {gameData.gameId}</h2>
      <h3>Selected Players and Batting Order</h3>
      <ul>
        {gameData.order.map((player: any) => (
          <li key={player.name}>
            {player.name} - Batting Order: {player.order}
          </li>
        ))}
      </ul>
      <h3>Teams</h3>
      <p>User Team: {gameData.userTeam}</p>
      <p>Opponent Team: {gameData.opponentTeam}</p>
    </main>
  );
}

export default function GameEntryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GameEntryPageContent />
    </Suspense>
  );
}