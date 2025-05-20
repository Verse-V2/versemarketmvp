# Matchup View Live Feature

## Overview

The `MatchupViewLive` component, presumably located in `app/matchupViewLive/page.tsx`, is a Next.js page responsible for displaying a detailed comparison between two fantasy football teams for a specific matchup, with a focus on live scoring data derived from a user's specific entry. This view is accessed when a user clicks on a "fantasy matchup" type entry from their "My Entries" page, and then selects a particular matchup within that entry (which can be part of a parlay).

## Functionality

The primary goal of this component is to present a comprehensive side-by-side view of two fantasy teams. It mirrors much of the `MatchupView` functionality but sources critical live/final data (team points, starter lists, and starter points) directly from the user's `fantasyMatchupEntries` record when a player's game is 'InProgress' or 'Final'.

## Data Fetching and Processing

The component fetches and processes data with the following key distinctions for live/final games:

1.  **Navigation and Entry Context**:
    *   The page is navigated to from the "My Entries" page, by selecting a "fantasy matchup" entry and then a specific pick/matchup within that entry.
    *   Crucially, it will need access to the `fantasyMatchupEntryId` and the specific `pickIndex` (or a similar identifier) from the URL or navigation state to locate the correct data within `fantasyMatchupEntries`.

2.  **Matchup ID and Base Data Parsing**:
    *   It likely still uses a `matchupId` (e.g., `{leagueId}-{week}-{teamAId}-{teamBId}`) obtained from the selected pick to fetch foundational matchup details (like team names, logos, initial projected points if games are not live).
    *   The current season is fetched from Firebase `config`.

3.  **User Entry Data Retrieval (`fantasyMatchupEntries`)**:
    *   The component fetches the specific user entry using `firebaseService.getFantasyMatchupEntryById(fantasyMatchupEntryId)` (or a similar function).
    *   From this entry, it accesses the relevant `pick` (based on `pickIndex`). This pick contains the two `Teams` involved in the selected matchup.

4.  **Conditional Data Sourcing (The Core Twist)**:
    *   **For Players in 'InProgress' or 'Final' Games**:
        *   **Team Points**: The `fantasyPoints` for each team (Team A and Team B) are taken directly from `entry.picks[pickIndex].Teams[teamIndex].fantasyPoints`.
        *   **Starters List**: The list of `starters` (player IDs) for each team is taken from `entry.picks[pickIndex].Teams[teamIndex].starters`. This list dictates which players are displayed.
        *   **Starter Points**: The `statsBasedPoints` for each individual starter are taken from `entry.picks[pickIndex].Teams[teamIndex].startersPoints` (matching by `playerId`).
    *   **For Players in 'Scheduled' Games (or if entry data is supplemental)**:
        *   The system likely falls back to the standard `firebaseService.getFantasyMatchups` and `firebaseService.getPlayerById` logic, similar to `MatchupView`, to get projected points and player details.
        *   Alternatively, the `fantasyMatchupEntries` might store projected points as well, which would be prioritized.
    *   The `getPlayerGameResult`, `getPlayerGameStats`, and `getGameStatus` helper functions (or adapted versions) are still used to determine game status and fetch descriptive text for game situations, scores, and individual player real-world stats.

5.  **Team Data Setup**:
    *   Team data (`teamName`, `logoUrl`, `owner` etc.) is initially set up, likely from `firebaseService.getFantasyMatchups` or potentially from the `fantasyMatchupEntries` if it stores this redundantly.
    *   The `points` for `TeamData` will be dynamically updated based on the conditional sourcing described above (from `fantasyMatchupEntries` if live/final, otherwise from projections).

6.  **Player Data Aggregation and Processing**:
    *   The list of players to display is primarily determined by the `starters` arrays from the `fantasyMatchupEntries.picks[pickIndex].Teams`.
    *   For each player:
        *   Core player details (`name`, `NFL team`, `position`, `imageUrl`) are fetched using `firebaseService.getPlayerById`.
        *   Game status (`Scheduled`, `InProgress`, `Final`) is determined.
        *   **If `InProgress` or `Final`**:
            *   `points` are sourced from `fantasyMatchupEntries.picks[pickIndex].Teams[teamIndex].startersPoints`.
        *   **If `Scheduled`**:
            *   `projectedPoints` are sourced, likely from `firebaseService.getPlayerById` or general `fantasyMatchups` data, unless `fantasyMatchupEntries` also stores specific projections for the entry.
        *   `lastGameStats` and `gameStats` are populated using helper functions.
    *   This aggregated data is stored in the `playerMatchups` state.

7.  **State Management**: Similar to `MatchupView` (`loading`, `error`, `teamA`, `teamB`, `playerMatchups`).

## UI Rendering

The UI is expected to be nearly identical to `MatchupView`:

*   Loading, Error, and No Data states.
*   Main View:
    *   `Header` component.
    *   Teams Header: Displays logos, names, and scores (which are now sourced conditionally based on game status and entry data).
    *   Win Probability Bar (this might still use general matchup data or could be derived from the entry if available).
    *   Player Matchups: Displays player cards with images, names, NFL teams, game/stats info, and points (live/final points from entry, projected points otherwise).

## Helper Functions

*   `safeImage(url)`: Remains the same.
*   `getPlayerGameResult`, `getPlayerGameStats`, `getGameStatus`: These are likely reused, possibly with minor adaptations if the source of truth for status/scores needs to check the entry data first.
*   New helper functions might be introduced to specifically extract data from the `fantasyMatchupEntries` structure.

## Key Interfaces and Types

Many interfaces from `MatchupView` will be reused (`Player`, `TeamData`, `PlayerMatchup`, `StarterPoint`).
Key additions or modifications will revolve around the structure of `fantasyMatchupEntries` and its `picks`:

*   **`FantasyMatchupEntryPickTeam`** (New or existing, representing a team within a pick):
    *   `teamId`: string
    *   `teamName`: string (potentially)
    *   `logoUrl`: string (potentially)
    *   `fantasyPoints`: number (actual total points for this team in the entry)
    *   `starters`: string[] (list of player IDs for this team in the entry)
    *   `startersPoints`: Array of objects like `{ playerId: string, statsBasedPoints: number }` (actual points for each starter in the entry)
    *   (Possibly other fields like `projectedFantasyPoints` if stored per pick)

*   **`FantasyMatchupEntryPick`** (New or existing):
    *   `matchupId`: string
    *   `Teams`: Array of two `FantasyMatchupEntryPickTeam` objects.
    *   (Other pick-specific details)

*   **`FantasyMatchupEntry`** (New or existing):
    *   `id`: string
    *   `userId`: string
    *   `picks`: Array of `FantasyMatchupEntryPick` objects.
    *   (Other entry details like wager amount, status, etc.)

The crucial change is the new data pipeline that prioritizes information from `fantasyMatchupEntries` for games that are `InProgress` or `Final`, ensuring the displayed scores and player points reflect the state of that specific user's entry. 