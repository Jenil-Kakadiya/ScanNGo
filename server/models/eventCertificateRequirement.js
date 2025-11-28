const mongoose = require('mongoose');

const eventCertificateRequirementSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  },
  { timestamps: true }
);

eventCertificateRequirementSchema.index({ eventId: 1, sessionId: 1 }, { unique: true });

eventCertificateRequirementSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports =
  mongoose.models.EventCertificateRequirement ||
  mongoose.model('EventCertificateRequirement', eventCertificateRequirementSchema);



