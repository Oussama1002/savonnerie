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
    const orders = await getOrders();
    let found = false;
    orders.forEach((o) => {
      o.items.forEach((i) => {
        if (i.status === "prêt" || i.status === "pret") {
          console.log(
            `Item ID: ${i.id}, Status: ${i.status}, Placement: '${i.placement}'`,
          );
          found = true;
        }
      });
    });
    if (!found) console.log("No items found with status 'prêt'.");
  } catch (e) {
    console.error("Error:", e.message);
  }
}

inspect();
