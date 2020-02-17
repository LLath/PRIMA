// Relative imports
import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";

// Absolute Imports
import apiRoutes from "./routes/routes.index";

const router = express.Router();
const app = express();
const PORT = process.env.PORT || 5000;

let MONGOLAB_URI;

if (process.env.MONGOLAB_URI_ADMIN)
  MONGOLAB_URI = process.env.MONGOLAB_URI_ADMIN;
if (process.env.MONGOLAB_URI_USER) MONGOLAB_URI = process.env.MONGOLAB_URI_USER;

try {
  mongoose.connect(
    `mongodb+srv://${MONGOLAB_URI}@krc-hinbo.mongodb.net/prima?retryWrites=true&w=majority`,
    { useUnifiedTopology: true }
  );
} catch (error) {
  mongoose.connection.on("error", error => {
    console.error("Database connection error:", error);
  });
}

mongoose.connection.once("open", () => {
  console.log("Connected to Database!");
});

app.listen(PORT, () => {
  console.log(`App is running on port ${PORT}`);
});

app.use(bodyParser.json({ type: "application/json" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});
app.use("/level", apiRoutes);

export default router;
