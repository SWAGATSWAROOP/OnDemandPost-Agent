const express = require("express");
const bodyParser = require("body-parser");
const GhostAdminAPI = require("@tryghost/admin-api");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const api = new GhostAdminAPI({
  url: process.env.URL,
  key: process.env.KEY,
  version: "v5.0",
});

// Authentication middleware
const authenticate = (req, res, next) => {
  const { authorization } = req.headers;
  const password = process.env.PASSWORD; // Replace with your actual password

  if (!authorization || authorization !== password) {
    return res.status(403).json({ error: "Unauthorized access." });
  }

  next();
};

// Function to generate rich Lexical content
const generateRichLexicalContent = (contentSections) => {
  const children = contentSections.map((section) => {
    if (section.type === "heading") {
      return {
        children: [
          {
            text: section.text,
            type: "text",
            detail: 0,
            format: 1, // Bold text for headings
            mode: "normal",
            style: "",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "heading",
        version: 1,
      };
    } else if (section.type === "paragraph") {
      return {
        children: [
          {
            text: section.text,
            type: "text",
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      };
    } else if (section.type === "list") {
      return {
        children: section.items.map((item) => ({
          children: [
            {
              text: item,
              type: "text",
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              version: 1,
            },
          ],
          direction: "ltr",
          format: "",
          indent: 0,
          type: "listitem",
          version: 1,
        })),
        direction: "ltr",
        format: "",
        indent: 0,
        type: "list",
        version: 1,
      };
    }
  });

  return JSON.stringify({
    root: {
      children,
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });
};

// Route to create a structured post
app.post("/create-post", authenticate, async (req, res) => {
  try {
    const {
      title,
      contentSections,
      feature_image,
      status = "draft",
    } = req.body;

    // Validate required fields
    if (
      !title ||
      !contentSections ||
      !Array.isArray(contentSections) ||
      contentSections.length === 0
    ) {
      return res.status(400).json({
        error: "Title and contentSections (non-empty array) are required.",
      });
    }

    // Generate Lexical content
    const lexicalString = generateRichLexicalContent(contentSections);

    // Create the post
    const post = await api.posts.add({
      title,
      lexical: lexicalString,
      feature_image: feature_image || null, // Optional
      status: status, // Draft or published
    });

    res.status(201).json({
      message: "Post created successfully!",
      post,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the post." });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
