/* eslint-disable quotes */
import { API } from "homebridge";
import { PLATFORM_NAME } from "./settings";
import { LightStripHomebridgePlatform } from "./platform";

/**
 * This method registers the platform with Homebridge
 */
export default (api: API) => {
  /**
   * Platform Accessory
   * An instance of this class is created for each accessory your platform registers
   * Each accessory may expose multiple services of different service types.
   */

  api.registerPlatform(PLATFORM_NAME, LightStripHomebridgePlatform);
};
