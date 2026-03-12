const http = require("http");

const id = "dd96621c-0643-465e-823f-8cbcab85cbe5"; // ID from previous step output (truncated but I need full ID... wait, I don't have full ID. I'll fetch list first)

const getOptions = {
  hostname: "localhost",
  port: 3333,
  path: "/machines",
  method: "GET",
};

const regex = /"id":"([^"]+)"/;

const req = http.request(getOptions, (res) => {
  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });
  res.on("end", () => {
    const match = data.match(regex);
    if (match && match[1]) {
      const machineId = match[1];
      console.log("Found machine ID:", machineId);
      updateMachine(machineId);
    } else {
      console.log("No machines found to update.");
    }
  });
});

req.end();

function updateMachine(machineId) {
  const data = JSON.stringify({
    status: "en_cours",
    timeRemaining: 45,
    program: "Standard",
  });

  const options = {
    hostname: "localhost",
    port: 3333,
    path: `/machines/${machineId}/status`,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  };

  const updateReq = http.request(options, (res) => {
    console.log(`UPDATE STATUS: ${res.statusCode}`);
    res.on("data", (d) => process.stdout.write(d));
  });

  updateReq.on("error", (e) => console.error(e));
  updateReq.write(data);
  updateReq.end();
}
