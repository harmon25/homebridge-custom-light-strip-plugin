import axios from "axios";
import Bonjour from "bonjour";

interface Device {
  type: string;
  mac: string;
  serial: string;
  address: string;
  hostname: string;
  uniqueName: string;
}

interface Referer {
  address: string;
  family: string;
  port: number;
  size: number;
}

interface DiscoveredDevice {
  name: string;
  fqdn: string;
  host: string;
  referer: Referer;
  port: number;
  type: string;
  subtypes: string[];
  rawTxt: Buffer;
  txt: Record<string, string>;
}

export function discover(): Promise<Device[]> {
  const bonjour = Bonjour();
  const lightStrips: DiscoveredDevice[] = [];

  bonjour.find({ type: "http" }, (service) => {
    if (service.name.includes("led-strip")) {
      lightStrips.push(service);
    }
  });

  return new Promise((resolve) => {
    setTimeout(async () => {
      bonjour.destroy();
      const discoveredDevices: Device[] = [];
      for (let i = 0; i < lightStrips.length; i++) {
        const resp = await axios.get(
          `http://${lightStrips[i].referer.address}`
        );

        const [type, mac, serial] = resp.data.split("\n");
        const { referer, host, name } = lightStrips[i];

        discoveredDevices.push({
          type,
          mac,
          serial,
          hostname: host,
          uniqueName: name,
          address: referer.address,
        });
      }

      resolve(discoveredDevices);
    }, 5000);
  });
}
