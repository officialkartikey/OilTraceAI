"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const router = express_1.default.Router();
router.post('/signup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, userType } = req.body;
        if (!email || !password || !userType) {
            return res.status(400).json({ message: 'Missing fields' });
        }
        const existingUser = yield User_1.User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const newUser = yield User_1.User.create({
            email,
            password: hashedPassword,
            userType,
            isVerified: true // Auto-verify for now
        });
        return res.status(201).json({ message: 'User created successfully.', user: { id: newUser._id, email: newUser.email, userType: newUser.userType } });
    }
    catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}));
router.get('/verify', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.query.token;
        if (!token) {
            return res.status(400).json({ message: 'Invalid Token' });
        }
        const user = yield User_1.User.findOne({ verifyToken: token });
        if (!user) {
            return res.status(400).json({ message: 'Invalid Token' });
        }
        user.isVerified = true;
        user.verifyToken = undefined;
        yield user.save();
        return res.json({ message: 'User verified successfully' });
    }
    catch (error) {
        console.error('Verification error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}));
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Missing credentials' });
        }
        const user = yield User_1.User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const isPasswordMatch = yield bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email, userType: user.userType }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
        return res.json({
            token,
            user: {
                id: user._id.toString(),
                email: user.email,
                userType: user.userType,
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}));
exports.default = router;
