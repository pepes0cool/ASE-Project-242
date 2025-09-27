const express = require("express");
const { body, query } = require("express-validator");
const {
  bookRoom,
  checkBooking,
  displayRooms,
  changeBookStatus,
  getRoomBookings,
  getRoomId,
  getUserBookings,
  cancelBooking,
} = require("../controllers/bookController.js");

const router = express.Router();

router.post(
  "/book",
  [
    body("room_id").notEmpty().isInt(),
    body("username").notEmpty(),
    body("start_time").notEmpty().isISO8601(),
    body("end_time").notEmpty().isISO8601(),
  ],
  bookRoom,
);

router.post(
  "/check",
  [
    body("room_id").notEmpty().isInt(),
    body("start_time").notEmpty().isISO8601(),
    body("end_time").notEmpty().isISO8601(),
  ],
  checkBooking,
);

router.get("/getRooms", [query("date").optional().isISO8601()], displayRooms);

router.put(
  "/booking/status",
  [
    body("booking_id").notEmpty().isInt(),
    body("new_status").notEmpty().isIn(["confirmed", "cancelled"]),
    body("username").notEmpty(),
  ],
  changeBookStatus,
);

router.get(
  "/roomBookings",
  [query("room_id").notEmpty().isInt(), query("date").notEmpty().isISO8601()],
  getRoomBookings,
);

router.get(
  "/getRoomId",
  [
    query("building_id")
      .notEmpty()
      .withMessage("building_id is required")
      .isInt()
      .withMessage("building_id must be an integer")
      .toInt(),
    query("room_number")
      .notEmpty()
      .withMessage("room_number is required")
      .isInt()
      .withMessage("room_number must be an integer")
      .toInt(),
  ],
  getRoomId,
);

router.post("/userBookings", [body("username").notEmpty()], getUserBookings);

router.post(
  "/cancel",
  [
    body("room_id").notEmpty().isInt(),
    body("username").notEmpty(),
    body("start_time").notEmpty().isISO8601(),
    body("end_time").notEmpty().isISO8601(),
  ],

  cancelBooking,
);

module.exports = router;
