import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";

import balloonRouter from "./routes/balloonRouter.js";
import weatherRouter from "./routes/weatherRouter.js";

const app = express();
const PORT = process.env.PORT || 8001;

// Allow all origins for CORS
app.use(cors({ origin: "*" }));

// Middleware for parsing JSON requests
app.use(express.json());

// Routes
app.use("/api/balloons", balloonRouter);
app.use("/api/weather", weatherRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
