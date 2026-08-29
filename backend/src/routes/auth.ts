import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    if (!email || !password || !userType) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      userType,
      isVerified: true // Auto-verify for now
    });

    return res.status(201).json({ message: 'User created successfully.', user: { id: newUser._id, email: newUser.email, userType: newUser.userType } });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.get('/verify', async (req, res) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).json({ message: 'Invalid Token' });
    }

    const user = await User.findOne({ verifyToken: token });

    if (!user) {
      return res.status(400).json({ message: 'Invalid Token' });
    }

    user.isVerified = true;
    user.verifyToken = undefined;
    await user.save();

    return res.json({ message: 'User verified successfully' });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Missing credentials' });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );

    return res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        userType: user.userType,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
