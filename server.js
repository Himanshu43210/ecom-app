import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoute.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cors from "cors";
import OpenAIAPI from 'openai';

//configure env
dotenv.config();

//databse config
connectDB();

//rest object
const app = express();

//middelwares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

//routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/product", productRoutes);
app.post('/askFromAssitant', async (req, res) => {
  const openai = new OpenAIAPI({ key: process.env.OPENAI_API_KEY });
  try {
    const userQuery = req.body.user_question;
    const prompt = `Find information about the product: ${userQuery}.
     Provide details such as the main product name and the company.
     if these things are not provided from the user, do not add them. 
     only tell the correct information and just the search keyword to search from the dataset
     just the answer nothing else. I Just need a single string of the search keyword`;

    const response = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
    });
    const extractedInfo = extractInfoFromResponse(response.choices[0]?.message?.content || "");
    res.json({ title: extractedInfo });
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

function extractInfoFromResponse(responseText) {
  return responseText.trim();
}

//rest api
app.get("/", (req, res) => {
  res.send("<h1>Welcome to ecommerce app</h1>");
});

//PORT
const PORT = process.env.PORT || 8080;

//run listen
app.listen(PORT, () => {
  console.log(
    `Server Running on ${process.env.DEV_MODE} mode on port ${PORT}`.bgCyan
      .white
  );
});
