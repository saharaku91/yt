const puppeteer = require("puppeteer");
const userAgent = require("user-agents");
const fs = require("fs");
const axios = require("axios");

// Load configuration from config.json
const config = JSON.parse(fs.readFileSync("./config.json", "utf-8"));

// Function to generate a random duration between min and max values
function getRandomDuration(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to fetch proxies for auto mode
async function fetchProxies() {
  try {
    console.log("Fetching proxies from external sources...");
    const proxyList1 = await axios.get(
      "https://www.proxy-list.download/api/v1/get?type=https&anon=elite"
    );
    const proxyList2 = await axios.get(
      "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=elite"
    );

    const proxies = [
      ...proxyList1.data.split("\n").filter(Boolean),
      ...proxyList2.data.split("\n").filter(Boolean),
    ];

    console.log(`Fetched ${proxies.length} proxies.`);
    return proxies;
  } catch (error) {
    console.error("Failed to fetch proxies:", error.message);
    return [];
  }
}

// Function to simulate a single browser session
async function simulateView(proxy, index) {
  console.log(`[Thread ${index}] Starting with proxy: ${proxy}`);
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--incognito",
      `--user-agent=${new userAgent().toString()}`,
      `--proxy-server=${proxy}`,
    ],
  });

  const page = await browser.newPage();

  try {
    console.log(`[Thread ${index}] Navigating to video URL: ${config.videoUrl}`);
    await page.goto(config.videoUrl, { waitUntil: "networkidle2" });

    const viewDuration = getRandomDuration(config.viewDuration.min, config.viewDuration.max);
    console.log(`[Thread ${index}] Simulating view for ${viewDuration} seconds.`);
    await page.waitForTimeout(viewDuration * 1000);
  } catch (error) {
    console.error(`[Thread ${index}] Error: ${error.message}`);
  } finally {
    await browser.close();
    console.log(`[Thread ${index}] Browser session closed.`);
  }
}

// Main function
(async () => {
  console.log("Starting the bot...");
  let proxies;

  if (config.proxy.mode === "auto") {
    proxies = await fetchProxies();
  } else {
    proxies = fs.readFileSync("./proxies.txt", "utf-8").split("\n").filter(Boolean);
  }

  if (proxies.length === 0) {
    console.error("No proxies available. Exiting.");
    return;
  }

  const tasks = Array.from({ length: config.threads }, (_, i) => {
    const proxy = proxies[i % proxies.length];
    return simulateView(proxy, i + 1);
  });

  console.log("Starting all threads...");
  await Promise.all(tasks);
  console.log("All threads completed.");
})();
