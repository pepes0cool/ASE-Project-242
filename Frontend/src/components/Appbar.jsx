import React, { useState } from "react";
import {
  Toolbar,
  AppBar,
  IconButton,
  Typography,
  Box,
  Button,
  Menu,
  Tooltip,
  Avatar,
  MenuItem,
  Divider,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import hcmut_logo from "../assets/HCMUT.png";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import HomeIcon from "@mui/icons-material/Home";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import HistoryIcon from "@mui/icons-material/History";
import styles from "../styles/Appbar.module.css";

const NAV_GUEST = [
  // { name: "Home", path: "/home", icon: <HomeIcon /> },
  { name: "Schedule", path: "/schedule", icon: <CalendarMonthIcon /> },
  { name: "Information", path: "/information", icon: <PersonIcon /> },
];

const NAV_LECTURER = [
  // { name: "Home", path: "/home", icon: <HomeIcon /> },
  { name: "Schedule", path: "/schedule", icon: <CalendarMonthIcon /> },
  { name: "History", path: "/history", icon: <HistoryIcon /> },
  { name: "Information", path: "/information", icon: <PersonIcon /> },
];

export default function Appbar() {
  const [anchorElUser, setAnchorElUser] = useState(null);
  const { logout, userInfo } = useAuth();
  // Thêm dòng này để log userInfo ra console
  console.log("userInfo data:", userInfo);
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = Boolean(userInfo);
  const role = userInfo?.role?.toLowerCase() || "guest"; // default to guest

  const navigation = role === "teacher" ? NAV_LECTURER : NAV_GUEST;

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => setAnchorElUser(null);

  const handleLogOut = () => {
    logout();
    navigate("/");
    handleCloseUserMenu();
  };

  const renderNav = () =>
    navigation.map((page) => (
      <Button
        key={page.path}
        variant="text"
        startIcon={page.icon}
        className={`${styles.navButton} ${
          location.pathname === page.path ? styles.navButtonActive : styles.navButtonInactive
        }`}
        onClick={() => navigate(page.path)}
      >
        {page.name}
      </Button>
    ));

  const firstLetter = userInfo?.first_name?.charAt(0)?.toUpperCase() || "?";
  const fullName = userInfo
    ? `${userInfo.first_name || ""} ${userInfo.last_name || ""}`.trim()
    : "User";

  return (
    <AppBar position="sticky" className={styles.appBar}>
      <Toolbar className={styles.toolbar}>
        {/* Logo & Navigation Container */}
        <Box className={styles.navigationContainer}>
          <Box
            component="img"
            src={hcmut_logo}
            alt="HCMUT LOGO"
            className={styles.logo}
            onClick={() => navigate("/")}
          />

          {/* Nav buttons (authenticated only) */}
          {isAuthenticated && renderNav()}
        </Box>

        {/* Right‑hand side: user menu or login/signup */}
        {isAuthenticated ? (
          <Box>
            <Tooltip title="Account settings">
              <IconButton onClick={handleOpenUserMenu} className={styles.userMenuButton}>
                <Avatar className={styles.avatar}>{firstLetter}</Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              id="user-menu"
              anchorEl={anchorElUser}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              PaperProps={{ elevation: 3, className: styles.menuPaper }}
            >
              <MenuItem disableRipple className={`${styles.menuItem} ${styles.menuItemNoHover}`}>
                <Avatar sx={{ mr: 1 }}>{firstLetter}</Avatar>
                <Box>
                  <Typography fontWeight={600}>{fullName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Typography>
                </Box>
              </MenuItem>

              <Divider sx={{ my: 1 }} />

              <MenuItem onClick={handleLogOut} className={styles.menuItemLogout}>
                <LogoutIcon color="error" className={styles.menuItemIcon} />
                <Typography color="error.main">Log out</Typography>
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="outlined"
              className={styles.signupButton}
              onClick={() => navigate("/signup")}
            >
              Sign up
            </Button>
            <Button
              variant="contained"
              className={styles.loginButton}
              onClick={() => navigate("/login")}
            >
              Log in
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
