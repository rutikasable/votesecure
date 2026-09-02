const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { supabase } = require("./config/supabase");
const authRoutes = require("./routes/authRoutes");
const electionRoutes = require("./routes/electionRoutes");
const candidateRoutes = require("./routes/candidateRoutes");
const voteRoutes = require("./routes/voteRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: true, // Dynamically reflects request origin (localhost, 127.0.0.1, LAN IPs like 192.100.30.203)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  })
);

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/elections", electionRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/admin", adminRoutes);

// Test root route
app.get("/", async (req, res) => {
  res.json({
    message: "VoteSecure backend is running!",
    database: "Supabase",
    status: "connected"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT} and http://0.0.0.0:${PORT}`);
  console.log(`Connected to Supabase: https://avwdbgiiadsagoftapfa.supabase.co`);
});
