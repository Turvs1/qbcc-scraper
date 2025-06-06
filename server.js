const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json());

app.post("/scrape-qbcc", async (req, res) => {
  const { qbcc } = req.body;

  if (!qbcc) {
    return res.status(400).json({ error: "QBCC licence number required" });
  }

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    });

    const page = await browser.newPage();

    await page.goto(
      "https://www.onlineservices.qbcc.qld.gov.au/onlinelicencesearch/visualelements/searchbsalicenseecontent.aspx",
      { waitUntil: "domcontentloaded" }
    );

    await page.type("#searchControl_txtLicenceNumber", qbcc);

    await Promise.all([
      page.click("#searchControl_btnSearch"),
      page.waitForNavigation({ waitUntil: "domcontentloaded" })
    ]);

    const licenceClass = await page.evaluate(() => {
      const label = [...document.querySelectorAll("td")].find(td =>
        td.textContent.includes("Class:")
      );
      return label?.nextElementSibling?.innerText?.trim() || null;
    });

    await browser.close();

    if (!licenceClass) {
      return res.status(404).json({ qbcc, error: "Licence class not found" });
    }

    res.json({ qbcc, licenceClass });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Scraping failed", details: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("✅ QBCC scraper is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});