const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' },
    verificationCode: { type: String, required: true, unique: true },
    checkedIn: { type: Boolean, default: false },
  },
  { timestamps: true }
);

registrationSchema.index({ eventId: 1, userId: 1 }, { unique: true });

registrationSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.models.Registration || mongoose.model('Registration', registrationSchema);



