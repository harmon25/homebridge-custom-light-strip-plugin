/* eslint-disable quotes */
import {
  Service,
  PlatformAccessory,
  CharacteristicValue,
  CharacteristicSetCallback,
  CharacteristicGetCallback,
} from "homebridge";
import type { LightStripHomebridgePlatform } from "./platform";

import axios from "axios";
import queryString from "query-string";
import convert from "color-convert";

// there are more patterns!
const PATTERNS = {
  Solid: 0,
  Breath: 1,
  RainbowB: 2,
  Fire: 6,
  Water: 7,
  Sinelon: 11,
  Twinkles: 5,
  Rainbow: 8,
};

export class LightStripPlatformAccessory {
  private service: Service;
  private baseUrl: string;
  private switches: Service[] = [];
  // this could be tweaked to alter available patterns
  private ACTIVE_PATTERNS = [
    "Breath",
    "RainbowB",
    "Fire",
    "Water",
    "Sinelon",
    "Twinkles",
    "Rainbow",
  ];

  private hue: CharacteristicValue = 0;
  private saturation: CharacteristicValue = 0;
  private brightnessValue: CharacteristicValue = 0;

  constructor(
    private readonly platform: LightStripHomebridgePlatform,
    private readonly accessory: PlatformAccessory
  ) {
    // url used to control light strip
    this.baseUrl = `http://${accessory.context.device.address}`;

    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, "harmon")
      .setCharacteristic(this.platform.Characteristic.Model, "light-strip")
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        accessory.context.device.serial
      );

    // primary lightbulb service
    this.service =
      this.accessory.getService(this.platform.Service.Lightbulb) ||
      this.accessory.addService(this.platform.Service.Lightbulb);

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.context.device.uniqueName
    );

    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .on("set", this.setOn.bind(this))
      .on("get", this.getOn.bind(this));

    // register handlers for the Brightness Characteristic
    this.service
      .getCharacteristic(this.platform.Characteristic.Brightness)
      .on("set", this.setBrightness.bind(this))
      .on("get", this.getBrightness.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.Hue)
      .on("set", this.setHue.bind(this))
      .on("get", this.getHue.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.Saturation)
      .on("set", this.setSaturation.bind(this))
      .on("get", this.getSaturation.bind(this));

    // setup switches for pattern selection
    this.setupSwitches();
  }

  setupSwitches() {
    let activeP: string;
    let sw: Service;

    for (let i = 0; i < this.ACTIVE_PATTERNS.length; i++) {
      activeP = this.ACTIVE_PATTERNS[i];

      sw =
        this.accessory.getService(activeP) ??
        this.accessory.addService(
          this.platform.Service.Switch,
          activeP,
          activeP
        );

      sw.getCharacteristic(this.platform.Characteristic.On)
        .on("get", this.handleSwitchGet(activeP))
        .on("set", this.handleSwitch(activeP));

      sw.setCharacteristic(this.platform.Characteristic.Name, activeP);

      this.switches.push(sw);
    }
  }

  handleSwitchGet = (name) => {
    return (callback: CharacteristicSetCallback) => {
      this.doGet("/settings").then(({ data }) => {
        callback(null, PATTERNS[name] === data.pattern_idx);
      });
    };
  };

  handleSwitch = (name: string) => {
    return (
      value: CharacteristicValue,
      callback: CharacteristicSetCallback
    ) => {
      // when flipped on,
      if (value) {
        // turn off all switches that are not the one we just turned on..
        this.switches
          .filter((s) => s.subtype !== name)
          .forEach((s) => {
            s.updateCharacteristic(this.platform.Characteristic.On, false);
          });

        // actually send the request to change pattern
        this.doPost("/patterns", { value: PATTERNS[name] }).then(() => {
          callback(null);
        });
      } else {
        // if turning off a switch, set pattern back to solid color.
        this.doPost("/patterns", { value: 0 }).then(() => {
          callback(null);
        });
      }
    };
  };

  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.doGet(`/power?value=${value ? 1 : 0}`).then(() => {
      // this.platform.log.debug("Set Characteristic On ->", value);
      callback(null);
    });
  }

  getOn(callback: CharacteristicGetCallback) {
    this.doGet("/power").then((r) => {
      const isOn = Boolean(r.data.power);
      // this.platform.log.debug("Get Characteristic On ->", isOn);
      callback(null, isOn);
    });
  }

  setBrightness(
    value: CharacteristicValue,
    callback: CharacteristicSetCallback
  ) {
    this.brightnessValue = value;

    this.doPost("/solidcolorhsv", {
      h: this.hue,
      s: this.saturation,
      v: this.brightnessValue,
    }).then(() => {
      callback(null);
    });
  }

  getBrightness(callback: CharacteristicSetCallback) {
    this.doGet("/settings").then(({ data }) => {
      const { r, g, b } = data.solid_color;
      const [_H, _S, L] = convert.rgb.hsl(r, g, b);
      this.brightnessValue = L;
      callback(null, this.brightnessValue);
    });
  }

  setHue(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.doPost("/solidcolorh", { h: value }).then(() => {
      callback(null);
    });
  }

  getHue(callback: CharacteristicSetCallback) {
    this.doGet("/settings").then(({ data }) => {
      const { r, g, b } = data.solid_color;
      const [H, S, L] = convert.rgb.hsl(r, g, b);
      this.hue = H;
      this.saturation = S;
      this.brightnessValue = L;
      // this.platform.log.debug("Get Characteristic Hue -> ", H);
      callback(null, H);
    });
  }

  setSaturation(
    value: CharacteristicValue,
    callback: CharacteristicSetCallback
  ) {
    this.saturation = value;
    this.doPost("/solidcolorhsv", {
      h: this.hue,
      s: this.saturation,
      v: this.brightnessValue,
    }).then(() => {
      callback(null);
    });
  }

  getSaturation(callback: CharacteristicSetCallback) {
    this.doGet("/settings").then(({ data }) => {
      const { r, g, b } = data.solid_color;
      const [_H, S] = convert.rgb.hsl(r, g, b);

      callback(null, S);
    });
  }

  doPost(path, body) {
    return axios.post(`${this.baseUrl}${path}`, queryString.stringify(body));
  }

  doGet(path) {
    return axios.get(`${this.baseUrl}${path}`);
  }
}
