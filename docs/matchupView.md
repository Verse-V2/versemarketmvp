# Matchup View Feature

## Overview

The `MatchupView` component, located in `app/matchupView/page.tsx`, is a Next.js page responsible for displaying a detailed comparison between two fantasy football teams for a specific matchup.

## Functionality

The primary goal of this component is to present a comprehensive side-by-side view of two fantasy teams, including their overall projected and actual scores, win probabilities, and individual player matchups.

## Data Fetching and Processing

The component fetches and processes data in the following manner:

1.  **Matchup ID Parsing**:
    *   It retrieves the `matchupId` from the URL search parameters.
    *   The `matchupId` is expected to be in the format: `{leagueId}-{week}-{teamAId}-{teamBId}`.
    *   If the ID is missing or improperly formatted, an error state is triggered.

2.  **Configuration Fetching**:
    *   It fetches the current season information from the Firebase `config` collection using `firebaseService.getConfig()`.
    *   An error occurs if the configuration or current season cannot be retrieved.

3.  **Matchup Data Retrieval**:
    *   It calls `firebaseService.getFantasyMatchups(leagueId, season, week)` to obtain all matchups for the specified league, season, and week.
    *   It then filters these matchups to find the one matching the provided `matchupId`.
    *   If the specific matchup isn't found, an error state is shown.

4.  **Team Data Setup**:
    *   Once the correct matchup is identified, data for Team A and Team B is extracted. This includes:
        *   `teamId`, `teamName`, `logoUrl`
        *   `fantasyPoints` (actual points)
        *   `projectedFantasyPoints`
        *   `winProbability`
        *   `moneylineOdds`
        *   `serviceProvider` (currently used as the owner's name)
    *   This data is stored in the `teamA` and `teamB` state variables.

5.  **Player Data Aggregation and Processing**:
    *   The component iterates through the `starters` array of `matchup.teamA`.
    *   For each starter from Team A, it attempts to find a corresponding starter from `matchup.teamB.starters` based on the array index.
    *   For each player (Player A and, if present, Player B), the following data is fetched and processed:
        *   **Core Player Details**: Fetched using `firebaseService.getPlayerById(playerId)`.
        *   **Game Status**: Determined by `getGameStatus(playerId)`, which queries the `events` collection in Firebase based on the player's team, season, and week. Returns 'Scheduled', 'InProgress', or 'Final'.
        *   **Game Result/Details**: `getPlayerGameResult(playerId)` fetches event data to construct a descriptive string about the game:
            *   **Final**: "Final [W/L/T] [ScoreA]-[ScoreB] vs [Opponent]"
            *   **In Progress**: "[TimeRemaining] [Quarter/Status] [ScoreA]-[ScoreB] vs [Opponent]" (e.g., "5:11 Q2 14-19 vs GB")
            *   **Scheduled**: "[Day] [Time]am/pm vs [Opponent]" (e.g., "Sun 4:25pm vs GB")
        *   **Player Game Stats**: `getPlayerGameStats(playerId)` queries the `playerGameScores` collection for the player, season, and week. It formats relevant stats (passing, rushing, receiving) into a string like "250 Pass Yds, 2 Pass TD, 60 Rush Yds".
        *   **Actual Points**: `getPlayerStatsBasedPoints(playerId)` retrieves `statsBasedPoints` for a starter if their game is 'InProgress' or 'Final'. This data comes from the `startersPoints` array within the `MatchupTeam` object.
        *   **Projected Points**: `getPlayerProjectedPoints(playerId)` retrieves `projectedPoints` for a starter. This data comes from the `starterProjectedPoints` array within the `MatchupTeam` object.
    *   The aggregated data for each player pair is then transformed and stored in the `playerMatchups` state variable.

6.  **State Management**:
    *   `loading`: A boolean state to indicate when data is being fetched.
    *   `error`: A string state to store any error messages encountered during data fetching or processing.
    *   `teamA`, `teamB`: Store `TeamData` for the two teams.
    *   `playerMatchups`: Stores an array of `PlayerMatchup` objects.

## UI Rendering

The component renders the following UI elements:

1.  **Loading State**: If `loading` is true, a centered spinner is displayed.
2.  **Error State**: If `error` is not null, an error message and a "Go Back" button (using `window.history.back()`) are shown.
3.  **No Data State**: If `teamA` or `teamB` is null after loading (and no error), a "No data available" message is displayed.
4.  **Main View** (when data is successfully loaded):
    *   **`Header` Component**: A shared header component is rendered at the top.
    *   **Teams Header Section**:
        *   A `div` with a `bg-zinc-900` background.
        *   **Team A Display (Left)**:
            *   Team logo (using `safeImage` helper).
            *   Team name (truncated if too long).
            *   Current points (if `teamA.points > 0`) or projected points, styled differently.
            *   "Current" or "Projected" label.
        *   **Center Logo**: A "Verse" icon (`/Icon_Original@2x.png`).
        *   **Team B Display (Right)**: Similar to Team A, but aligned to the right.
        *   **Win Probability Bar**:
            *   A full-width bar (`bg-gray-700`).
            *   A green gradient overlay representing Team A's win probability (`teamA.winProbability`). Defaults to 50% if probability is unavailable.
            *   The percentage text is centered on the bar.
            *   Small circular logos of Team A and Team B are overlaid at the left and right ends of the bar, respectively.
    *   **Player Matchups Section**:
        *   Iterates through the `playerMatchups` array. Each item is a `div` with `bg-zinc-900`.
        *   Each matchup is a two-column grid (`grid-cols-2`).
        *   **Player A Card (Left Column)**:
            *   Player image (using `safeImage`, fallback to `/player-images/default.png`).
            *   Player name and NFL team abbreviation.
            *   `lastGameStats` (game result/schedule string).
            *   `gameStats` (player's formatted game statistics, displayed if status is not 'Scheduled').
            *   **Points Display (Absolute Positioned)**:
                *   Shows projected points (white text) if game is 'Scheduled'.
                *   Shows actual points (green text) if game is 'InProgress' or 'Final'.
                *   A sub-label indicates 'Proj', 'Live', or 'Final'.
        *   **Player B Card (Right Column)**:
            *   Similar to Player A's card, but aligned to the right.
            *   If `matchup.playerB` is null, it displays "No matched player".
        *   **Position Label**:
            *   A `div` with `bg-zinc-800` at the bottom of each player matchup card, displaying the player's position (e.g., "QB", "WR").

## Helper Functions

*   **`safeImage(url?: string | null): string`**:
    *   Takes an optional URL string.
    *   Checks if the URL is null, or doesn't start with 'http://', 'https://', or '/'.
    *   If any of these conditions are true, it returns a path to a generic league logo (`/league-logos/generic-league-logo.svg`).
    *   Otherwise, it returns the original URL. This is used to prevent broken images and ensure valid image sources.

## Key Interfaces and Types

*   **`Player`**:
    *   `id`, `name`, `firstName`, `lastName`, `team` (NFL team), `position`
    *   `points` (actual fantasy points)
    *   `projectedPoints`
    *   `status`: 'Scheduled' | 'InProgress' | 'Final' (game status)
    *   `lastGameStats?`: String describing game result/time.
    *   `gameStats?`: String of player's performance stats.
    *   `imageUrl?`: URL for player's photo.
    *   `gameResult?`: (Seems related to `lastGameStats`, possibly redundant or for a different use).

*   **`TeamData`**:
    *   `id`, `teamName`, `owner`, `logoUrl`
    *   `points` (total actual points for the fantasy team)
    *   `projectedPoints` (total projected points)
    *   `winProbability?`
    *   `moneylineOdds?`

*   **`PlayerMatchup`**:
    *   `position`: The fantasy position for this matchup slot (e.g., QB, WR1).
    *   `playerA`: `Player` object for Team A's player in this slot.
    *   `playerB`: `Player` object for Team B's player, or `null` if no corresponding player.

*   **`StarterPoint`**:
    *   `playerId`: ID of the starter.
    *   `statsBasedPoints`: Actual points scored by the starter.

*   **`FantasyTeamMatchup`**: (Represents the structure of team data within the raw matchup object from Firebase)
    *   `id`, `leagueId`, `season`, `seasonWeek`, `teamId`, `teamName`, `logoUrl`
    *   `projectedFantasyPoints`, `fantasyPoints`
    *   `moneylineOdds`, `spreadFantasyPoints`, `matchupTotalFantasyPoints`, `winProbability`, `decimalOdds`
    *   `serviceProvider`
    *   `starters`: Array of player IDs.
    *   `startersPoints?`: Array of `StarterPoint` objects.

*   **`MatchupTeam`**: Extends `FantasyTeamMatchup`.
    *   `startersPoints`: `StarterPoint[]` (ensured to be present)
    *   `starterProjectedPoints?`: Array of objects mapping `playerId` to `projectedPoints`. This seems to be the source for individual player projected points.

This detailed structure allows the `MatchupView` to provide a rich and informative comparison for fantasy football enthusiasts. 