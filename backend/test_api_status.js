const http = require("http");

// 1. Get an order item first
const getOrders = () => {
  return new Promise((resolve, reject) => {
    http
      .get("http://localhost:3333/orders", (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(JSON.parse(data)));
      })
      .on("error", reject);
  });
};

const updateItem = (itemId) => {
  const data = JSON.stringify({ status: "lavage" });

  const options = {
    hostname: "localhost",
    port: 3333,
    path: `/orders/items/${itemId}/status`,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  };

  const req = http.request(options, (res) => {
    console.log(`StatusCode: ${res.statusCode}`);
    let responseData = "";
    res.on("data", (d) => (responseData += d));
    res.on("end", () => console.log("Response:", responseData));
  });

  req.on("error", (error) => {
    console.error("Error:", error);
  });

  req.write(data);
  req.end();
};

async function test() {
  try {
    console.log("Fetching orders...");
    const orders = await getOrders();
    if (orders.length > 0 && orders[0].items.length > 0) {
      const item = orders[0].items[0];
      console.log(`Testing update on Item ID: ${item.id}`);
      updateItem(item.id);
    } else {
      console.log("No items found to test.");
    }
  } catch (e) {
    console.log("Error fetching orders:", e.message);
  }
}

test();
