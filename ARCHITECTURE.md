# 🏗 ARCHITECTURE

This project implements a **strict event-driven, deterministic game architecture**
designed for correctness, replayability, and future extensibility.

The game is a digital implementation of the Swedish card game **Mulle (Fängelse)**.

---

## 🎯 Core Principles

1. **Single Source of Truth**
   - All game rules and state transitions live in `gameEngine.js`
   - No other layer may implement or duplicate game logic

2. **Pure State Transitions**
   - `applyActionPure(state, action)` is a pure function
   - Given the same state + action, the result is always identical
   - Enables replay, AI, testing, and multiplayer determinism

3. **Event-Driven UI**
   - UI renders exclusively from `gameState`
   - UI never mutates state or validates rules
   - All user interaction emits events only

4. **Side-Effects via lastAction**
   - Animations and sound react only to `gameState.lastAction`
   - No DOM inspection or logic branching

5. **Replay Isolation**
   - Replay uses a deep-cloned, isolated state
   - Live game state is never touched during replay
   - Replay reuses the same rule engine via pure action application

---

## 🧩 System Overview

