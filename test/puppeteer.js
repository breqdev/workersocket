import puppeteer from "puppeteer";
import express from "express";

const app = express();
app.use(express.static("."));
const server = app.listen(8080);

const browser = await puppeteer.launch();
const page = await browser.newPage();

console.log("Browser ready");

await page.goto("http://localhost:8080/test/test.html");

console.log("Page loaded");

await new Promise((resolve) => setTimeout(resolve, 5000));

console.log("Test timeout reached");

const done = await page.evaluate("window.testComplete");

if (!done) {
  console.error("Not done!");
}

const pass = (await page.evaluate("window.testFail")) == 0;

process.exitCode = !(done && pass);

if (pass) {
  console.log("Test passed");
} else {
  console.error("Test failed");
}

await browser.close();
server.close();
