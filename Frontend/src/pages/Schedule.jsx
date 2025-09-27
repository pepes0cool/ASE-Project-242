import React, { useState, useMemo, useEffect } from "react";
import styles from "../styles/Schedule.module.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../api/axios";
import { useAuth } from "../contexts/AuthContext";
import { Campuses, Rooms, buildingIdToCampus } from "../utils/campusMapping";

const campuses = Campuses;
const rooms = Rooms;
const hours = Array.from({ length: 19 }, (_, i) => `${i + 5}:00`);

function getWeekDates(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function Schedule() {
  /* --------------------------------------------------
     Auth & role
  --------------------------------------------------*/
  const { userInfo } = useAuth();
  const role = userInfo?.role?.toLowerCase() || "guest";
  const canBook = role === "teacher";

  /* --------------------------------------------------
     UI state
  --------------------------------------------------*/
  const [campus, setCampus] = useState("");
  const [building, setBuilding] = useState("");
  const [room, setRoom] = useState("");
  const [roomId, setRoomId] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);

  const [refreshFlag, setRefreshFlag] = useState(0);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [bookingDetails, setBookingDetails] = useState({});
  const [showModal, setShowModal] = useState(false);

  const [loading, setLoading] = useState(false);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  /* --------------------------------------------------
     Fetch bookings whenever room/week changes
  --------------------------------------------------*/
  useEffect(() => {
    const fetchBookings = async () => {
      if (!room || !building || !campus) return;
      setLoading(true);

      try {
        const buildingEntry = Object.entries(buildingIdToCampus).find(
          ([id, value]) => value.building === building,
        );
        if (!buildingEntry) {
          toast.dismiss();
          toast.error("Building ID not found.");
          return;
        }
        const building_id = buildingEntry[0];

        const roomIdRes = await api.get("api/booking/getRoomId", {
          params: {
            building_id,
            room_number: room,
          },
        });

        const room_id = roomIdRes.data.room_id;
        setRoomId(room_id);

        const bookingsAllWeek = await Promise.all(
          weekDates.map(async (d) => {
            const date = d.toISOString().split("T")[0];
            try {
              const res = await api.get("api/booking/roomBookings", {
                params: { room_id, date },
              });
              return res.data.bookings;
            } catch (err) {
              console.error("Error fetching bookings for date:", date, err);
              return [];
            }
          }),
        );

        const flatBookings = bookingsAllWeek.flat();
        const slots = [];
        const details = {};

        flatBookings.forEach((b) => {
          const st = new Date(b.start_time);
          const et = new Date(b.end_time);
          for (let h = st.getHours(); h < et.getHours(); h++) {
            const labelDate = `${st.getDate()}/${st.getMonth() + 1}`;
            const dayLabel = st.toLocaleDateString("en-US", {
              weekday: "short",
            });
            const slot = `${labelDate}-${dayLabel}-${h}:00`;
            slots.push(slot);
            details[slot] = {
              lecturer: b.full_name,
              subject: "N/A",
              room: room,
              building,
              campus,
            };
          }
        });

        setBookedSlots(slots);
        setBookingDetails(details);
      } catch (err) {
        console.error(err);
        toast.dismiss();
        toast.error("Failed to load bookings");
      }
      setLoading(false);
    };

    fetchBookings();
  }, [room, building, campus, weekOffset, refreshFlag]);

  /* --------------------------------------------------
     Slot selection
  --------------------------------------------------*/
  const handleSlotClick = (dayLabel, hour, date) => {
    const slotDate = `${date.getDate()}/${date.getMonth() + 1}`;
    const slot = `${slotDate}-${dayLabel}-${hour}`;

    if (bookedSlots.includes(slot)) {
      toast.dismiss();
      toast.warn("This time has been reserved by someone else.");
      return;
    }
    if (!canBook) return;
    if (!room) {
      toast.dismiss();
      toast.warn("Please select a room first");
      return;
    }
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    );
  };

  /* --------------------------------------------------
     Booking flow
  --------------------------------------------------*/
  const handleBook = () => {
    if (!selectedSlots.length) return;
    setShowModal(true);
  };

  const confirmBooking = async () => {
    setShowModal(false);

    try {
      // console.log("Booking slots:", selectedSlots);

      // goup selected slots
      const slotsByDay = {};
      selectedSlots.forEach((slot) => {
        const [date, day, time] = slot.split("-");
        const dayKey = `${date}-${day}`;
        if (!slotsByDay[dayKey]) slotsByDay[dayKey] = [];
        slotsByDay[dayKey].push(parseInt(time.split(":")[0]));
      });
      // console.log(slotsByDay);

      const bookingRequests = [];

      // merge consecutive slots into ranges per day
      Object.entries(slotsByDay).forEach(([dayKey, hours]) => {
        hours.sort((a, b) => a - b);
        const [d, m] = dayKey.split("-")[0].split("/").map(Number);

        let s = hours[0];
        let e = hours[0];
        for (let i = 1; i < hours.length; i++) {
          if (hours[i] === e + 1) {
            e = hours[i];
          } else {
            bookingRequests.push({ d, m, s, e });
            s = e = hours[i];
          }
        }
        bookingRequests.push({ d, m, s, e });
      });
      // console.log("Booking requests:", bookingRequests);

      // send booking requests for each continuous range
      // i want to kms
      await Promise.all(
        bookingRequests.map(({ d, m, s, e }) => {
          const start = new Date(weekDates[0]);
          start.setDate(d);
          start.setMonth(m - 1);
          start.setHours(s, 0, 0, 0);

          const end = new Date(start);
          end.setHours(e + 1, 0, 0, 0);

          // console.log("Start:", start);
          // console.log("End:", end);
          //
          // console.log("Booking:", {
          //   start_time: start.toISOString(),
          //   end_time: end.toISOString(),
          //   roomId,
          //   username: userInfo.username,
          // });
          //
          return api.post("/api/booking/book", {
            room_id: roomId,
            username: userInfo.username,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
          });
        }),
      );

      toast.dismiss();
      toast.success("Successfully booked!");
      setSelectedSlots([]);
      setRefreshFlag((v) => 1);
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error(err.response?.data?.error || "Booking failed");
    }
  };

  /* --------------------------------------------------
     Styles helpers
  --------------------------------------------------*/
  const disabledStyle = { backgroundColor: "#e6e6e6", color: "#777" };

  /* --------------------------------------------------
     JSX
  --------------------------------------------------*/
  return (
    <>
      <div className={styles.pageBackground}></div>
      <div className={styles.container}>
        {/* -------------------- Filters -------------------- */}
        <div className={styles.header}>
          <div className={styles.filters}>
            <label>Campus</label>
            <select
              value={campus}
              onChange={(e) => {
                setCampus(e.target.value);
                setBuilding("");
                setRoom("");
              }}
              className={styles.selectBox}
            >
              <option value="" disabled hidden>
                Campus
              </option>
              {Object.keys(Campuses).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>

            <label>Building</label>
            <select
              value={building}
              onChange={(e) => {
                setBuilding(e.target.value);
                setRoom("");
              }}
              disabled={!campus}
              style={!campus ? disabledStyle : undefined}
              className={styles.selectBox}
            >
              <option value="" disabled hidden>
                Building
              </option>
              {campus &&
                Campuses[campus].map((b) => <option key={b}>{b}</option>)}
            </select>

            <label>Room</label>
            <select
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              disabled={!building}
              style={!building ? disabledStyle : undefined}
              className={styles.selectBox}
            >
              <option value="" disabled hidden>
                Room
              </option>
              {Rooms.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ---------------- Week navigation --------------- */}
        <div className={styles.weekNavButtons}>
          <button
            className={styles.prevWeek}
            onClick={() => setWeekOffset((o) => o - 1)}
          />
          <button
            className={styles.nextWeek}
            onClick={() => setWeekOffset((o) => o + 1)}
          />
        </div>

        {/* ---------------- Schedule grid --------------- */}
        <>
          {loading ? (
            <div className={styles.loadingCentered}>
              <img src="/loading.gif" alt="Loading..." />
            </div>
          ) : (
            <>
              {/* ---------------- Schedule Grid + Book Button + Modal --------------- */}
              <div className={styles.scheduleWrapper}>
                <div className={styles.scheduleGrid}>
                  {/* Header row */}
                  <div className={styles.headerRow}>
                    <div className={styles.timeCell}></div>
                    {weekDates.map((d) => {
                      const wd = d.toLocaleDateString("en-US", {
                        weekday: "short",
                      });
                      const md = `${d.getDate()}/${d.getMonth() + 1}`;
                      return (
                        <div key={md} className={styles.dayCell}>
                          <div className={styles.date}>{md}</div>
                          <div className={styles.weekday}>{wd}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Time rows */}
                  {hours.map((hour) => (
                    <div key={hour} className={styles.row}>
                      <div className={styles.timeCell}>{hour}</div>
                      {weekDates.map((d) => {
                        const dayLabel = d.toLocaleDateString("en-US", {
                          weekday: "short",
                        });
                        const slotDate = `${d.getDate()}/${d.getMonth() + 1}`;
                        const slot = `${slotDate}-${dayLabel}-${hour}`;
                        const isSelected = selectedSlots.includes(slot);
                        const isBooked = bookedSlots.includes(slot);
                        const details = bookingDetails[slot];
                        const isEarly = parseInt(hour) <= 7;

                        const now = new Date();
                        const slotHour = parseInt(hour.split(":")[0]);
                        const isPastDate =
                          d <
                          new Date(
                            now.getFullYear(),
                            now.getMonth(),
                            now.getDate(),
                          );
                        const isSameDay =
                          d.toDateString() === now.toDateString();
                        const isPastHour =
                          isSameDay && slotHour <= now.getHours();
                        const isDisabled = isPastDate || isPastHour;

                        const tipCls = `${styles.tooltipContainer} ${
                          isEarly ? styles.tooltipContainerBottom : ""
                        }`;

                        return (
                          <div
                            key={slot}
                            className={`${styles.slotCell} ${
                              isSelected ? styles.selected : ""
                            } ${isBooked ? styles.booked : ""} ${isDisabled ? styles.disabled : ""}`}
                            onClick={() => {
                              if (!isDisabled)
                                handleSlotClick(dayLabel, hour, d);
                            }}
                          >
                            {isBooked && details && (
                              <div className={tipCls}>
                                <div className={styles.tooltipTitle}>
                                  Information
                                </div>
                                <div className={styles.tooltipInfo}>
                                  <div className={styles.tooltipInfoItem}>
                                    <span className={styles.tooltipLabel}>
                                      Lecturer:
                                    </span>
                                    <span className={styles.tooltipValue}>
                                      {details.lecturer}
                                    </span>
                                  </div>
                                  <div className={styles.tooltipInfoItem}>
                                    <span className={styles.tooltipLabel}>
                                      Subject:
                                    </span>
                                    <span className={styles.tooltipValue}>
                                      {details.subject}
                                    </span>
                                  </div>
                                  <div className={styles.tooltipInfoItem}>
                                    <span className={styles.tooltipLabel}>
                                      Campus:
                                    </span>
                                    <span className={styles.tooltipValue}>
                                      {details.campus}
                                    </span>
                                  </div>
                                  <div className={styles.tooltipInfoItem}>
                                    <span className={styles.tooltipLabel}>
                                      Room:
                                    </span>
                                    <span className={styles.tooltipValue}>
                                      {details.room} - {details.building}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* ---------------- Book button and modal ---------------- */}
              {canBook && (
                <>
                  <button
                    className={styles.bookButton}
                    onClick={handleBook}
                    disabled={!selectedSlots.length}
                  >
                    Book Room
                  </button>

                  {showModal && (
                    <div className={styles.modalBackdrop}>
                      <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>
                          Confirm your appointment
                        </h3>
                        <div className={styles.modalContent}>
                          <p>
                            <strong>Name:</strong> {userInfo.first_name}
                          </p>
                          <p>
                            <strong>Campus:</strong> {campus}
                          </p>
                          <p>
                            <strong>Building:</strong> {building}
                          </p>
                          <p>
                            <strong>Room:</strong> {room}
                          </p>
                          <p>
                            <strong>Time:</strong>
                          </p>
                          <div style={{ marginTop: 8, paddingLeft: 20 }}>
                            {(() => {
                              const slotsByDay = {};
                              selectedSlots.forEach((slot) => {
                                const [date, day, time] = slot.split("-");
                                const dayKey = `${date} ${day}`;
                                if (!slotsByDay[dayKey])
                                  slotsByDay[dayKey] = [];
                                slotsByDay[dayKey].push(
                                  parseInt(time.split(":")[0]),
                                );
                              });
                              return Object.entries(slotsByDay).map(
                                ([dayKey, hours], idx) => {
                                  hours.sort((a, b) => a - b);
                                  const ranges = [];
                                  let s = hours[0],
                                    e = hours[0];
                                  for (let i = 1; i < hours.length; i++) {
                                    if (hours[i] === e + 1) {
                                      e = hours[i];
                                    } else {
                                      ranges.push({ s, e });
                                      s = e = hours[i];
                                    }
                                  }
                                  ranges.push({ s, e });
                                  const str = ranges
                                    .map((r) =>
                                      r.s === r.e
                                        ? `${r.s}:00`
                                        : `${r.s}:00 to ${r.e + 1}:00`,
                                    )
                                    .join(", ");
                                  return (
                                    <div key={idx} style={{ marginBottom: 4 }}>
                                      - {dayKey} at {str}
                                    </div>
                                  );
                                },
                              );
                            })()}
                          </div>
                        </div>
                        <div className={styles.modalActions}>
                          <button onClick={confirmBooking}>OK</button>
                          <button onClick={() => setShowModal(false)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      </div>

      {/* Toast area */}
      <ToastContainer position="bottom-center" theme="colored" />
    </>
  );
}
