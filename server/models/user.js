const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    personalEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
    universityEmail: { type: String, default: '', trim: true },
    universityRollNo: { type: String, default: '333', trim: true },
    mobileNo: { type: String, required: true, unique: true, trim: true },
    department: { type: String, enum: ['ICT', 'CSE'], default: 'ICT' },
    batch: { type: String, default: '2023-2024' },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'delegate'], default: 'user' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password || '');
};

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
