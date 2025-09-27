const { validationResult } = require("express-validator");
const dbPromise = require("../models/index.js");
const { Op } = require("sequelize");

exports.bookRoom = async (req, res) => {
  try {
    const db = await dbPromise;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array() });

    const { room_id, username, start_time, end_time } = req.body;
    const room = await db.Room.findByPk(room_id);
    if (!room) return res.status(404).json({ error: "Room not found" });

    const user = await db.User.findByPk(username);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.role !== "teacher") {
      return res.status(403).json({ error: "Only teachers can book rooms" });
    }

    const overlap = await db.Booking.findOne({
      where: {
        room_id,
        status: "confirmed",
        [Op.or]: [
          {
            start_time: { [Op.lt]: new Date(end_time) },
            end_time: { [Op.gt]: new Date(start_time) },
          },
        ],
      },
    });

    if (overlap) {
      return res.status(409).json({ error: "Room is already booked during that time" });
    }

    const booking = await db.Booking.create({
      room_id,
      user: username,
      status: "pending",
      start_time,
      end_time,
    });

    return res.status(201).json({ message: "Booking created successfully", booking });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};

exports.checkBooking = async (req, res) => {
  try {
    const db = await dbPromise;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array() });

    const { room_id, start_time, end_time } = req.body;
    const room = await db.Room.findByPk(room_id);
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (!room.available) return res.status(400).json({ error: "Room is not available" });

    const overlap = await db.Booking.findOne({
      where: {
        room_id,
        status: "confirmed",
        [Op.or]: [
          {
            start_time: { [Op.lt]: new Date(end_time) },
            end_time: { [Op.gt]: new Date(start_time) },
          },
        ],
      },
    });

    if (overlap) {
      return res.status(409).json({ error: "Room is already booked during that time" });
    }
    return res.status(200).json({ message: "Room is available for booking" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};

exports.displayRooms = async (req, res) => {
  try {
    const db = await dbPromise;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array() });

    const { date } = req.query;
    let startOfDay, endOfDay;
    if (date) {
      startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
    }

    const rooms = await db.Room.findAll({
      include: [
        {
          model: db.Booking,
          as: "bookings",
          required: false,
          where: date
            ? {
                start_time: { [Op.lt]: endOfDay },
                end_time: { [Op.gt]: startOfDay },
              }
            : undefined,
          attributes: ["start_time", "end_time", "status"],
        },
        {
          model: db.Building,
          as: "building",
          attributes: ["name", "description", "location"],
        },
      ],
      attributes: ["room_id", "room_number", "building_id", "available"],
    });
    return res.status(200).json({ rooms });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};

exports.changeBookStatus = async (req, res) => {
  try {
    const db = await dbPromise;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array() });

    const { booking_id, new_status, username } = req.body;

    if (!["confirmed", "cancelled"].includes(new_status)) {
      return res.status(400).json({ error: "Invalid booking status" });
    }

    const booking = await db.Booking.findByPk(booking_id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (booking.user !== username) {
      return res.status(403).json({ error: "You can only change your own bookings" });
    }

    booking.status = new_status;
    await booking.save();

    const room = await db.Room.findByPk(booking.room_id);
    const user = await db.User.findByPk(username);

    console.log(`Notification to ${user.email || user.phone_num}:`);
    console.log(`Your booking for Room ${room.room_number} has been ${new_status}.`);
    console.log(`Time: ${booking.start_time} to ${booking.end_time}`);

    return res.status(200).json({ message: "Booking status updated", booking });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};

exports.getRoomBookings = async (req, res) => {
  try {
    const db = await dbPromise;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array() });

    const { room_id, date } = req.query;

    const room = await db.Room.findByPk(room_id);
    if (!room) return res.status(404).json({ error: "Room not found" });

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await db.Booking.findAll({
      where: {
        room_id,
        status: { [Op.ne]: "cancelled" },
        start_time: { [Op.lt]: endOfDay },
        end_time: { [Op.gt]: startOfDay },
      },
      include: [
        {
          model: db.User,
          as: "bookedBy",
          attributes: ["username", "first_name", "last_name"],
        },
      ],
      attributes: ["id", "room_id", "user", "start_time", "end_time", "status"],
    });

    const mappedBookings = bookings.map((booking) => {
      const startDate = new Date(booking.start_time);
      const endDate = new Date(booking.end_time);

      startDate.setHours(startDate.getHours() + 7);
      endDate.setHours(endDate.getHours() + 7);

      const startHour = startDate.getUTCHours() + startDate.getUTCMinutes() / 60;
      const endHour = endDate.getUTCHours() + endDate.getUTCMinutes() / 60;

      if (startHour < 5 || startHour > 23) {
        throw new Error(`Start time ${booking.start_time} is outside valid range (5:00–23:00)`);
      }
      if (endHour < 5 || endHour > 23) {
        throw new Error(`End time ${booking.end_time} is outside valid range (5:00–23:00)`);
      }

      const mappedStart = startHour - 5;
      const mappedEnd = endHour - 5;

      const user = booking.bookedBy;
      const full_name = `${user.first_name} ${user.last_name}`;

      return {
        booking_id: booking.id,
        room_id: booking.room_id,
        username: booking.user,
        full_name,
        start_time: booking.start_time,
        end_time: booking.end_time,
        mapped_start_time: mappedStart,
        mapped_end_time: mappedEnd,
        status: booking.status,
      };
    });

    return res.status(200).json({
      message: "Bookings retrieved successfully",
      room: {
        room_id: room.room_id,
        room_number: room.room_number,
      },
      bookings: mappedBookings,
    });
  } catch (err) {
    console.error("Error in getRoomBookings:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};

exports.getRoomId = async (req, res) => {
  try {
    const db = await dbPromise;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array() });

    const { building_id, room_number } = req.query;

    const room = await db.Room.findOne({
      where: {
        building_id,
        room_number,
      },
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    return res.status(200).json({
      room_id: room.room_id,
    });
  } catch (err) {
    console.error("Error in getRoomId:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const db = await dbPromise;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array() });

    const { username } = req.body;

    const user = await db.User.findByPk(username);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const bookings = await db.Booking.findAll({
      where: { user: username },
      include: [
        {
          model: db.Room,
          as: "room",
          attributes: ["room_number", "building_id"],
          include: {
            model: db.Building,
            as: "building",
            attributes: ["name", "location"],
          },
        },
      ],
      order: [["start_time", "DESC"]],
    });

    return res.status(200).json({ username, bookings });
  } catch (err) {
    console.error("Error in getUserBookings:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};

function formatDateTime(dateInput) {
  const date = new Date(dateInput);
  const pad = (n) => n.toString().padStart(2, "0");

  const yyyy = date.getUTCFullYear();
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const mi = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

exports.cancelBooking = async (req, res) => {
  try {
    const db = await dbPromise;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() });
    }

    const { room_id, username, start_time, end_time } = req.body;

    if (!username || !start_time || !end_time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const formattedStart = formatDateTime(start_time);
    const formattedEnd = formatDateTime(end_time);

    const booking = await db.Booking.findOne({
      where: {
        room_id: room_id,
        user: username,
        status: { [Op.ne]: "cancelled" },
        [Op.or]: [
          {
            start_time: { [Op.lt]: new Date(end_time) },
            end_time: { [Op.gt]: new Date(start_time) },
          },
        ],
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ error: "Booking already cancelled" });
    }

    booking.status = "cancelled";
    await booking.save();

    return res.status(200).json({ message: "Booking cancelled successfully" });
  } catch (err) {
    console.error("Error in cancelBooking:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};
