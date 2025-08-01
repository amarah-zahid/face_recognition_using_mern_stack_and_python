const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
require('dotenv').config();

const User = require('./models/User');
const Attendance = require('./models/attendance');
const app = express();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session for Passport
app.use(session({ secret: 'secretkey', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  let user = await User.findOne({ googleId: profile.id });

  if (!user) {
    user = await User.create({
      name: profile.displayName,
      email: profile.emails[0].value,
      googleId: profile.id,
      loginHistory: [{ date: new Date() }] 
    });
  } else {
    user.loginHistory.push({ date: new Date() }); 
    await user.save();
  }

  return done(null, user);
}));


passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => User.findById(id).then(user => done(null, user)));
app.get('/', (req, res) => res.redirect('/login'));
app.get('/register', (req, res) => res.render('register', { message: null }));
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) {
    return res.render('register', { message: 'Email already registered' });
  }
  const hashed = await bcrypt.hash(password, 10);
  const newUser = new User({ name, email, password: hashed });
  await newUser.save();
  res.redirect('/login');
});

app.get('/login', (req, res) => res.render('login', { message: null }));
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  // Check if user exists and has a password
  if (user && user.password && await bcrypt.compare(password, user.password)) {
    user.loginHistory.push({ date: new Date() });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, { httpOnly: true });
    return res.redirect('/face-verification');
  }

  res.render('login', { message: 'Invalid credentials' });
});

app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account', 
}));

app.get('/auth/google/callback', passport.authenticate('google', {
  successRedirect: '/face-verification',
  failureRedirect: '/login',
}));
const { exec } = require('child_process');

app.get('/run-face-recognition', (req, res) => {
  exec('python face_recognition/collect_face_data.py', (error, stdout, stderr) => {
    if (error) {
      console.error('Recognition failed:', stderr);
      return res.json({ success: false });
    }

    if (stdout.includes('Face matched')) {
      return res.json({ success: true });
    } else {
      return res.json({ success: false });
    }
  });
});


app.get('/face-verification', (req, res) => {
  exec('python face_recognition/', (err, stdout, stderr) => {
    if (err) {
      console.error(`Error: ${stderr}`);
      return res.status(500).json({ error: 'Face verification failed' });
    }

    // You can return result to frontend
    res.json({ message: 'Face verified successfully', output: stdout });
  });
});
app.get('/face-verification', (req, res) => {
  res.render('face-verification'); // it will load face-verification.ejs
});

// POST /api/verify-face
app.post('/api/verify-face', async (req, res) => {
  const { face_id } = req.body;
  try {
    const employee = await Employee.findOne({ face_id: Number(face_id) });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Face ID not found" });
    }

    // Log attendance
    const currentTime = new Date();
    const isLate = currentTime.getHours() >= 9 && currentTime.getMinutes() > 15;

    const attendanceRecord = new Attendance({
      employeeId: employee._id,
      status: isLate ? 'Late' : 'Present',
      time: currentTime,
    });

    await attendanceRecord.save();

    res.json({ success: true, message: "Attendance marked", data: attendanceRecord });
  } catch (err) {
    console.error("Error verifying face:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
console.log("Google Client ID:", process.env.GOOGLE_CLIENT_ID);


app.listen(5000, () => console.log('Server running on http://localhost:5000'));
