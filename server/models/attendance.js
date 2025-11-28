const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    status: { type: String, enum: ['present', 'absent'], default: 'absent' },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    markedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

attendanceSchema.index({ registrationId: 1, sessionId: 1 }, { unique: true });

attendanceSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);



