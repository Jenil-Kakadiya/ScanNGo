const mongoose = require('mongoose');

const eventDaySchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    dayDate: { type: Date, required: true },
    title: { type: String, default: '' },
  },
  { timestamps: true }
);

eventDaySchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.models.EventDay || mongoose.model('EventDay', eventDaySchema);



