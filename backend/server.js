require("dotenv").config();
const express = require("express");
const cors = require("cors");

const balloonRoutes = require("./routes/balloonRoutes");

const app = express();
const PORT = process.env.PORT || 8001;

// app.use(cors());
app.use(cors({ origin: "*" }));

// app.use(cors({ origin: "https://grepguru.com" }));


/*
const allowedOrigins = [
  "https://grepguru.com", 
  "https://windvoyager.pages.dev"
];

const corsOptions = {
  origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
      } else {
          callback(new Error("Not allowed by CORS"));
      }
  },
  credentials: true,
};

app.use(cors(corsOptions));

*/

app.use(express.json());

// Routes
app.use("/api/balloons", balloonRoutes);



app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
