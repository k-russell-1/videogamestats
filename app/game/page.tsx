"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // For navigation

import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

// Ensure Amplify is configured
Amplify.configure(outputs);

// Generate the client
const client = generateClient<Schema>();

export default function GamePage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Array<Schema["playerId"]["type"]>>([]);
  const [teams, setTeams] = useState<Array<Schema["mlbTeam"]["type"]>>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Array<string>>([]);
  const [playerOrder, setPlayerOrder] = useState<Array<{ name: string; order: number }>>([]);
  const [isOrdering, setIsOrdering] = useState(false); // Flag to determine if players can be ordered
  const [orderInput, setOrderInput] = useState<{ [key: string]: number }>({}); // Track inputs for order
  const [selectedUserTeam, setSelectedUserTeam] = useState<string | undefined>();
  const [selectedOpponentTeam, setSelectedOpponentTeam] = useState<string | undefined>();
  const [lineup, setLineup] = useState<string[]>(new Array(9).fill("")); // Initialize the lineup array

  useEffect(() => {
    async function fetchPlayersAndTeams() {
      const { data: playerData } = await client.models.playerId.list();
      const { data: teamData } = await client.models.mlbTeam.list();
      setPlayers(playerData);
      setTeams(teamData);
    }
    fetchPlayersAndTeams();
  }, []);

  useEffect(() => {
    if (selectedPlayers.length === 0) {
      setOrderInput({});
      setPlayerOrder([]);
    }
  }, [selectedPlayers]);

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

  function handleOrderChange(playerName: string, newOrder: number) {
    setOrderInput((prev) => ({
      ...prev,
      [playerName]: newOrder,
    }));
  }

  function handleOkayClick() {
    const orders = Object.values(orderInput);
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) {
      alert("Please make sure you assign unique numbers for the order.");
      return;
    }

    const orderedPlayers = selectedPlayers
      .map((playerName) => ({ name: playerName, order: orderInput[playerName] }))
      .sort((a, b) => a.order - b.order);

    setPlayerOrder(orderedPlayers);
    setIsOrdering(false); // Hide the ordering input
  }

  function handleLineupChange(index: number, playerName: string) {
    const newLineup = [...lineup];
    newLineup[index] = playerName;
    setLineup(newLineup);
  }

  function handleTeamsSelection() {
    if (!selectedUserTeam || !selectedOpponentTeam) {
      alert("Please select both user and opponent teams.");
      return;
    }

    const gameId = Math.random().toString(36).substring(2, 27); // 25 alphanumeric characters

    // Helper function to turn values into strings or default to " "
    const toStringOrEmpty = (value: any) => (value == null ? " " : String(value));

    const query = new URLSearchParams({
      players: JSON.stringify(selectedPlayers),
      order: JSON.stringify(playerOrder),
      lineup: JSON.stringify(lineup), // Include the lineup in the query
      userTeam: toStringOrEmpty(selectedUserTeam),
      opponentTeam: toStringOrEmpty(selectedOpponentTeam),
      gameId: toStringOrEmpty(gameId),
    }).toString();

    router.push(`/gameEntry?${query}`);
  }

  return (
    <main style={{ padding: "20px", maxWidth: "100vw", overflowX: "hidden" }}>
  <h1>Game Setup</h1>

  <div style={{ display: "flex", flexWrap: "wrap", gap: "40px" }}>
    {/* Left Column: Player selection and ordering */}
    <div style={{ flex: "1", minWidth: "300px" }}>
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
                  selectedPlayers.length >= 3 &&
                  !selectedPlayers.includes(player.name || "")
                }
              />
              {player.name || "Unknown Player"}
            </label>
          </li>
        ))}
      </ul>
      <p>Selected Players: {selectedPlayers.join(", ")}</p>

      {/* OK Button for player ordering */}
      {selectedPlayers.length > 0 && !isOrdering && (
        <button onClick={() => setIsOrdering(true)}>OK</button>
      )}

      {/* Render ordering inputs */}
      {isOrdering && (
        <div style={{ marginTop: "20px", maxHeight: "300px", overflowY: "auto" }}>
          <h2>Order the players</h2>
          <ul>
            {selectedPlayers.map((playerName) => (
              <li key={playerName}>
                <label>
                  {playerName} - Batting Order:
                  <input
                    type="number"
                    min={1}
                    max={selectedPlayers.length}
                    value={orderInput[playerName] || ""}
                    onChange={(e) =>
                      handleOrderChange(playerName, parseInt(e.target.value, 10))
                    }
                  />
                </label>
              </li>
            ))}
          </ul>
          <button onClick={handleOkayClick}>Finalize Order</button>
        </div>
      )}
    </div>

    {/* Right Column: Lineup and team selection */}
    <div style={{ flex: "1", minWidth: "300px" }}>
      {playerOrder.length > 0 && (
        <>
          <h2>Enter Lineup</h2>
          <p>Enter player names for each position in the lineup:</p>
          <ul>
            {new Array(9).fill(null).map((_, index) => (
              <li key={index}>
                <label>
                  Position {index + 1}:
                  <input
                    type="text"
                    value={lineup[index]}
                    onChange={(e) => handleLineupChange(index, e.target.value)}
                  />
                </label>
              </li>
            ))}
          </ul>

          <h2>Select Teams</h2>
          <div>
            <label>
              User Team:
              <select
                value={selectedUserTeam ?? ""}
                onChange={(e) => setSelectedUserTeam(e.target.value)}
              >
                <option value="">Select a team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.name ?? "Unknown Team"}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <br />
          <div>
            <label>
              Opponent Team:
              <select
                value={selectedOpponentTeam ?? ""}
                onChange={(e) => setSelectedOpponentTeam(e.target.value)}
              >
                <option value="">Select a team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.name ?? "Unknown Team"}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <br />
          <button onClick={handleTeamsSelection}>Start Game</button>
        </>
      )}
    </div>
  </div>
</main>
  );
}
