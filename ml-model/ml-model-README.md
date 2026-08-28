# ML Model API — Oil Spill Detection, Drift & Attribution

## What this does
Given a SAR satellite image, this API:
1. Detects oil spills (segmentation mask + confidence)
2. Estimates where the spill originated and where it will drift (using real ocean/wind data)
3. Ranks vessels that were near the spill origin as potential suspects (using AIS data)

## Setup

```bash
cd ml-model
pip install -r requirements.txt
```

Download `best_model.pth` from: https://drive.google.com/file/d/1znLvpubVAWlI8ZvEA6Yv3PpeFFtKY66Q/view?usp=drive_link

## Running the API

```bash
python api_server.py
```

Server runs at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

## API Contract

### `GET /health`
```json
{ "status": "ok", "device": "cpu" }
```

### `POST /analyze`
**Params (multipart/form-data + query params):**
| Param | Type | Required | Description |
|---|---|---|---|
| `file` | file | yes | SAR image to analyze |
| `spill_time` | string | no | Format: `"YYYY-MM-DD HH:MM:SS"`. Needed for drift/attribution. |
| `spill_lat` | float | no | Default `19.05` (Mumbai coast) |
| `spill_lon` | float | no | Default `72.85` |
| `ais_csv_path` | string | no | Path to an AIS CSV file. Needed for attribution. |
| `auto_fetch_ocean_data` | bool | no | Default `true`. Fetches live current/wind data. |

**Response:** see `sample_response.json` in this folder for the full schema
(includes `detection`, `drift`, `attribution`, `artifacts`, `quality` sections).

## Example (JavaScript)

```javascript
const formData = new FormData();
formData.append("file", imageFile);

const response = await fetch(
  "http://localhost:8000/analyze?spill_time=2026-01-15 08:00:00&ais_csv_path=ais_synthetic.csv",
  { method: "POST", body: formData }
);
const result = await response.json();
```


