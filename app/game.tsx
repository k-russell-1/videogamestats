"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

export default function GamePage() {
  const { id } = useParams();
  const [players, setPlayers] = useState<Array<Schema["playerId"]["type"]>>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Array<string>>([]);

  useEffect(() => {
    async function fetchPlayers() {
      const { data } = await client.models.playerId.list();
      setPlayers(data);
    }
    fetchPlayers();
  }, []);

  function togglePlayerSelection(playerName: string) {
    setSelectedPlayers((prev) => {
      if (prev.includes(playerName)) {
        return prev.filter((name) => name !== playerName);
      }
      if (prev.length < 3) {
        return [...prev, playerName];
      }
      return prev;
    });
  }

  return (
    <main>
      <h1>Game {id}</h1>
      <h2>Select up to 3 players</h2>
      <ul>
  {players.map((player) => (
    <li key={player.id}>
      <label>
        <input
          type="checkbox"
          checked={selectedPlayers.includes(player.name || "")}
          onChange={() => togglePlayerSelection(player.name || "")}
          disabled={
            selectedPlayers.length >= 3 && !selectedPlayers.includes(player.name || "")
          }
        />
        {player.name || "Unknown Player"}
      </label>
    </li>
  ))}
</ul>
      <p>Selected Players: {selectedPlayers.join(", ")}</p>
    </main>
  );
}
