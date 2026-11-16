# Gedeón 300

A browser-based 3D biblical adventure prototype built with React, Vite, Three.js and React Three Fiber.

## Requirements

- Node.js 22 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Controls

- Arrow keys: walk
- Hold Z: run
- X: contextual action — collect the hidden wheat, strike the practice post, or toggle stealth depending on proximity.

## Current prototype

The first village scene uses procedural Three.js geometry: stone houses with doors and windows, olive trees, instanced wheat, fences, jars, distant ridges, sunset lighting, a follow camera and a stylized provisional Gideon character with procedural walk/run motion.

The character is not yet a rigged production GLB model. A licensed character asset and authored animation clips are a separate next integration step. No third-party account or paid service is currently required.
