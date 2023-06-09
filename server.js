const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(cors());
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
const PORT = 8000;

const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
};

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const { data: loginData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  console.log("🚀 ~ file: server.js:30 ~ app.post ~ user:", loginData);
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  try {
    // Fetch the existing user with the provided email
    const { data: existingUsers, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email);

    if (fetchError) {
      throw fetchError;
    }

    if (existingUsers.length === 0) {
      // No existing user found, create a new user in the database
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert([{ email, password }])
        .single();

      if (createError) {
        throw createError;
      }

      res.status(200).json({
        user: loginData.user,
        session: loginData.session,
        newUser,
        email,
        password,
        message: "logged in",
      });
    } else if (existingUsers.length === 1) {
      // Existing user found, proceed with login
      res.status(200).json({
        user: loginData.user,
        session: loginData.session,
        email,
        password,
        message: "logged in",
      });
    } else {
      throw new Error("Multiple users found with the same email.");
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/signup", async (req, res) => {
  const { email, password, username } = req.body;
  const { data, session, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    res.status(400).json({ error: error.message });
  } else {
    try {
      // After successful signup, insert user into users table in DB
      const insertResponse = await supabase
        .from("users")
        .insert([{ id: data.user.id, email, username, password }]);
      if (insertResponse.error) {
        throw new Error(
          "Failed to insert user into database: " + insertResponse.error.message
        );
      }
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ error: "An error occurred while saving user to database" });
      return;
    }

    res.status(200).json({ user: data.user, session, message: "registered" });
  }
});

app.post("/api/logout", async (req, res) => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    res.status(400).json({ error: error.message });
  } else {
    res.status(200).json({ message: "Logout successful" });
  }
});

app.post("/api/tasks", requireAuth, async (req, res) => {
  res.status(200).json({ message: process.env.SUPABASE_URL });

  // Handle task creation using req.body data
  // Use Supabase's `supabase.from('tasks').insert()` method
});

app.put("/api/tasks/:taskId", requireAuth, async (req, res) => {
  // Handle task update using req.params and req.body data
  // Use Supabase's `supabase.from('tasks').update()` method
});

app.delete("/api/tasks/:taskId", requireAuth, async (req, res) => {
  // Handle task deletion using req.params data
  // Use Supabase's `supabase.from('tasks').delete()` method
});

app.get("/boards/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    let { data: boards, error } = await supabase
      .from("user_boards")
      .select("board_id")
      .eq("user_id", userId);

    if (error) throw error;

    const boardIds = boards.map((board) => board.board_id);

    let { data: userBoards, error: boardError } = await supabase
      .from("boards")
      .select("*")
      .in("id", boardIds);

    if (boardError) throw boardError;

    res.json(userBoards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
