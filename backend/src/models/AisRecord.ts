import mongoose, { Document, Schema } from 'mongoose';

export interface IAisRecord extends Document {
  vessel_id: string;
  name: string;
  timestamp: Date;
  location: {
    type: string;
    coordinates: number[];
  };
  speed: number;
  heading: number;
  vessel_type: string;
  mmsi: string;
  imo: string;
}

const AisRecordSchema: Schema = new Schema({
  vessel_id: { type: String, required: true },
  name: { type: String },
  timestamp: { type: Date, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  speed: { type: Number },
  heading: { type: Number },
  vessel_type: { type: String },
  mmsi: { type: String },
  imo: { type: String }
});

AisRecordSchema.index({ location: '2dsphere' });
AisRecordSchema.index({ timestamp: 1 });
AisRecordSchema.index({ vessel_id: 1, timestamp: 1 });

export const AisRecord = mongoose.models.AisRecord || mongoose.model<IAisRecord>('AisRecord', AisRecordSchema);
