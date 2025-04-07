"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { useRouter } from "next/navigation";

// Generate the client based on your schema
const client = generateClient<Schema>();

const GameEntryPageContent = () => {
  const searchParams = useSearchParams();
  const [gameData, setGameData] = useState<any>(null);
  const [selectedResult, setSelectedResult] = useState<string>("single");
  const [selectedRbi, setSelectedRbi] = useState<number>(0);
  const [players, setPlayers] = useState<Array<{ id: number; name: string }>>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0); // Track the current player's index
  const [battingResults, setBattingResults] = useState<any[]>([]); // Store the batting results
  const [currentInning, setCurrentInning] = useState<number>(1); // Track the current inning
  const [userScore, setUserScore] = useState<number>(0); // User score
  const [opponentScore, setOpponentScore] = useState<number>(0); // Opponent score
  const [rotationIndex, setRotationIndex] = useState<number>(0); // Track the current player index in the lineup
  const [lineupIndexModNine, setLineupIndexModNine] = useState(1);  // Start at 1



  useEffect(() => {
    if (searchParams) {
      const parsedData = {
        gameId: searchParams.get("gameId"),
        players: JSON.parse(searchParams.get("players") as string),
        order: JSON.parse(searchParams.get("order") as string),
        lineup: JSON.parse(searchParams.get("lineup") as string), // Add lineup from query params
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

  const handleRbiChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRbi(Number(event.target.value));
  };

  const handleOkClick = async () => {
    if (!gameData) return;
  
    // Get the current player at bat
    const playerName = gameData.order[currentPlayerIndex].name;
    const gameId = gameData.gameId;
  
    // Create a new index that loops through lineup (mod 9)
    const playerLineupName = gameData.lineup[(lineupIndexModNine - 1) % 9];  // Subtract 1 to align with zero-based index

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
        player_name: playerLineupName,  // Upload the player from the lineup at the mod 9 index
        isBatting: true,
        result: selectedResult,
        inning: currentInning, // Pass the current inning
        rbi: selectedRbi, // Pass the RBI value
      });
  
      if (!response) {
        throw new Error("Failed to insert event");
      }
  
      console.log("Event inserted successfully");
  
      // Append the result to the battingResults array
      setBattingResults((prevResults) => {
        const newResults = [
          ...prevResults,  // Keep previous results in order
          { playerName, result: selectedResult, rbi: selectedRbi, inning: currentInning },  // Add new result to the end
        ];

        // Handle rotation behavior based on the number of rows
        if (newResults.length <= 12) {
            // If fewer than 12 rows, rotate the players as before
            if (newResults.length > 12) {
              setRotationIndex((prevRotationIndex) => (prevRotationIndex + 1) % gameData.lineup.length);
            }
          } else {
            // When 12 or more rows exist, use the normal behavior for rotating the lineup
            setRotationIndex((prevRotationIndex) => (prevRotationIndex + 5) % gameData.lineup.length);
            newResults.shift(); // Remove the first result to keep the table size at 12
          }
  
        // Keep only the latest 12 rows
        return newResults.slice(-12); // Ensure no more than 12 rows in the table
      });
  
      // Move to the next player in the batting order (currentPlayerIndex rotation logic stays the same)
      const nextPlayerIndex = currentPlayerIndex === gameData.order.length - 1 ? 0 : currentPlayerIndex + 1;
      setCurrentPlayerIndex(nextPlayerIndex);

      setLineupIndexModNine((prevIndex) => (prevIndex % 9) + 1); // Increment and wrap using mod 9 (1-9)
  
    } catch (error) {
      console.error("Error inserting event:", error);
    }
  };


  const handleEndInning = () => {
    setCurrentInning((prevInning) => prevInning + 1);
  };

  const router = useRouter(); // Initialize the router

  const handleEndGameClick = async () => {
    const userScore = prompt("Enter the score for the User Team:");
    const opponentScore = prompt("Enter the score for the Opponent Team:");
  
    const userScoreInt = parseInt(userScore ?? "0", 10);
    const opponentScoreInt = parseInt(opponentScore ?? "0", 10);
  
    const gameDataList = {
      gameId: gameData.gameId,
      userTeam: gameData.userTeam,
      opponentTeam: gameData.opponentTeam,
      userScore: userScoreInt,
      opponentScore: opponentScoreInt,
    };
  
    console.log("Uploading game results:", gameDataList);
  
    if (!client.models.mlbGameInfo) {
      console.error("Error: mlbGameInfo model is undefined.");
      return;
    }
  
    try {
      await client.models.mlbGameInfo.create({
        id: gameDataList.gameId,
        user_team: gameDataList.userTeam,
        opponent_team: gameDataList.opponentTeam,
        user_score: gameDataList.userScore,
        opponent_score: gameDataList.opponentScore,
      });
  
      alert("Game results uploaded successfully.");
  
      // Redirect to gameRecap page with gameId as a query parameter
      router.push(`/gameRecap?gameId=${gameDataList.gameId}`);
    } catch (error) {
      console.error("Error uploading game results:", error);
      alert("Failed to upload game results.");
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
        
        {/* Add the table for the lineup here */}
        <h3>Lineup</h3>
<ul style={{ listStyleType: "none", paddingLeft: "0" }}>
  {gameData.lineup.map((player: string, index: number) => (
    <li key={index}>
      Position {index + 1}: {player || "Not Set"}
    </li>
  ))}
</ul>
        
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
          <span>RBI:</span>
          <select value={selectedRbi} onChange={handleRbiChange}>
            {[0, 1, 2, 3, 4].map((rbiValue) => (
              <option key={rbiValue} value={rbiValue}>
                {rbiValue}
              </option>
            ))}
          </select>
          <button className="ok-button" onClick={handleOkClick}>
            OK
          </button>
        </div>

        

        <h3>Batting Results</h3>
        <table style={{ borderSpacing: "10px", borderCollapse: "collapse", width: "100%" }}>
  <thead>
    <tr>
      <th style={{ padding: "8px 16px", textAlign: "left", backgroundColor: "#f4f4f4", fontWeight: "bold" }}>
        Player
      </th>
      <th style={{ padding: "8px 16px", textAlign: "left", backgroundColor: "#f4f4f4", fontWeight: "bold" }}>
        Result
      </th>
      <th style={{ padding: "8px 16px", textAlign: "left", backgroundColor: "#f4f4f4", fontWeight: "bold" }}>
        RBI
      </th>
      <th style={{ padding: "8px 16px", textAlign: "left", backgroundColor: "#f4f4f4", fontWeight: "bold" }}>
        Inning
      </th>
      <th style={{ padding: "8px 16px", textAlign: "left", backgroundColor: "#f4f4f4", fontWeight: "bold" }}>
        Hitter
      </th>
    </tr>
  </thead>
  <tbody>
    {battingResults.map((result, index) => (
      <tr key={index}>
        <td style={{ padding: "8px 16px", textAlign: "left" }}>{result.playerName}</td>
        <td style={{ padding: "8px 16px", textAlign: "left" }}>{result.result}</td>
        <td style={{ padding: "8px 16px", textAlign: "left" }}>{result.rbi}</td>
        <td style={{ padding: "8px 16px", textAlign: "left" }}>{result.inning}</td>
        <td style={{ padding: "8px 16px", textAlign: "left" }}>
          {/* Display the player from the lineup based on the rotation index */}
          {gameData.lineup[(rotationIndex + index) % gameData.lineup.length] || "Not Set"}
        </td>
      </tr>
    ))}
  </tbody>
</table>



        <button onClick={handleEndInning} style={{ marginTop: "20px" }}>
          End Inning
        </button>
        <p>End Inning {currentInning}</p>

        <div>
        <button
          onClick={handleEndGameClick}
          style={{
            backgroundColor: "red",
            color: "white",
            padding: "10px 20px",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
            marginTop: "20px",
          }}
        >
          End Game
        </button>
      </div>
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







