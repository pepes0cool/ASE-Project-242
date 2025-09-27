const express = require("express");
const { body } = require("express-validator");
const { signup, login } = require("../controllers/authController.js");

const router = express.Router();

router.post(
  "/signup",
  [
    body("username").notEmpty().isLength({ min: 3, max: 50 }),
    body("first_name").notEmpty(),
    body("last_name").notEmpty(),
    body("email").isEmail(),
    body("phone_num").notEmpty().isMobilePhone(),
    body("hashed_password")
      .isLength({ min: 6 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body("role").isIn(["teacher", "student", "guest"]),
  ],
  signup
);

router.post("/login", [body("username").notEmpty(), body("password").exists()], login);

module.exports = router;
