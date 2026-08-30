# ARGUS API & Data Flow Documentation

This document explains the core investigation pipeline for the ARGUS backend. The backend acts as an orchestrator, connecting the frontend, the Machine Learning service, physics engines, and MongoDB.

## Data Flow Pipeline

The end-to-end data flow operates sequentially:

1. **Ingestion (SAR Image -> Observation)**
   A user initiates an investigation and uploads a SAR image (Sentinel-1, etc.) along with timestamp and geospatial metadata. The image is saved locally and logged in the database.
   
2. **Perception (Observation -> Detection)**
   The backend orchestrator sends the image to the independent ML FastAPI service (`ml-model/api_server.py`). The ML model runs segmentation to detect an oil slick, returning a bounding box, confidence score, and polygon geometry.

3. **Physics Reconstruction (Detection -> Source Region)**
   The detected slick geometry is passed to the `DriftEngine`. Combined with ocean current and wind data, the engine runs Lagrangian particle tracking backwards in time to determine a **Source Region** (where the oil likely originated) and an **Estimated Release Window**.

4. **Spatiotemporal Filtering (Source Region -> AIS Candidates)**
   The backend queries the MongoDB AIS collection (`vessel_repository`) using a `$geoIntersects` spatial query to find any vessel tracks that passed through the reconstructed source region during the estimated release window.

5. **Evidence Fusion & Ranking (Candidates -> Ranked Results)**
   For each candidate vessel, the `EvidenceEngine` calculates heuristic scores for spatial proximity, temporal overlap, drift compatibility, trajectory anomaly, and AIS quality. The `AttributionEngine` weights these features to produce a final attribution score and generates human-readable explanations.

---

## API Flow & Usage

### 1. Create Investigation
Creates a new blank investigation workspace.

**Request:** `POST /api/v1/investigations/`
**Body:** `{}`

**Expected Response:**
```json
{
  "_id": "6a93fc...",
  "status": "CREATED",
  "observation_ids": [],
  "candidate_ids": [],
  "created_at": "2025-01-01T10:20:00Z",
  "updated_at": "2025-01-01T10:20:00Z"
}
```

### 2. Add Observation
Uploads the SAR image for the investigation.

**Request:** `POST /api/v1/investigations/{id}/observations`
**Body:** `multipart/form-data`
- `file`: The image file (e.g., `demo_sar_image.png`)
- `timestamp`: "2025-01-01T10:30:00Z"
- `sensor`: "SAR"
- `resolution_m`: 10.0

**Expected Response:**
```json
{
  "_id": "6a93fd...",
  "investigation_id": "6a93fc...",
  "timestamp": "2025-01-01T10:30:00Z",
  "sensor": "SAR",
  "resolution_m": 10.0,
  "image_reference": "D:\\develop\\OilTraceAI\\backend\\uploads\\demo_sar_image.png",
  "created_at": "2025-01-01T10:32:00Z"
}
```

### 3. Trigger Analysis
Starts the asynchronous background pipeline (ML -> Physics -> AIS -> Fusion).

**Request:** `POST /api/v1/investigations/{id}/analyze`
**Body:** Empty

**Expected Response:**
```json
{
  "job_id": "6a93fc...",
  "status": "QUEUED"
}
```

### 4. Get Full Investigation (The primary Frontend Endpoint)
Returns the complete state of the investigation, including the ranked vessels. The frontend should poll this to populate the UI.

**Request:** `GET /api/v1/investigations/{id}/full`
**Body:** Empty

**Expected Response:**
```json
{
  "investigation": {
    "_id": "6a93fc...",
    "status": "COMPLETED",
    "observation_ids": ["6a93fd..."],
    "candidate_ids": ["V-1001"]
  },
  "observation": {
    "_id": "6a93fd...",
    "timestamp": "2025-01-01T10:30:00Z",
    "image_reference": "..."
  },
  "detection": {
    "detected": true,
    "confidence": 0.91,
    "area_km2": 13.8,
    "geometry": { "type": "Polygon", "coordinates": [...] },
    "model": { "name": "SENTRY-OilSpillNet", "version": "v1.0.0" }
  },
  "reconstruction": {
    "release_window": { "start_time": "2025-01-01T08:30:00Z", "end_time": "2025-01-01T10:00:00Z" },
    "source_region": { "type": "Polygon", "coordinates": [...] },
    "confidence": 0.85
  },
  "environment": {
    "wind_speed_kn": 10.0,
    "current_speed_kn": 0.5
  },
  "candidates": [
    {
      "rank": 1,
      "vessel": {
        "vessel_id": "V-1001",
        "name": "Oceanic Pride",
        "mmsi": "123456789",
        "vessel_type": "Oil Tanker",
        "positions": [...]
      },
      "attribution_score": 0.91,
      "evidence": {
        "spatial": 0.92,
        "temporal": 0.94,
        "drift": 0.85,
        "trajectory": 0.90,
        "ais_quality": 0.96
      },
      "explanations": [
        "Trajectory intersected the reconstructed source region.",
        "Vessel was present during the inferred release window."
      ]
    }
  ]
}
```

### 5. Get Timeline
Returns an event stream representing processing stages for UI presentation.

**Request:** `GET /api/v1/investigations/{id}/timeline`

**Expected Response:**
```json
[
  { "timestamp": "08:30", "event": "AIS activity recorded" },
  { "timestamp": "10:30", "event": "SAR observation" },
  { "timestamp": "10:31", "event": "ML detection" },
  { "timestamp": "10:32", "event": "Drift reconstruction completed" },
  { "timestamp": "10:33", "event": "Candidate analysis generated" }
]
```
