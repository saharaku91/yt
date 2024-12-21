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
      "https://www.proxy-list.download/api/v1/get?type=http&anon=elite"
    );
    const proxyList2 = await axios.get(
      "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=elite"
    );

    const proxies = [
      ...proxyList1.data.split("\n").filter(Boolean),
      ...proxyList2.data.split("\n").filter(Boolean),
    ];

    // Ensure all proxies have "http://" prefixed
    const formattedProxies = proxies.map((proxy) =>
      proxy.startsWith("http://") || proxy.startsWith("https://") || proxy.startsWith("socks5://")
        ? proxy
        : `http://${proxy}`
    );

    console.log(`Fetched ${formattedProxies.length} proxies.`);
    return formattedProxies;
  } catch (error) {
    console.error("Failed to fetch proxies:", error.message);
    return [];
  }
}

// Function to parse proxy with optional username and password
function parseProxy(proxy) {
  const proxyRegex = /^(https?|socks5?):\/\/(?:([^:@]+):([^@]+)@)?([^:]+):(\d+)$/;
  const match = proxy.match(proxyRegex);

  if (!match) {
    throw new Error(`Invalid proxy format: ${proxy}`);
  }

  const [, protocol, username, password, host, port] = match;
  return {
    protocol,
    host,
    port,
    username: username || null,
    password: password || null,
  };
}

// Function to simulate a single browser session
async function simulateView(proxy, index) {
  const userAgentInstance = new userAgent(); // Generate a random user-agent
  let browser;

  try {
    // Parse proxy and log its details
    const parsedProxy = parseProxy(proxy);
    console.log(
      `[Thread ${index}] Using proxy: ${parsedProxy.host}:${parsedProxy.port}, Protocol: ${parsedProxy.protocol}`
    );

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--incognito",
        `--user-agent=${userAgentInstance.toString()}`,
        `--proxy-server=${parsedProxy.protocol}://${parsedProxy.host}:${parsedProxy.port}`,
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });

    const page = await browser.newPage();

    // Authenticate proxy if username and password are provided
    if (parsedProxy.username && parsedProxy.password) {
      console.log(`[Thread ${index}] Authenticating proxy...`);
      await page.authenticate({
        username: parsedProxy.username,
        password: parsedProxy.password,
      });
    }

    console.log(`[Thread ${index}] Navigating to video URL: ${config.videoUrl}`);
    try {
      await page.goto(config.videoUrl, { waitUntil: "networkidle2", timeout: 30000 });
    } catch (error) {
      console.error(`[Thread ${index}] Failed to open video: ${error.message}`);
      return;
    }

    try {
      const isVideoPlayable = await page.evaluate(() => {
        const video = document.querySelector("video");
        if (video) {
          video.play();
          return true;
        }
        return false;
      });

      if (!isVideoPlayable) {
        console.error(`[Thread ${index}] Video element not found or failed to play.`);
        return;
      }
    } catch (error) {
      console.error(`[Thread ${index}] Error playing video: ${error.message}`);
      return;
    }

    const viewDuration = getRandomDuration(config.viewDuration.min, config.viewDuration.max);
    console.log(`[Thread ${index}] Simulating view for ${viewDuration} seconds.`);
    await page.waitForTimeout(viewDuration * 1000);

    console.log(`[Thread ${index}] View completed. Closing browser.`);
  } catch (error) {
    console.error(`[Thread ${index}] Proxy failed or browser error: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
      console.log(`[Thread ${index}] Browser session closed.`);
    }
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

  if (proxies.length < config.threads) {
    console.error("Not enough proxies for the number of threads. Exiting.");
    return;
  }

  const tasks = Array.from({ length: config.threads }, (_, i) => {
    const proxy = proxies[i]; // Assign a unique proxy to each thread
    return simulateView(proxy, i + 1);
  });

  console.log("Starting all threads concurrently...");
  await Promise.all(tasks); // Run all tasks concurrently
  console.log("All threads completed.");
})();
