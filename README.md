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
- **Manual controls** – throttle, flaps, and an airport map.

The [`src/components/aircraft`](src/components/aircraft) and [`src/components/avionics`](src/components/avionics) folders also contain an exploded-airframe walkthrough and autopilot-mode tutor (with text-to-speech) that can be wired back into the app shell.

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
| `npm run deploy:plane` | Manually build and upload to `gs://beesone.ca/plane` (requires `gcloud` access; pushing to `main` does this automatically). |

On Windows, use `npm.cmd` if PowerShell's execution policy blocks `npm`.

## Project structure

```
public/
  favicon.svg          App icon (also used on the beesone.ca dashboard card)
  assets/              Airport satellite imagery
scripts/
  deploy-gcs-plane.ps1 Manual Google Cloud Storage deploy script
cloudbuild.yaml        Automatic deploy on push to main (Cloud Build)
src/
  components/
    FlightSimView.jsx  Main simulator screen
    aircraft/          3D aircraft model and exploded-view parts
    avionics/          G1000 PFD and GFC 700 bezel
    speech/            Text-to-speech narration
  data/                Aircraft part and autopilot mode descriptions
  sim/flightModel.js   Simplified flight dynamics
  state/               Autopilot reducer
```

## Deployment

Pushing to `main` deploys automatically: Cloud Build runs [cloudbuild.yaml](cloudbuild.yaml), building the app and publishing it to https://beesone.ca/plane/ within a few minutes. See [DEPLOYMENT.md](DEPLOYMENT.md) for details and the optional manual deploy.

## Disclaimer

This is an educational aid only. It is not an approved flight training device and must not be used in place of the aircraft's Pilot's Operating Handbook or instruction from a certified flight instructor.
