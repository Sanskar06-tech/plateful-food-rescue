import mongoose from 'mongoose';
const { Schema } = mongoose;

const donationSchema = new Schema({
  donor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  donorName: String,
  food: { type: String, required: true, trim: true, maxlength: 300 },
  quantity: { type: String, required: true, trim: true, maxlength: 100 },
  area: { type: String, required: true, trim: true, maxlength: 100 },
  phone: { type: String, trim: true, maxlength: 20 },
  pickupDeadline: { type: Date, required: true },
  // filled by the AI food-safety analysis
  category: String,
  safeHours: Number,
  tip: String,
  // workflow: available -> requested -> confirmed -> picked_up -> delivered
  status: {
    type: String,
    enum: ['available', 'requested', 'confirmed', 'picked_up', 'delivered'],
    default: 'available',
  },
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  requestedByName: String,
}, { timestamps: true });

export default mongoose.model('Donation', donationSchema);
