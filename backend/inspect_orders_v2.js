const http = require("http");

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

async function inspect() {
  try {
    console.log("Fetching orders from API...");
    const orders = await getOrders();
    let foundPrêt = false;

    // Check the first order with items
    for (const o of orders) {
      for (const i of o.items) {
        if (i.status === "prêt" || i.status === "pret") {
          console.log(`[Item ${i.id}] Keys:`, Object.keys(i));
          console.log(`[Item ${i.id}] Placement Value:`, i.placement);
          foundPrêt = true;
          if (i.hasOwnProperty("placement")) {
            console.log("SUCCESS: 'placement' field is present in response.");
          } else {
            console.log("FAILURE: 'placement' field is MISSING from response.");
          }
        }
      }
      if (foundPrêt) break;
    }

    if (!foundPrêt) console.log("No items found with status 'prêt' to check.");
  } catch (e) {
    console.error("Error:", e.message);
  }
}

inspect();
