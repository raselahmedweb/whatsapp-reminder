const axios = require("axios");

async function resolveServerDownIssue() {
  // console.log("SERVER DOWN ISSUE RUN");
  try {
    await axios.get("http://localhost:3000");
    console.log("Server is up and running");
  } catch (error) {
    console.log("ERROR", error);
  }
}

module.exports = resolveServerDownIssue;
