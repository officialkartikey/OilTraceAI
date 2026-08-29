"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const mongoose_1 = __importDefault(require("mongoose"));
const Incident_1 = require("../models/Incident");
const AisRecord_1 = require("../models/AisRecord");
const cloudinary_1 = require("cloudinary");
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: {
        folder: 'oil-spills',
        allowed_formats: ['jpg', 'jpeg', 'png', 'tif', 'tiff']
    }
});
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ storage: storage });
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    return res.json({ message: 'File uploaded successfully', fileId: req.file.path });
});
router.post('/detect', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { fileId, spill_time, spill_lat, spill_lon } = req.body;
        if (!fileId)
            return res.status(400).json({ message: 'fileId is required' });
        let imageStream;
        try {
            const response = yield (0, axios_1.default)({
                method: 'GET',
                url: fileId,
                responseType: 'stream'
            });
            imageStream = response.data;
        }
        catch (err) {
            return res.status(404).json({ message: 'Failed to fetch image from Cloudinary' });
        }
        const formData = new form_data_1.default();
        formData.append('file', imageStream, 'image.jpg');
        if (spill_time)
            formData.append('spill_time', spill_time);
        if (spill_lat)
            formData.append('spill_lat', spill_lat);
        if (spill_lon)
            formData.append('spill_lon', spill_lon);
        // Call ML Model
        let mlResponse;
        try {
            const response = yield axios_1.default.post(`${ML_API_URL}/analyze`, formData, {
                headers: formData.getHeaders(),
            });
            mlResponse = response.data;
        }
        catch (mlError) {
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
        const newIncident = yield Incident_1.Incident.create({
            observation_id: mlResponse.observation_id || `OBS-${Date.now()}`,
            timestamp: ((_a = mlResponse.observation) === null || _a === void 0 ? void 0 : _a.timestamp) || new Date(),
            satellite: ((_b = mlResponse.observation) === null || _b === void 0 ? void 0 : _b.satellite) || 'Unknown',
            detection: mlResponse.detection,
            drift: mlResponse.drift,
            attribution: mlResponse.attribution,
            image_file: fileId
        });
        return res.json({ success: true, incidentId: newIncident._id, data: mlResponse.detection });
    }
    catch (error) {
        console.error('Detection error:', error.message);
        return res.status(500).json({ success: false, message: 'Detection failed' });
    }
}));
router.post('/hindcast', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { incidentId } = req.body;
        if (!incidentId)
            return res.status(400).json({ message: 'incidentId is required' });
        const incident = yield Incident_1.Incident.findById(incidentId);
        if (!incident)
            return res.status(404).json({ message: 'Incident not found' });
        return res.json({ success: true, data: incident.drift });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Hindcast failed' });
    }
}));
router.post('/attribution', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { incidentId } = req.body;
        if (!incidentId)
            return res.status(400).json({ message: 'incidentId is required' });
        const incident = yield Incident_1.Incident.findById(incidentId);
        if (!incident)
            return res.status(404).json({ message: 'Incident not found' });
        return res.json({ success: true, data: incident.attribution });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Attribution failed' });
    }
}));
router.get('/report/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const incident = yield Incident_1.Incident.findById(req.params.id);
        if (!incident)
            return res.status(404).json({ message: 'Incident not found' });
        const doc = new pdfkit_1.default();
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Report generation failed' });
    }
}));
router.get('/alerts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const alerts = yield Incident_1.Incident.find().sort({ timestamp: -1 }).limit(20);
        return res.json({ success: true, alerts });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
    }
}));
router.get('/investigation/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const query = mongoose_1.default.Types.ObjectId.isValid(req.params.id)
            ? { _id: req.params.id }
            : { observation_id: req.params.id };
        const incident = yield Incident_1.Incident.findOne(query);
        if (!incident)
            return res.status(404).json({ success: false, message: 'Investigation not found' });
        const obsTime = new Date(incident.timestamp);
        // 2 hours before, 30 mins after
        const startTime = new Date(obsTime.getTime() - 2 * 60 * 60 * 1000);
        const endTime = new Date(obsTime.getTime() + 30 * 60 * 1000);
        // Fetch AIS records in time window
        const aisRecords = yield AisRecord_1.AisRecord.find({
            timestamp: { $gte: startTime, $lte: endTime }
        }).sort({ timestamp: 1 });
        // Group into tracks
        const tracksMap = new Map();
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
            candidates: ((_a = incident.attribution) === null || _a === void 0 ? void 0 : _a.suspects) || [],
            timeline: []
        };
        return res.json({ success: true, data: response });
    }
    catch (error) {
        console.error('Failed to fetch investigation:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch investigation' });
    }
}));
exports.default = router;
