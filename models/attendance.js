const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true
  },
  status: {
    type: String,
    enum: ['Present', 'Late', 'Absent'],
    default: 'Present'
  },
  time: {
    type: Date,
    default: Date.now
  }
});

// Optional: Add indexing for faster queries
attendanceSchema.index({ employeeId: 1, time: -1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
