const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  }
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  googleId: String,
  loginHistory: [attendanceSchema],
  face_id: Number // Add this if you're using numeric face IDs
});

const User = mongoose.model('User', userSchema);

module.exports = User;
