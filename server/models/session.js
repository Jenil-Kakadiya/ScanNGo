const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    eventDayId: { type: mongoose.Schema.Types.ObjectId, ref: 'EventDay', required: true },
    title: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

sessionSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.models.Session || mongoose.model('Session', sessionSchema);



