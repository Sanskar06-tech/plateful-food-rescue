import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['donor', 'ngo'], default: 'donor' },
  area: { type: String, trim: true, maxlength: 100 },
}, { timestamps: true });

userSchema.set('toJSON', { transform: (_d, ret) => { delete ret.password; delete ret.__v; return ret; } });
export default mongoose.model('User', userSchema);
