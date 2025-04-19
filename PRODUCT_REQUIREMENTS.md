# Product Requirements Document: Verse Prediction Market MVP

**Version:** 1.0
**Date:** 2024-07-26

## 1. Introduction & Goal

The primary goal of this project is to build a Minimum Viable Product (MVP) web application to test the viability of integrating prediction markets into the existing Verse mobile app ecosystem. The Verse app currently offers fantasy sports betting, and this MVP will help determine user interest and engagement with prediction markets, as well as provide insights into managing prediction market odds based on real user betting behavior.

## 2. Target Audience

The target users are young individuals, primarily existing or potential Verse app users, who enjoy gambling, particularly on fantasy sports and prediction market outcomes. They are likely tech-savvy and expect a modern, fast user experience.

## 3. Scope & High-Level Goals (MVP)

*   **Build a web version** mimicking core navigation and potentially some features of the Verse mobile app.
*   **Integrate Prediction Markets:** Implement the core functionality for users to view, interact with, and bet on prediction markets.
*   **Learning Objective:** Gain practical experience and data on how users interact with prediction markets and how to effectively manage market odds based on betting volume and patterns.
*   **Viability Testing:** Assess user engagement and potential for prediction markets as a feature within the broader Verse platform.

## 4. Key Features

Based on user requirements and existing codebase components, the MVP will include:

### 4.1. Core Navigation (`components/bottom-nav.tsx`)

A persistent bottom navigation bar providing access to the main sections of the application:

*   **Home (`app/page.tsx`):** Landing page, likely displaying featured prediction markets or overview. (Initial implementation exists)
*   **Store (`app/store/`):** Section for purchasing virtual currency or packages. (`app/store/` exists, `components/ui/package-card.tsx`, `components/ui/purchase-sheet.tsx` likely support this).
*   **My Entries (`app/my-entries/`):** Area for users to view their active bets and history. (`app/my-entries/` exists, likely uses `components/ui/bet-slip.tsx` or similar).
*   **Rewards:** Section for viewing/claiming rewards. (Directory not observed, needs implementation).
*   **Account (`app/auth/`):** User profile, settings, authentication management. (`app/auth/` exists).

### 4.2. Prediction Markets (`app/events/`?, `components/ui/market-card.tsx`, `components/ui/market-detail-card.tsx`)

*   **Market Discovery:** Browse and view available prediction markets (likely displayed on Home or a dedicated Events/Markets page).
*   **Market Details:** View details of a specific market, including current odds, potential outcomes, rules, and historical price charts (`components/simple-price-chart.tsx` exists).
*   **Placing Bets:** Functionality for users to place bets on market outcomes (`components/ui/bet-slip.tsx` exists).
*   **Market Resolution:** (Backend/Logic) Mechanism for settling markets once the outcome is known.

### 4.3. User Interface & Experience

*   **Header (`components/ui/header.tsx`):** Consistent header across pages.
*   **Currency Toggle (`components/currency-toggle.tsx`):** Allow users to switch currency views if applicable.
*   **Theme (`components/theme-provider.tsx`, `components/theme-toggle.tsx`):** Support for light/dark mode.
*   **Sharing (`components/ui/share-dialog.tsx`):** Allow users to share markets.

## 5. Technical Requirements & Principles

*   **Technology Stack:** Next.js, React, TypeScript (as observed).
*   **Architecture:** Maintain a modern and organized codebase structure.
*   **Development Velocity:** Prioritize speed of development for the MVP.
*   **User Experience (UX):** Deliver a fast, modern, and intuitive user interface. Utilize existing UI components (Shadcn/ui likely, based on `components.json` and component structure).
*   **API (`app/api/`):** Backend endpoints to support market data, betting, user accounts, etc.

## 6. Non-Goals (MVP)

*   Full feature parity with the Verse mobile app (unless specified above).
*   Advanced analytics dashboards (beyond basic tracking for learning objectives).
*   Complex social features beyond basic sharing.
*   Integration with the existing Verse *mobile* app's backend (Assumption: MVP likely uses its own backend/APIs initially).
*   Fantasy Sports Betting (Focus is solely on Prediction Markets for this MVP).

## 7. Success Metrics

*   **User Engagement:** Number of active users, frequency of use, time spent in app.
*   **Betting Activity:** Number of bets placed, total betting volume on prediction markets.
*   **Market Interaction:** Views per market, bets per market.
*   **Qualitative Feedback:** User surveys or interviews regarding the prediction market experience.
*   **Learning:** Successful collection of data regarding odds movement and user behavior patterns.

## 8. Open Questions / Future Considerations

*   Specific logic for odds calculation and manipulation.
*   Detailed requirements for the Rewards section.
*   Data source and update frequency for prediction market events.
*   Payment processing integration for the Store (if real money is involved).
*   User onboarding flow. 