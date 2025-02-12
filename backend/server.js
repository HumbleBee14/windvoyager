require("dotenv").config();
const express = require("express");
const cors = require("cors");

const balloonRoutes = require("./routes/balloonRoutes");

const app = express();
const PORT = process.env.PORT || 8001;

app.use(cors());
app.use(cors({ origin: "https://grepguru.com" }));
app.use(express.json());

// Routes
app.use("/api/balloons", balloonRoutes);



app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
