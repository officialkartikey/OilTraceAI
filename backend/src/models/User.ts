import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    select: false,
  },
  userType: {
    type: String,
    enum: ['Analyst', 'Administrator', 'Field Agent', 'Commander'],
    default: 'Analyst',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verifyToken: {
    type: String,
  }
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
