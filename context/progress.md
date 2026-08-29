# OilTraceAI Project Progress Report

This document outlines the current progress of the OilTraceAI platform based on the Product Requirements Document (`context/prd.md`), mapping out what has been achieved, what is left to implement, and detailing the system's architecture and configuration.

---

## 1. Progress Against PRD (What We've Covered)

### ✅ Module 1 — SAR Imagery Input & Processing
- **Implemented:** Upload flow configured to accept satellite images. 
- **Implemented:** ML model segmentation using a PyTorch U-Net (ResNet34 encoder) to detect oil slicks and calculate bounding box/centroid geometries.
- **Implemented:** Images are uploaded remotely to **Cloudinary** to offload local storage and simplify data delivery.

### ✅ Module 3 & 4 — Hindcasting, Drift Modeling, and Vessel Attribution
- **Implemented:** Python scripts in `ml-model/` handle drift velocity computation and reverse track simulation (`drift_model.py`).
- **Implemented:** Vessel scoring engine (`score_vessels.py`) that scores historical AIS CSV data for suspect attribution based on time and proximity.

### ✅ Module 5 — Web Dashboard (Frontend) & Backend API
- **Implemented:** A React/Next.js frontend application structure has been set up in `frontend/`.
- **Implemented:** Node.js/Express backend handles `/upload`, `/detect`, `/hindcast`, `/attribution`, and `/report` APIs.
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

## 3. System Architecture & Layer Configurations

The current application consists of three decoupled layers communicating via HTTP REST APIs.

### 🖥️ Frontend Layer (Next.js)
- **Tech Stack:** React, Next.js.
- **Environment:** Local during development; can be deployed remotely (e.g., Vercel).
- **Role:** The primary web dashboard for NTRO analysts. Calls the Backend API to orchestrate uploads and fetch analysis. 

### ⚙️ Backend API Layer (Node.js/Express)
- **Tech Stack:** Node.js, Express, Mongoose, Cloudinary, Multer, PDFKit.
- **Environment:** Local during development; intended for remote cloud deployment.
- **Role:** Acts as the middleman gateway.
  1. Accepts uploads from Frontend and pushes images to **Cloudinary (Remote cloud storage)**.
  2. Fetches the image from Cloudinary and proxies it to the ML Model via `FormData`.
  3. Formats and saves the generated Incident reports to the Database.

### 🧠 ML Model Layer (Python/FastAPI)
- **Tech Stack:** Python, FastAPI, PyTorch (smp U-Net), OpenCV, Pandas.
- **Environment:** Local during development (runs on `localhost:8000`); requires GPU instances for remote production deployment.
- **Role:** Handles heavy computation. Runs the U-Net segmentation on incoming images, computes drift paths, and scores suspected vessels from AIS data. Returns JSON predictions to the Node.js backend.

### 🗄️ Database & Storage Layer
- **Database:** **MongoDB Atlas (Remote)**. Handles incident records, detections, and user data. (Note: Differs from PRD's PostgreSQL requirement).
- **Storage:** **Cloudinary (Remote)**. Handles storing raw SAR imagery for long-term access, replacing local disk storage.

## 4. Layer Interaction Flow

1. **User** uploads an image via the **Frontend (Next.js)**.
2. The **Frontend** posts the image to the **Backend (Node.js)** `/upload` endpoint.
3. The **Backend** uploads the file remotely to **Cloudinary** and gets a URL.
4. The **Frontend** calls the **Backend** `/detect` endpoint with the Cloudinary URL.
5. The **Backend** downloads the image stream from Cloudinary and forwards it to the **ML Model (FastAPI)** `/analyze` endpoint.
6. The **ML Model** processes the image (Segmentation), simulates drift, scores vessels, and returns JSON data.
7. The **Backend** saves the final structured incident result to **MongoDB (Remote)** and responds to the Frontend.
8. The **Frontend** visually renders the data on the dashboard map.
