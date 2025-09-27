import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import api from "../api/axios";
import {
  Button,
  Divider,
  Typography,
  TextField,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormLabel,
  Paper,
  InputAdornment,
  IconButton,
  Alert,
  Collapse,
} from "@mui/material";
import bg from "../assets/bg.png";
import hcmut_logo from "../assets/HCMUT.png";
import { Visibility, VisibilityOff } from "@mui/icons-material";

export default function Signup() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({
    username: "",
    phone: "",
    email: "",
    password: "",
    general: "",
  });
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "Guest",
  });

  const handleChange = (e) => {
    // Clear error for the field being changed
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: "",
      });
    }

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const normalizeRole = (role) => {
    switch (role) {
      case "Lecturer":
        return "teacher";
      case "Guest":
        return "guest";
      default:
        return "guest";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset all errors
    setErrors({
      username: "",
      phone: "",
      email: "",
      password: "",
      general: "",
    });

    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      setErrors({
        ...errors,
        password: "Passwords do not match",
      });
      return;
    }

    try {
      const payload = {
        username: formData.username,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone_num: formData.phone,
        hashed_password: formData.password,
        role: normalizeRole(formData.role),
      };
      console.log("Payload:", payload);

      const res = await api.post("api/auth/signup", payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("Signup success:", res.data);
      navigate("/login", { replace: true });
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        const errorData = err.response.data;

        // Clear all field-specific errors first
        const newErrors = {
          username: "",
          phone: "",
          email: "",
          password: "",
          general: "",
        };

        // Set the specific field error based on the response
        if (errorData.field) {
          newErrors[errorData.field] = errorData.message;
        } else {
          newErrors.general = errorData.message || "Registration failed. Please try again.";
        }

        setErrors(newErrors);
      } else {
        setErrors({
          ...errors,
          general: "An unexpected error occurred. Please try again.",
        });
      }
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Paper
        elevation={4}
        sx={{
          width: {
            xs: "90vw",
            sm: "80vw",
            md: "60vw",
            lg: "50vw",
            xl: "40vw",
          },
          backgroundColor: "#fff",
          padding: "30px",
          display: "flex",
          flexDirection: "column",
          borderRadius: "22px",
          my: 5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mb: 3,
          }}
        >
          <img src={hcmut_logo} alt="HCMUT LOGO" style={{ height: "100px" }} />
        </Box>

        <Typography variant="h5" color="primary.dark" textAlign="center" fontWeight="bold" mb={2}>
          Create New Account
        </Typography>

        <Divider sx={{ width: "100%", mb: 3 }} />

        {/* Display general error message if exists */}
        <Collapse in={!!errors.general}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.general}
          </Alert>
        </Collapse>

        <form onSubmit={handleSubmit}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 3,
            }}
          >
            <TextField
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              required
              InputLabelProps={{
                shrink: true,
              }}
              placeholder="Enter first name"
            />

            <TextField
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              required
              InputLabelProps={{
                shrink: true,
              }}
              placeholder="Enter last name"
            />

            <TextField
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              required
              InputLabelProps={{
                shrink: true,
              }}
              placeholder="Enter username"
              error={!!errors.username}
              helperText={errors.username}
            />

            <TextField
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              required
              InputLabelProps={{
                shrink: true,
              }}
              placeholder="Enter phone number"
              error={!!errors.phone}
              helperText={errors.phone}
            />

            <TextField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              required
              InputLabelProps={{
                shrink: true,
              }}
              placeholder="Enter email"
              sx={{ width: "210%", maxWidth: "1500px" }}
              error={!!errors.email}
              helperText={errors.email}
            />

            <FormControl component="fieldset" sx={{ gridColumn: { sm: "1 / span 2" } }}>
              <FormLabel component="legend">Role</FormLabel>
              <RadioGroup row name="role" value={formData.role} onChange={handleChange}>
                <FormControlLabel value="Lecturer" control={<Radio />} label="Lecturer" />
                <FormControlLabel
                  value="Guest"
                  control={<Radio />}
                  label="Guest (Student, Staff, ...)"
                />
              </RadioGroup>
            </FormControl>

            <TextField
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              required
              InputLabelProps={{
                shrink: true,
              }}
              placeholder="Enter password"
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Confirm Password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              required
              InputLabelProps={{
                shrink: true,
              }}
              placeholder="Confirm your password"
              error={!!errors.password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box sx={{ mt: 4, display: "flex", justifyContent: "space-between" }}>
            <Button
              variant="outlined"
              sx={{
                textTransform: "none",
                width: "48%",
                py: 1.5,
                borderRadius: "10px",
              }}
              onClick={() => navigate("/")}
            >
              Back to Home
            </Button>

            <Button
              type="submit"
              variant="contained"
              sx={{
                textTransform: "none",
                width: "48%",
                py: 1.5,
                borderRadius: "10px",
                backgroundColor: "#1976d2",
                "&:hover": {
                  backgroundColor: "#1565c0",
                },
              }}
            >
              Sign Up
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
