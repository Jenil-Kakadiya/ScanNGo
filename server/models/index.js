const mongoose = require('mongoose');
const connectDB = require('../config/database');

const Admin = require('./admin');
const User = require('./user');
const Event = require('./event');
const EventDay = require('./eventDay');
const Session = require('./session');
const Registration = require('./registration');
const Attendance = require('./attendance');
const EventCertificateRequirement = require('./eventCertificateRequirement');
const Contactmeta = require('./contactmeta');

module.exports = {
  connectDB,
  mongoose,
  Admin,
  User,
  Event,
  EventDay,
  Session,
  Registration,
  Attendance,
  EventCertificateRequirement,
  Contactmeta,
};
