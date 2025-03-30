"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

// Generate the client based on your schema
const client = generateClient<Schema>();

const GameEntryPageContent = () => {
  const searchParams = useSearchParams();
  const [gameData, setGameData] = useState<any>(null);
  const [selectedResult, setSelectedResult] = useState<string>("single");
  const [players, setPlayers] = useState<Array<{ id: number; name: string }>>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0); // Track the current player's index
  const [battingResults, setBattingResults] = useState<any[]>([]); // Store the batting results

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

    // Fetch players from the playerId model
    async function fetchPlayers() {
      const { data } = await client.models.playerId.list();

      // Filter out players where id or name is null
      const validPlayers = data.filter(
        (player) => player.id !== null && player.name !== null
      );

      // Now you can safely update the state with non-null players
      setPlayers(validPlayers as { id: number; name: string }[]);
    }

    fetchPlayers();
  }, [searchParams]);

  const handleResultChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedResult(event.target.value);
  };

  const handleOkClick = async () => {
    if (!gameData) return;

    const playerName = gameData.order[currentPlayerIndex].name; // Current player at bat
    const gameId = gameData.gameId;

    try {
      // Fetch the player's ID from the playerId table
      const playerResponse = await client.models.playerId.list({
        filter: { name: { eq: playerName } },
      });
      const playerData = playerResponse.data[0];

      if (!playerData || !playerData.id) {
        console.error("Player ID not found");
        return;
      }

      const playerId = playerData.id;

      // Insert event into the mlbPlayerEvent table
      const response = await client.models.mlbPlayerEvent.create({
        game_id: gameId,
        player_id: playerId,
        isBatting: true,
        result: selectedResult,
        inning: 1, // This is hardcoded for now; modify if needed
      });

      if (!response) {
        throw new Error("Failed to insert event");
      }

      console.log("Event inserted successfully");

      // Add the result to the battingResults array
      setBattingResults([
        ...battingResults,
        { playerName, result: selectedResult },
      ]);

      // Move to the next player in the order
      const nextPlayerIndex =
        currentPlayerIndex === gameData.order.length - 1
          ? 0
          : currentPlayerIndex + 1;
      setCurrentPlayerIndex(nextPlayerIndex);
    } catch (error) {
      console.error("Error inserting event:", error);
    }
  };

  if (!gameData) {
    return <div>Loading...</div>;
  }

  return (
    <main className="gameEntryPage">
      <div className="left-section">
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
      </div>
      <div className="center-section">
        <div className="at-bat-container">
          <span>{gameData.order[currentPlayerIndex].name} AB Result:</span>
          <select value={selectedResult} onChange={handleResultChange}>
            <option value="single">Single</option>
            <option value="double">Double</option>
            <option value="triple">Triple</option>
            <option value="homerun">Home Run</option>
            <option value="walk">Walk</option>
            <option value="HBP">HBP</option>
            <option value="error">Reached on Error</option>
            <option value="kswing">Strikeout Swinging</option>
            <option value="klook">Strikeout Looking</option>
            <option value="groundout">Groundout</option>
            <option value="flyout">Flyout</option>
            <option value="lineout">Lineout</option>
            <option value="sacfly">Sac Fly</option>
            <option value="sacbunt">Sac Bunt</option>
          </select>
          <button className="ok-button" onClick={handleOkClick}>
            OK
          </button>
        </div>

        <h3>Batting Results</h3>
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {battingResults.map((result, index) => (
              <tr key={index}>
                <td>{result.playerName}</td>
                <td>{result.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default function GameEntryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GameEntryPageContent />
    </Suspense>
  );
}
