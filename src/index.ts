import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
  CharacteristicValue,
  CharacteristicSetCallback,
  CharacteristicGetCallback,
} from "homebridge";
import { PLATFORM_NAME, PLUGIN_NAME } from "./settings";
import { discover } from "./discover";
import axios from "axios";

/**
 * This method registers the platform with Homebridge
 */
export default (api: API) => {
  // create the custom charateristic here - with access to the api
  class Pattern extends api.hap.Characteristic {
    static readonly UUID: string = "000000CE-0000-1000-8001-0025ABCDDF91"; // random
    constructor() {
      super("Pattern", Pattern.UUID);
      this.setProps({
        format: api.hap.Formats.UINT8,
        maxValue: 10,
        minValue: 0,
        minStep: 1,
        perms: [api.hap.Perms.READ, api.hap.Perms.WRITE, api.hap.Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  }

  /**
   * Platform Accessory
   * An instance of this class is created for each accessory your platform registers
   * Each accessory may expose multiple services of different service types.
   */
  class LightStripPlatformAccessory {
    private service: Service;
    private baseUrl: string;
    /**
     * These are just used to create a working example
     * You should implement your own code to track the state of your accessory
     */
    // private exampleState = {
    //   On: false,
    //   Brightness: 100,
    //   HSL: { h: 0, s: 0, l: 0 },
    // };

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

      // get the LightBulb service if it exists, otherwise create a new LightBulb service
      // you can create multiple services for each accessory
      this.service =
        this.accessory.getService(this.platform.Service.Lightbulb) ||
        this.accessory.addService(this.platform.Service.Lightbulb);

      this.service.addOptionalCharacteristic(Pattern);
      // To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
      // when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
      // this.accessory.getService('NAME') ?? this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE');

      // set the service name, this is what is displayed as the default name on the Home app
      // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
      this.service.setCharacteristic(
        this.platform.Characteristic.Name,
        accessory.context.device.uniqueName
      );

      this.service.setCharacteristic(
        this.platform.Characteristic.Name,
        accessory.context.device.uniqueName
      );

      // each service must implement at-minimum the "required characteristics" for the given service type
      // see https://developers.homebridge.io/#/service/Lightbulb

      this.service
        .getCharacteristic(Pattern)
        .on("set", this.setPattern.bind(this));

      // register handlers for the On/Off Characteristic
      this.service
        .getCharacteristic(this.platform.Characteristic.On)
        .on("set", this.setOn.bind(this)) // SET - bind to the `setOn` method below
        .on("get", this.getOn.bind(this)); // GET - bind to the `getOn` method below

      // register handlers for the Brightness Characteristic
      this.service
        .getCharacteristic(this.platform.Characteristic.Brightness)
        .on("set", this.setBrightness.bind(this)); // SET - bind to the 'setBrightness` method below

      this.service
        .getCharacteristic(this.platform.Characteristic.Hue)
        .on("set", this.setHue.bind(this)); // SET - bind to the 'setBrightness` method below

      this.service
        .getCharacteristic(this.platform.Characteristic.Saturation)
        .on("set", this.setSaturation.bind(this)); // SET - bind to the 'setBrightness` method below

      this.service
        .getCharacteristic(this.platform.Characteristic.ColorTemperature)
        .on("set", this.setColorTemp.bind(this)); // SET - bind to the 'setBrightness` method below
    }

    setPattern(
      value: CharacteristicValue,
      callback: CharacteristicSetCallback
    ) {
      callback(null);
    }

    /**
     * Handle "SET" requests from HomeKit
     * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
     */
    setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
      // implement your own code to turn your device on/off
      axios.get(`${this.baseUrl}/power?value=${value ? 1 : 0}`).then(() => {
        this.platform.log.debug("Set Characteristic On ->", value);

        // you must call the callback function
        // the first argument should be null if there were no errors
        // the second argument should be the value to return
        callback(null);
      });
      // this.exampleStates.On = value as boolean;
      // you must call the callback function
    }

    setControl(
      value: CharacteristicValue,
      callback: CharacteristicSetCallback
    ) {
      callback(null);
    }

    setName(value: CharacteristicValue, callback: CharacteristicSetCallback) {
      callback(null);
    }

    /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   * 
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   * 
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
    getOn(callback: CharacteristicGetCallback) {
      // implement your own code to check if the device is on
      // const isOn = this.exampleStates.On;

      axios.get(`${this.baseUrl}/power`).then((r) => {
        const isOn = Boolean(r.data.power);
        this.platform.log.debug("Get Characteristic On ->", isOn);
        // you must call the callback function
        // the first argument should be null if there were no errors
        // the second argument should be the value to return
        callback(null, isOn);
      });
    }

    // /**
    //  * Handle "SET" requests from HomeKit
    //  * These are sent when the user changes the state of an accessory, for example, changing the Brightness
    //  */
    setBrightness(
      value: CharacteristicValue,
      callback: CharacteristicSetCallback
    ) {
      // console.log(`Set `)
      // implement your own code to set the brightness
      // this.exampleStates.Brightness = value as number;

      this.platform.log.debug("Set Characteristic Brightness -> ", value);

      // you must call the callback function
      callback(null);
    }

    setHue(value: CharacteristicValue, callback: CharacteristicSetCallback) {
      // console.log(`Set `)
      // implement your own code to set the brightness
      // this.exampleStates.Brightness = value as number;

      this.platform.log.debug("Set Characteristic Hue -> ", value);

      // you must call the callback function
      callback(null);
    }

    setColorTemp(
      value: CharacteristicValue,
      callback: CharacteristicSetCallback
    ) {
      // console.log(`Set `)
      // implement your own code to set the brightness
      // this.exampleStates.Brightness = value as number;

      this.platform.log.debug("Set Characteristic ColorTemp -> ", value);

      // you must call the callback function
      callback(null);
    }

    setSaturation(
      value: CharacteristicValue,
      callback: CharacteristicSetCallback
    ) {
      // console.log(`Set `)
      // implement your own code to set the brightness
      // this.exampleStates.Brightness = value as number;

      this.platform.log.debug("Set Characteristic Saturation -> ", value);

      // you must call the callback function
      callback(null);
    }
  }

  /**
   * HomebridgePlatform
   * This class is the main constructor for your plugin, this is where you should
   * parse the user config and discover/register accessories with Homebridge.
   */
  class LightStripHomebridgePlatform implements DynamicPlatformPlugin {
    public readonly Service: typeof Service = this.api.hap.Service;
    public readonly Characteristic: typeof Characteristic = this.api.hap
      .Characteristic;

    // this is used to track restored cached accessories
    public readonly accessories: PlatformAccessory[] = [];

    constructor(
      public readonly log: Logger,
      public readonly config: PlatformConfig,
      public readonly api: API
    ) {
      this.log.debug("Finished initializing platform:", this.config.name);

      // When this event is fired it means Homebridge has restored all cached accessories from disk.
      // Dynamic Platform plugins should only register new accessories after this event was fired,
      // in order to ensure they weren't added to homebridge already. This event can also be used
      // to start discovery of new accessories.
      this.api.on("didFinishLaunching", () => {
        log.debug("Executed didFinishLaunching callback");
        // run the method to discover / register your devices as accessories
        this.discoverDevices();
      });
    }

    /**
     * This function is invoked when homebridge restores cached accessories from disk at startup.
     * It should be used to setup event handlers for characteristics and update respective values.
     */
    configureAccessory(accessory: PlatformAccessory) {
      this.log.info("Loading accessory from cache:", accessory.displayName);

      // add the restored accessory to the accessories cache so we can track if it has already been registered
      this.accessories.push(accessory);
    }

    /**
     * This is an example method showing how to register discovered accessories.
     * Accessories must only be registered once, previously created accessories
     * must not be registered again to prevent "duplicate UUID" errors.
     */
    async discoverDevices() {
      const devices = await discover();
      // EXAMPLE ONLY
      // A real plugin you would discover accessories from the local network, cloud services
      // or a user-defined array in the platform config.

      // loop over the discovered devices and register each one if it has not already been registered
      for (const device of devices) {
        // generate a unique id for the accessory this should be generated from
        // something globally unique, but constant, for example, the device serial
        // number or MAC address
        const uuid = this.api.hap.uuid.generate(device.mac);

        // see if an accessory with the same uuid has already been registered and restored from
        // the cached devices we stored in the `configureAccessory` method above
        const existingAccessory = this.accessories.find(
          (accessory) => accessory.UUID === uuid
        );

        if (existingAccessory) {
          // the accessory already exists
          this.log.info(
            "Restoring existing accessory from cache:",
            existingAccessory.displayName
          );

          // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
          // existingAccessory.context.device = device;
          // this.api.updatePlatformAccessories([existingAccessory]);

          // create the accessory handler for the restored accessory
          // this is imported from `platformAccessory.ts`
          new LightStripPlatformAccessory(this, existingAccessory);
        } else {
          // the accessory does not yet exist, so we need to create it
          this.log.info("Adding new accessory:", device.uniqueName);

          // create a new accessory
          const accessory = new this.api.platformAccessory(
            device.uniqueName,
            uuid
          );

          // store a copy of the device object in the `accessory.context`
          // the `context` property can be used to store any data about the accessory you may need
          accessory.context.device = device;

          // create the accessory handler for the newly create accessory
          // this is imported from `platformAccessory.ts`
          new LightStripPlatformAccessory(this, accessory);

          // link the accessory to your platform
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
            accessory,
          ]);
        }

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
        // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  api.registerPlatform(PLATFORM_NAME, LightStripHomebridgePlatform);
};

// EXAMPLE ONLY
// Example showing how to update the state of a Characteristic asynchronously instead
// of using the `on('get')` handlers.
//
// Here we change update the brightness to a random value every 5 seconds using
// the `updateCharacteristic` method.
// setInterval(() => {
//   // assign the current brightness a random value between 0 and 100
//   const currentBrightness = Math.floor(Math.random() * 100);

//   // push the new value to HomeKit
//   this.service.updateCharacteristic(
//     this.platform.Characteristic.Brightness,
//     currentBrightness
//   );

//   this.platform.log.debug(
//     "Pushed updated current Brightness state to HomeKit:",
//     currentBrightness
//   );
// }, 10000);
