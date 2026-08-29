import mongoose, { Document, Schema } from 'mongoose';

export interface IIncident extends Document {
  observation_id: string;
  timestamp: Date;
  satellite: string;
  detection: any;
  drift: any;
  attribution: any;
  status: string;
  image_file: string;
}

const IncidentSchema: Schema = new Schema({
  observation_id: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  satellite: { type: String },
  detection: { type: Schema.Types.Mixed },
  drift: { type: Schema.Types.Mixed },
  attribution: { type: Schema.Types.Mixed },
  status: { type: String, default: 'active' },
  image_file: { type: String }
}, { timestamps: true });

export const Incident = mongoose.model<IIncident>('Incident', IncidentSchema);
