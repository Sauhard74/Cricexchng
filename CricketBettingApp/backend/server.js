const cors = require("cors");

app.use(
  cors({
    origin: "http://localhost:3000", // ✅ Frontend URL
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: ["Authorization", "Content-Type"],
  })
);
