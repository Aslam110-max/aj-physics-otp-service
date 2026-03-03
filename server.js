const express = require("express");
const handler = require("./api/send-otp");

const app = express();
app.use(express.json());

app.all("/api/send-otp", handler);

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "AJ Physics OTP Service" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
