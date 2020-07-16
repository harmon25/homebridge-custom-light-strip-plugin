var bonjour = require("bonjour")();
var axios = require("axios");

function discover() {
  let lightStrips = [];
  const browser = bonjour.find({ type: "http" }, (service) => {
    if (service.name.includes("led-strip")) {
      //   console.log("Found a led-strip:", service);
      lightStrips.push(service);
    }
  });

  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      console.log(browser.services);

      bonjour.destroy();
      let discoveredDevices = [];
      for (let i = 0; i < lightStrips.length; i++) {
        let resp = await axios.get(`http://${lightStrips[i].referer.address}`);

        let [type, mac, serial] = resp.data.split("\n");

        discoveredDevices.push({
          type,
          mac,
          serial,
          address: lightStrips[i].referer.address,
          hostname: lightStrips[i].host,
          uniqueName: lightStrips[i].name,
        });
      }

      resolve(discoveredDevices);
    }, 10000);
  });
}

(async () => {
  console.log(await discover());
})();
