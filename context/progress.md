# OilTraceAI Project Progress Report

This document outlines the current progress of the OilTraceAI platform based on the Product Requirements Document (`context/prd.md`), mapping out what has been achieved, what is left to implement, and detailing the system's architecture, specific functionalities, and end-to-end data flow.

---

## 1. Progress Against PRD (What We've Covered)

### ✅ Module 1 — SAR Imagery Input & Processing
- **Implemented:** Upload flow configured to accept satellite images. 
- **Implemented:** ML model segmentation using a PyTorch U-Net (ResNet34 encoder) to detect oil slicks and calculate bounding box/centroid geometries. Includes Test Time Augmentation (TTA) for robust predictions.
- **Implemented:** Images are uploaded remotely to **Cloudinary** to offload local storage and simplify data delivery.

### ✅ Module 3 & 4 — Hindcasting, Drift Modeling, and Vessel Attribution
- **Implemented:** Python scripts in `ml-model/` handle drift velocity computation based on ocean/wind currents and reverse track simulation (`drift_model.py` and `fetch_ocean_data.py`).
- **Implemented:** Vessel scoring engine (`score_vessels.py`) that scores historical AIS CSV data for suspect attribution based on time, proximity, and trajectory alignment.

### ✅ Module 5 — Web Dashboard (Frontend) & Backend API
- **Implemented:** A React/Next.js frontend application providing a comprehensive dashboard with map visualizations, timeline analysis, and suspect vessel listings.
- **Implemented:** Node.js/Express backend handling image uploads, ML orchestration, and database operations. (Note: Initial dummy/seeding files have been completely removed; the pipeline now relies strictly on real-time data flow).
- **Implemented:** Automated PDF Report generation feature is functional using `pdfkit` in the backend.

---

## 2. Remaining Tasks & PRD Deviations (What is Left)

### ❌ Module 6 — Mobile Application (Flutter)
- **Pending:** The cross-platform mobile app (Android & iOS) for field officers is not yet implemented.
- **Pending:** Offline support, map view for officers, and push notifications are outstanding.

### ⚠️ Architecture Deviations & Refinements
- **Database Deviation:** The PRD requested PostgreSQL + PostGIS (+ pgvector). The current implementation uses **MongoDB** (NoSQL). We need to evaluate whether to migrate to PostgreSQL for better spatial-temporal querying or continue with MongoDB.
- **AIS Data Pipeline:** Currently, the ML API processes a static `ais_csv_path`. We need to integrate live or historic database-driven AIS ingestion (Marine Cadastre).
- **Advanced ML Targets:** The advanced Look-alike filtering and Bayesian optimization for drift models mentioned in the PRD are not fully baked in the current basic Python drift/attribution models.

---

## 3. Specific Functionalities by Layer

### 🖥️ Frontend Layer (Next.js)
The frontend provides a rich interactive dashboard for NTRO analysts, built with React and Next.js.
- **NewAnalysisTool**: Interface for initiating new satellite image scans and parameter input.
- **MapWidget**: Geospatial visualization of the spill detection mask, drift trajectories (hindcast/forecast), and AIS vessel tracks.
- **ObservationCards & MetricCard**: Displays high-level metrics and details about the satellite observation (confidence, area, etc.).
- **IncidentTimeline**: A chronological timeline view of the incident, drift origin, and suspect vessel intersections.
- **CandidateVesselsList & Leaderboard**: Displays and ranks suspected vessels based on their attribution scores and anomalous behavior flags.
- **EnvironmentalConditions**: Visualizes the ocean current and wind data used for the drift model.
- **SourceReconstruction**: Visualizes the hindcast reverse drift to estimate the original spill location.

### ⚙️ Backend API Layer (Node.js/Express)
The backend acts as the orchestrator and data persistence layer.
- `POST /upload`: Handles multipart form data and uploads raw SAR images to **Cloudinary**.
- `POST /detect`: Main orchestration endpoint. Fetches image from Cloudinary, forwards it to the ML API, and saves the final consolidated result (detection, drift, attribution) to MongoDB.
- `GET /investigation/:id`: Aggregates the Incident data with historical AIS records (from MongoDB) in the time window to generate a full investigation payload with vessel tracks.
- `GET /alerts`: Fetches the most recent incidents for dashboard alerts.
- `GET /report/:id`: Generates a downloadable, formatted PDF report containing observation details, detection metrics, and suspect vessels.
- `POST /hindcast` & `POST /attribution`: Standalone endpoints to fetch specific modules of an incident.

### 🧠 ML Model Layer (Python/FastAPI)
The ML layer handles all heavy lifting, including computer vision and oceanographic simulations.
- `POST /analyze`: The core endpoint that chains together three sub-modules:
  1. **Segmentation**: Uses `segmentation_models_pytorch` (U-Net with ResNet34) to generate an oil spill mask, calculates oil area percentage, and extracts a bounding box/centroid.
  2. **Drift Modeling**: Uses `fetch_ocean_data.py` to get current/wind vectors, then simulates reverse (hindcast) and forward (forecast) trajectories to find the spill origin.
  3. **Vessel Attribution**: Uses `score_vessels.py` to cross-reference the estimated spill origin with AIS data, scoring vessels based on spatial-temporal proximity and flags like erratic courses or speed drops.

---

## 4. End-to-End Layer Interaction Flow

1. **Upload Initiation**: User uploads an image via the **Frontend** (`NewAnalysisTool`).
2. **Cloud Storage**: The **Frontend** posts the image to the **Backend** `/upload` endpoint. The Backend uploads the file remotely to **Cloudinary** and returns a file URL.
3. **Trigger Analysis**: The **Frontend** calls the **Backend** `/detect` endpoint with the Cloudinary URL and spill parameters (time, lat, lon).
4. **ML Proxying**: The **Backend** downloads the image stream from Cloudinary and forwards it as `FormData` to the **ML Model (FastAPI)** `/analyze` endpoint.
5. **Machine Learning Execution**: 
   - The **ML Model** processes the image to detect the slick.
   - If a slick is found, it automatically fetches environmental data and simulates the drift (Hindcast/Forecast).
   - It then scores historical AIS tracks to find suspect vessels near the hindcasted origin.
   - The ML API returns a comprehensive JSON response containing the mask, drift tracks, and suspects.
6. **Data Persistence**: The **Backend** receives the ML response, creates a structured `Incident` record, saves it to **MongoDB (Remote)**, and responds to the Frontend.
7. **Visualization**: The **Frontend** fetches the full context (including raw AIS tracks via `/investigation/:id`) and visually renders the data on the dashboard map (`MapWidget`), populates the timeline (`IncidentTimeline`), and lists suspects (`CandidateVesselsList`).
8. **Reporting**: The user can click to download a formal PDF brief of the incident, which is generated dynamically by the **Backend** via `/report/:id`.

---

## 5. Key Pain Points & Current Bottlenecks

1. **Database Limitations (MongoDB vs PostgreSQL):** We are currently using MongoDB, which lacks robust built-in support for complex geospatial queries required by the PRD (such as `pgvector` for similarity or PostGIS for complex spatial intersections between drift tracts and AIS routes). This significantly limits performance at scale.
2. **Static AIS Pipeline:** Our ML attribution relies on static or loosely integrated historical AIS CSV data, making it challenging to maintain real-time monitoring. Integrating directly with live Marine Cadastre APIs or streaming data is essential.
3. **Drift & ML Simplification:** The drift models and attribution scoring are basic deterministic Python implementations, lacking the advanced Look-alike (false positive) Bayesian filtering and robust stochastic simulation mentioned in the PRD. 
4. **Resiliency and Failovers:** Deep dependencies on third-party remote calls (e.g., Cloudinary for images, remote ML APIs) mean that connection timeouts break the entire flow. The system currently uses aggressive fallback strategies (like injecting 1x1 pixel mock images on failure) to prevent total pipeline collapse, but better retry and queue mechanisms are needed.
5. **Mobile Application Missing:** The cross-platform mobile app for field officers is completely unstarted, leaving a gap for on-field response teams.
