import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const port = 3000;

const db = new pg.Client({
  host: process.env.HOST,
  user: process.env.USER,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.PORT,
});
db.connect();

let visitedProvinces = [];

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", async (req, res) => {
  const response = await db.query("SELECT * FROM visited_provinces");
  visitedProvinces = response.rows.map((province) => province.province_code);
  // console.log("province: " + visited_provinces);
  res.render("index", {
    provinces: visitedProvinces,
    total: visitedProvinces.length,
  });
});

app.post("/add", async (req, res) => {
  const province = req.body["province"];
  if (province) {
    try {
      // Fetch province_code dynamically based on user input
      const response = await db.query(
        "SELECT province_code FROM provinces WHERE LOWER(province_name) LIKE '%' || $1 || '%' ORDER BY province_code ASC LIMIT 1",
        [province.toLowerCase()]
      );

      // Check if a matching province was found
      if (response.rows.length !== 0) {
        const province_code = response.rows[0].province_code;

        // Prevent duplicate entries
        const alreadyVisited = await db.query(
          "SELECT 1 FROM visited_provinces WHERE province_code = $1",
          [province_code]
        );

        if (alreadyVisited.rows.length > 0) {
          res.locals.error = `${province_code} has already been visited.`;
          res.redirect("/");
          return;
        }

        // Insert the province into visited_provinces
        await db.query(
          "INSERT INTO visited_provinces (province_code) VALUES($1)",
          [province_code]
        );
        res.redirect("/");
      } else {
        res.locals.error = `No matching province found for: ${province}`;
        res.redirect("/");
      }
    } catch (err) {
      console.error("Failed to insert province:", err.stack);
      res.status(500).send("Database error occurred.");
    }
  } else {
    res.locals.error = "Province name cannot be empty.";
    res.redirect("/");
  }
});

app.listen(port, () => {
  console.log(`this app running on port ${port}`);
});
