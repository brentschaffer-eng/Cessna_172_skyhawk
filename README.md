# Cessna 172 Skyhawk Trainer

<img src="public/favicon.svg" alt="Cessna 172 Skyhawk icon" width="96" align="right">

An interactive, browser-based training aid for the Cessna 172 Skyhawk, built with React, Three.js, and Tailwind CSS.

Live at **https://beesone.ca/plane/**

## Features

- **Flight simulator** – a 3D Cessna 172 flown from one of four Canadian airports, each with satellite ground imagery:
  - Vancouver (CYVR), runway 08R
  - Calgary (CYYC), runway 35R
  - Edmonton (CYEG), runway 02
  - Winnipeg (CYWG), runway 36
- **Garmin G1000 PFD** – attitude indicator, airspeed/altitude tapes, HSI, and AFCS status box.
- **GFC 700 autopilot** – mode controller bezel with heading bug, altitude preselect, and target vertical speed.
- **Manual controls** – throttle, flaps, arrow-key yoke (when the autopilot is off), and an airport map.
- **Takeoff assist** – hands off, the aircraft rotates at Vr and the autopilot engages in the climb. Touching the yoke keys or disconnecting the autopilot hands the flight back to you.
- **Airframe walkthrough** (`#/aircraft`) – an exploded 3D model with a narrated description of each assembly.
- **Autopilot tutor** (`#/avionics`) – the PFD and mode controller with an explanation of every GFC 700 mode, starting airborne on an ILS intercept.

The simulator is the landing page. The other two pages open from the buttons at the top left of the 3D view and load on demand.

Ground imagery is streamed from Esri World Imagery, and the map from OpenStreetMap; both need an internet connection.

## Getting started

Requires [Node.js](https://nodejs.org/) 20.19+ or 22.12+ (needed by Vite 8).

```powershell
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot reload. |
| `npm run build` | Production build into `dist/` using relative asset paths. |
| `npm run build:plane` | Production build with the `/plane/` base path used on beesone.ca. |
| `npm run preview` | Serve the built `dist/` folder locally. |
| `npm test` | Run the flight model and autopilot unit tests (Vitest). |
| `npm run lint` | Lint the source with ESLint. |
| `npm run deploy:plane` | Manually build and upload to `gs://beesone.ca/plane` (requires `gcloud` access; pushing to `main` does this automatically). |

On Windows, use `npm.cmd` if PowerShell's execution policy blocks `npm`.

## Project structure

```
public/
  favicon.svg          App icon (also used on the beesone.ca dashboard card)
scripts/
  deploy-gcs-plane.ps1 Manual Google Cloud Storage deploy script
cloudbuild.yaml        Automatic deploy on push to main (Cloud Build)
src/
  App.jsx              Hash routing between the simulator and the two tutors
  components/
    FlightSimView.jsx  Main simulator screen
    aircraft/          3D aircraft model, scene and exploded-view walkthrough
    avionics/          G1000 PFD, GFC 700 bezel and autopilot tutor
    layout/            Page shell and tabs for the tutors
    speech/            Text-to-speech narration
  data/                Aircraft part and autopilot mode descriptions
  hooks/useSimulation.js  Runs the simulation each frame, outside React rendering
  sim/flightModel.js   Simplified flight dynamics (pure functions)
  state/               Autopilot reducer (pure; the runway in use is part of the state)
```

## Deployment

Pushing to `main` deploys automatically: Cloud Build runs [cloudbuild.yaml](cloudbuild.yaml), linting, testing and building the app and publishing it to https://beesone.ca/plane/ within a few minutes. See [DEPLOYMENT.md](DEPLOYMENT.md) for details and the optional manual deploy.

## Disclaimer

This is an educational aid only. It is not an approved flight training device and must not be used in place of the aircraft's Pilot's Operating Handbook or instruction from a certified flight instructor.
