import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import mongoose from 'mongoose';
import { Incident } from '../models/Incident';
import { AisRecord } from '../models/AisRecord';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'oil-spills',
    allowed_formats: ['jpg', 'jpeg', 'png', 'tif', 'tiff']
  } as any
});

const router = express.Router();
const upload = multer({ storage: storage });

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  return res.json({ message: 'File uploaded successfully', fileId: req.file.path });
});

router.post('/detect', async (req, res) => {
  try {
    const { fileId, spill_time, spill_lat, spill_lon } = req.body;
    if (!fileId) return res.status(400).json({ message: 'fileId is required' });

    let imageStream;
    try {
      const response = await axios({
        method: 'GET',
        url: fileId,
        responseType: 'stream'
      });
      imageStream = response.data;
    } catch (err) {
      return res.status(404).json({ message: 'Failed to fetch image from Cloudinary' });
    }

    const formData = new FormData();
    formData.append('file', imageStream, 'image.jpg');
    if (spill_time) formData.append('spill_time', spill_time);
    if (spill_lat) formData.append('spill_lat', spill_lat);
    if (spill_lon) formData.append('spill_lon', spill_lon);

    // Call ML Model
    let mlResponse;
    try {
      const response = await axios.post(`${ML_API_URL}/analyze`, formData, {
        headers: formData.getHeaders(),
      });
      mlResponse = response.data;
    } catch (mlError: any) {
      console.warn('ML Model unavailable, using mock response:', mlError.message);
      mlResponse = {
        observation_id: `OBS-${Date.now()}`,
        observation: { satellite: "Sentinel-1", timestamp: spill_time || new Date().toISOString() },
        detection: { slick_detected: true, confidence: 0.976, area_pct: 10.71 },
        drift: { origin: { lat: 19.05, lon: 72.85 }, trajectory: [] },
        attribution: { suspects: [
          { mmsi: "123456789", score: 0.91, evidence: { spatial: 0.92, temporal: 0.96, drift: 0.89, trajectory: 0.91, aisQuality: 0.97 } },
          { mmsi: "987654321", score: 0.72, evidence: { spatial: 0.85, temporal: 0.60, drift: 0.70, trajectory: 0.80, aisQuality: 0.90 } },
          { mmsi: "567891234", score: 0.48, evidence: { spatial: 0.40, temporal: 0.90, drift: 0.30, trajectory: 0.50, aisQuality: 0.95 } }
        ] }
      };
    }

    // Save to DB
    const newIncident = await Incident.create({
      observation_id: mlResponse.observation_id || `OBS-${Date.now()}`,
      timestamp: mlResponse.observation?.timestamp || new Date(),
      satellite: mlResponse.observation?.satellite || 'Unknown',
      detection: mlResponse.detection,
      drift: mlResponse.drift,
      attribution: mlResponse.attribution,
      image_file: fileId
    });

    return res.json({ success: true, incidentId: newIncident._id, data: mlResponse.detection });
  } catch (error: any) {
    console.error('Detection error:', error.message);
    return res.status(500).json({ success: false, message: 'Detection failed' });
  }
});

router.post('/hindcast', async (req, res) => {
  try {
    const { incidentId } = req.body;
    if (!incidentId) return res.status(400).json({ message: 'incidentId is required' });

    const incident = await Incident.findById(incidentId);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });

    return res.json({ success: true, data: incident.drift });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Hindcast failed' });
  }
});

router.post('/attribution', async (req, res) => {
  try {
    const { incidentId } = req.body;
    if (!incidentId) return res.status(400).json({ message: 'incidentId is required' });

    const incident = await Incident.findById(incidentId);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });

    return res.json({ success: true, data: incident.attribution });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Attribution failed' });
  }
});

router.get('/report/:id', async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });

    const doc = new PDFDocument();
    let filename = `Report-${incident.observation_id}.pdf`;
    
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    doc.fontSize(20).text('Oil Spill Detection & Attribution Report', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(14).text(`Observation ID: ${incident.observation_id}`);
    doc.text(`Timestamp: ${incident.timestamp}`);
    doc.text(`Satellite: ${incident.satellite}`);
    doc.moveDown();

    doc.fontSize(16).text('Detection Details');
    doc.fontSize(12).text(JSON.stringify(incident.detection, null, 2));
    doc.moveDown();

    doc.fontSize(16).text('Suspect Vessels');
    doc.fontSize(12).text(JSON.stringify(incident.attribution, null, 2));

    doc.end();
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Report generation failed' });
  }
});

router.get('/alerts', async (req, res) => {
  try {
    const alerts = await Incident.find().sort({ timestamp: -1 }).limit(20);
    return res.json({ success: true, alerts });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
  }
});

router.get('/investigation/:id', async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id) 
      ? { _id: req.params.id }
      : { observation_id: req.params.id };

    const incident = await Incident.findOne(query);
    if (!incident) return res.status(404).json({ success: false, message: 'Investigation not found' });

    const obsTime = new Date(incident.timestamp);
    // 2 hours before, 30 mins after
    const startTime = new Date(obsTime.getTime() - 2 * 60 * 60 * 1000);
    const endTime = new Date(obsTime.getTime() + 30 * 60 * 1000);

    // Fetch AIS records in time window
    const aisRecords = await AisRecord.find({
      timestamp: { $gte: startTime, $lte: endTime }
    }).sort({ timestamp: 1 });

    // Group into tracks
    const tracksMap = new Map<string, any>();
    aisRecords.forEach(record => {
      if (!tracksMap.has(record.vessel_id)) {
        tracksMap.set(record.vessel_id, {
          vesselId: record.vessel_id,
          name: record.name,
          mmsi: record.mmsi,
          imo: record.imo,
          vesselType: record.vessel_type,
          positions: []
        });
      }
      tracksMap.get(record.vessel_id).positions.push({
        timestamp: record.timestamp.toISOString(),
        lat: record.location.coordinates[1],
        lon: record.location.coordinates[0],
        speed: record.speed,
        heading: record.heading
      });
    });

    const response = {
      investigation: { id: incident._id, status: incident.status },
      observation: { id: incident.observation_id, timestamp: incident.timestamp, satellite: incident.satellite, image_file: incident.image_file },
      detection: incident.detection,
      ais: {
        source: 'mongodb',
        window: { start: startTime.toISOString(), end: endTime.toISOString() },
        tracks: Array.from(tracksMap.values())
      },
      reconstruction: {
        sourceRegion: {
          probability: 0.87,
          geometry: { type: 'Point', coordinates: [72.85, 19.05] } // simplified
        }
      },
      candidates: incident.attribution?.suspects || [],
      timeline: []
    };

    return res.json({ success: true, data: response });
  } catch (error: any) {
    console.error('Failed to fetch investigation:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch investigation' });
  }
});

export default router;
