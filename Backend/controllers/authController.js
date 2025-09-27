const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const dbPromise = require("../models/index.js");

exports.signup = async (req, res) => {
  try {
    const db = await dbPromise;

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, first_name, last_name, email, phone_num, hashed_password, role } = req.body;

    // Check username duplication - check first
    const existingUsername = await db.User.findByPk(username);
    if (existingUsername) {
      return res.status(400).json({ field: "username", message: "Username already exists" });
    }

    // Check phone_num duplication - check second
    const existingPhone = await db.User.findOne({ where: { phone_num } });
    if (existingPhone) {
      return res
        .status(400)
        .json({ field: "phone_num", message: "Phone number already registered" });
    }

    // Check email duplication - check third
    const existingEmail = await db.User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ field: "email", message: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(hashed_password, salt);

    const user = await db.User.create({
      username,
      first_name,
      last_name,
      email,
      phone_num,
      hashed_password: hashed,
      role,
    });
    const token = jwt.sign({ userId: user.username }, process.env.JWT_SECRET, { expiresIn: "1h" });

    return res.status(201).json({
      message: "Register successful",
      token,
      user: {
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_num: user.phone_num,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const db = await dbPromise;

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body;

    const user = await db.User.findByPk(username);
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.hashed_password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user.username, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_num: user.phone_num,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Server error" });
  }
};
