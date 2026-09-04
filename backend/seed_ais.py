import asyncio
import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv
import motor.motor_asyncio
import math

load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "kairos")

VESSELS = [
    {"vessel_id": "V-5001", "name": "Oceanic Spirit", "mmsi": "111222333", "imo": "IMO1112223", "vessel_type": "Tanker"},
    {"vessel_id": "V-5002", "name": "Global Trader", "mmsi": "222333444", "imo": "IMO2223334", "vessel_type": "Cargo"},
    {"vessel_id": "V-5003", "name": "Pacific Explorer", "mmsi": "333444555", "imo": "IMO3334445", "vessel_type": "Fishing"},
    {"vessel_id": "V-5004", "name": "Sea Titan", "mmsi": "444555666", "imo": "IMO4445556", "vessel_type": "Tanker"},
    {"vessel_id": "V-5005", "name": "Marine Star", "mmsi": "555666777", "imo": "IMO5556667", "vessel_type": "Cargo"}
]

# We will generate data for the last 48 hours
now = datetime.utcnow()
start_time = now - timedelta(hours=48)

# Based on the exact pixel offset of the oil slick in the demo image:
# The oil slick appears at 68.252, 16.569.
# 12 hours backward drift yields the exact origin at:
BASE_LAT = 16.489
BASE_LON = 68.096

def generate_track(vessel, start_time, duration_hours, steps_per_hour=6, anomaly=False):
    track = []
    
    # Random starting point within 2 degrees of base
    current_lat = BASE_LAT + random.uniform(-2, 2)
    current_lon = BASE_LON + random.uniform(-2, 2)
    
    # Target point
    target_lat = BASE_LAT + random.uniform(-0.1, 0.1) if anomaly else BASE_LAT + random.uniform(-2, 2)
    target_lon = BASE_LON + random.uniform(-0.1, 0.1) if anomaly else BASE_LON + random.uniform(-2, 2)
    
    speed = random.uniform(10.0, 18.0)
    
    total_steps = int(duration_hours * steps_per_hour)
    
    # Calculate simple delta
    lat_delta = (target_lat - current_lat) / total_steps
    lon_delta = (target_lon - current_lon) / total_steps
    
    # Calculate heading roughly
    heading = (math.degrees(math.atan2(lon_delta, lat_delta)) + 360) % 360
    
    # 36 steps * 20 mins = 12 hours ago
    anomaly_step_start = total_steps - 36 
    anomaly_step_end = total_steps - 26
    
    current_time = start_time
    
    for step in range(total_steps):
        is_anomaly = anomaly and (anomaly_step_start <= step <= anomaly_step_end)
        
        step_speed = speed
        step_heading = heading
        
        if is_anomaly:
            # Simulate a dump (speed drop, erratic heading)
            step_speed = speed * 0.3
            step_heading = (heading + random.uniform(-45, 45)) % 360
            
            # Make sure it happens right near the base coordinates for perfect overlap
            if step == anomaly_step_start:
                current_lat = BASE_LAT
                current_lon = BASE_LON
        else:
            # Normal movement with slight noise
            step_heading += random.uniform(-2, 2)
            step_speed += random.uniform(-0.5, 0.5)
            
        current_lat += lat_delta
        current_lon += lon_delta
        
        record = {
            "vessel_id": vessel["vessel_id"],
            "name": vessel["name"],
            "mmsi": vessel["mmsi"],
            "imo": vessel["imo"],
            "vessel_type": vessel["vessel_type"],
            "timestamp": current_time,
            "location": {
                "type": "Point",
                "coordinates": [current_lon, current_lat]
            },
            "speed": step_speed,
            "heading": step_heading,
            "course": step_heading
        }
        track.append(record)
        current_time += timedelta(minutes=60 / steps_per_hour)
        
    return track

async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
    db = client[MONGODB_DATABASE]
    ais_coll = db["ais_records"]
    
    # Generate around 500 records total
    all_records = []
    
    for idx, v in enumerate(VESSELS):
        # The first vessel will have an anomaly to be our clear "suspect"
        is_anomaly = (idx == 0)
        track = generate_track(v, start_time, duration_hours=48, steps_per_hour=3, anomaly=is_anomaly)
        all_records.extend(track)
        
    print(f"Generated {len(all_records)} AIS records.")
    
    if all_records:
        result = await ais_coll.insert_many(all_records)
        print(f"Successfully inserted {len(result.inserted_ids)} records into MongoDB.")
        
    count = await ais_coll.count_documents({})
    print(f"Total AIS records in db: {count}")

if __name__ == "__main__":
    asyncio.run(main())
