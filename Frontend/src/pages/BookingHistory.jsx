import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import CancelIcon from "@mui/icons-material/Cancel";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import styles from "../styles/Schedule.module.css";
import { FullBox, MainContainer, MainPaper } from "../components/Containers";
import { useAuth } from "../contexts/AuthContext";
import { toast, ToastContainer } from "react-toastify";
import api from "../api/axios";
import buildingIdToCampus from "../utils/campusMapping";

export default function BookingHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const pageSizeOptions = [25, 50, 100];
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [room_id, setRoomId] = useState(null);
  const [refreshFlag, setRefreshFlag] = useState(0);

  // Thêm theme tùy chỉnh cho DataGrid
  const customTheme = createTheme({
    components: {
      MuiDataGrid: {
        styleOverrides: {
          footerContainer: {
            justifyContent: "flex-end",
          },
          toolbarContainer: {
            justifyContent: "flex-end",
          },
        },
      },
    },
  });

  const currentDate = new Date().toISOString().split("T")[0];

  const { userInfo } = useAuth();

  useEffect(() => {
    const fetchBookingHistory = async () => {
      setLoading(true);
      try {
        const res = await api.post(
          "/api/booking/userBookings",
          {
            username: userInfo.username,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = res.data.bookings;

        // Sử dụng Map để theo dõi các booking theo vị trí và thời gian
        const bookingMap = new Map();

        // Xử lý tất cả các booking, ưu tiên booking không bị hủy
        data.forEach((booking) => {
          const meta = buildingIdToCampus[booking.room.building_id] || {};
          const start = new Date(booking.start_time);
          const end = new Date(booking.end_time);

          // Tạo key duy nhất dựa trên thông tin phòng và thời gian
          const key = `${booking.room.room_number}-${
            booking.room.building_id
          }-${start.toLocaleDateString(
            "sv-SE"
          )}-${start.toLocaleTimeString()}-${end.toLocaleTimeString()}`;

          // Chỉ giữ booking mới nhất cho mỗi slot thời gian
          // Nếu đã có một booking cho slot này và booking hiện tại không bị hủy, thay thế
          if (
            !bookingMap.has(key) ||
            (booking.status !== "cancelled" && bookingMap.get(key).status === "cancelled")
          ) {
            bookingMap.set(key, {
              campus: meta.campus || "Unknown",
              building: meta.building || "Unknown",
              room: booking.room.room_number,
              date: start.toLocaleDateString("sv-SE"),
              time: `${start.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })} – ${end.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}`,
              status: booking.status,
            });
          }
        });

        // Chuyển đổi các giá trị từ Map thành mảng để hiển thị
        const mapped = Array.from(bookingMap.values());
        setRows(mapped);
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingHistory();
  }, [userInfo?.username, refreshFlag]);

  const handleCancelClick = (booking) => {
    setSelectedBooking(booking);
    setOpenConfirmDialog(true);
  };

  const handleConfirmCancel = async () => {
    try {
      const buildingEntry = Object.entries(buildingIdToCampus).find(
        ([id, value]) => value.building === selectedBooking.building
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
          room_number: selectedBooking.room,
        },
      });

      const room_id = roomIdRes.data.room_id;
      // console.log("Room ID:", room_id);

      const parseTime12 = (timeStr) => {
        const [hourMin, period] = timeStr.split(" ");
        let [hour, minute] = hourMin.split(":").map(Number);
        if (period === "PM" && hour !== 12) hour += 12;
        if (period === "AM" && hour === 12) hour = 0;
        return { hour, minute };
      };

      const timeRange = selectedBooking.time.replace("–", "-");
      const [startStr, endStr] = timeRange.split("-").map((s) => s.trim());
      const dateStr = selectedBooking.date;

      const { hour: startHour, minute: startMinute } = parseTime12(startStr);
      const { hour: endHour, minute: endMinute } = parseTime12(endStr);

      const start = new Date(dateStr);
      start.setHours(startHour, startMinute, 0, 0);

      const end = new Date(dateStr);
      end.setHours(endHour, endMinute, 0, 0);

      setOpenConfirmDialog(false);
      setSelectedBooking(null);

      const res = await api.post("/api/booking/cancel", {
        room_id: room_id,
        username: userInfo.username,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      });

      // console.log("Cancel response:", res.data);
      toast.dismiss();
      toast.success("Booking cancelled successfully");
      console.log("Booking cancelled successfully");
      setRefreshFlag((v) => v + 1);
    } catch (err) {
      console.error("Error canceling booking:", err);
      toast.dismiss();
      toast.error("Failed to cancel booking");
      setOpenConfirmDialog(false);
      setSelectedBooking(null);
    }
  };
  const columns = [
    {
      field: "stt",
      headerName: "No",
      flex: 1,
      renderCell: (params) => {
        const idx = params.api.getRowIndexRelativeToVisibleRows(params.id);
        return idx != null ? idx + 1 : "";
      },
      sortable: false,
      filterable: false,
      align: "center",
    },
    { field: "campus", headerName: "Campus", flex: 3 },
    { field: "building", headerName: "Building", flex: 2 },
    { field: "room", headerName: "Room", flex: 2 },
    { field: "date", headerName: "Date", flex: 3 },
    { field: "time", headerName: "Time", flex: 3 },
    {
      field: "cancel",
      headerName: "Action",
      flex: 2,
      sortable: false,
      filterable: false,

      renderCell: (params) => {
        const isCancelled = params.row.status === "cancelled";

        // Extract and parse start time (e.g., "05:00 PM")
        const [startTimeStr] = params.row.time.split("–").map((s) => s.trim());
        const [startTime, period] = startTimeStr.split(" ");
        let [hour, minute] = startTime.split(":").map(Number);
        if (period === "PM" && hour !== 12) hour += 12;
        if (period === "AM" && hour === 12) hour = 0;

        // Parse date string (e.g., "2025-05-23")
        const [year, month, day] = params.row.date.split("-").map(Number);

        // Construct booking start Date
        const bookingStart = new Date(year, month - 1, day, hour, minute);
        const now = new Date();

        const isFutureBooking = bookingStart > now;

        if (isCancelled) {
          return (
            <Button
              variant="text"
              disabled
              size="small"
              sx={{ color: "#aaa", minWidth: "100px", textTransform: "none" }}
            >
              CANCELLED
            </Button>
          );
        }

        return isFutureBooking ? (
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<CancelIcon />}
            onClick={() => handleCancelClick(params.row)}
            sx={{
              minWidth: "100px",
              borderRadius: "8px",
              textTransform: "none",
              "&:hover": {
                backgroundColor: "#ffebee",
              },
            }}
          >
            Cancel
          </Button>
        ) : (
          <Button
            variant="text"
            disabled
            size="small"
            sx={{ color: "#aaa", cursor: "not-allowed", minWidth: "100px" }}
          >
            No Action
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <div className={styles.pageBackground} />

      <MainContainer>
        <MainPaper>
          {loading ? (
            <div className={styles.loadingCentered}>
              <img src="/loading.gif" alt="Loading..." />
            </div>
          ) : (
            <FullBox>
              <ThemeProvider theme={customTheme}>
                <DataGrid
                  sx={{
                    height: "100%",
                    width: "100%",
                    // Thêm style để căn chỉnh phân trang
                    "& .MuiTablePagination-root": {
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      width: "100%",
                    },
                    "& .MuiTablePagination-selectLabel": {
                      margin: 0,
                    },
                    "& .MuiTablePagination-displayedRows": {
                      margin: 0,
                      marginLeft: "20px",
                    },
                    "& .MuiTablePagination-actions": {
                      marginLeft: "20px",
                    },
                  }}
                  rows={rows}
                  columns={columns}
                  loading={loading}
                  pageSizeOptions={pageSizeOptions}
                  initialState={{
                    pagination: {
                      paginationModel: { pageSize: 25 },
                    },
                  }}
                  disableSelectionOnClick
                  getRowId={(row) =>
                    `${row.campus}-${row.building}-${row.room}-${row.date}-${row.time}`
                  }
                />
              </ThemeProvider>
            </FullBox>
          )}
        </MainPaper>
      </MainContainer>

      {/* Confirmation Dialog */}
      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirm cancellation"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {selectedBooking && (
              <>
                Are you sure you want to cancel your reservation?
                <Box sx={{ mt: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                  <Typography>
                    <strong>Campus:</strong> {selectedBooking.campus}
                  </Typography>
                  <Typography>
                    <strong>Building:</strong> {selectedBooking.building}
                  </Typography>
                  <Typography>
                    <strong>Room:</strong> {selectedBooking.room}
                  </Typography>
                  <Typography>
                    <strong>Date:</strong> {selectedBooking.date}
                  </Typography>
                  <Typography>
                    <strong>Time:</strong> {selectedBooking.time}
                  </Typography>
                </Box>
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, display: "flex", justifyContent: "space-between" }}>
          <Button
            onClick={() => setOpenConfirmDialog(false)}
            variant="contained"
            sx={{
              bgcolor: "#61c0ff",
              color: "#000000",
              "&:hover": {
                bgcolor: "#27A4F2",
              },
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirmCancel} color="error" variant="contained" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      <ToastContainer position="bottom-center" theme="colored" />
    </>
  );
}
