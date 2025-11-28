const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    location: { type: String, required: true, trim: true },
    dateTime: { type: Date, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    creatorEmail: { type: String, required: true, lowercase: true, trim: true },
    certificateEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

eventSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);
