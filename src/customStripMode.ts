import { Formats, Perms } from "homebridge";

export = (homebridge) => {
  const Charact = homebridge.hap.Characteristic;

  return class LightStripMode extends Charact {
    // public static readonly UUID: string = '0000007C-0000-1000-8000-0026BB765291';
    public static readonly UUID: string =
      "b484384e-98f7-4f29-911e-42e4cbb87df2";

    constructor() {
      super("Light Strip Mode", LightStripMode.UUID, {
        format: Formats.UINT16,
        maxValue: 10,
        minValue: 0,
        minStep: 1,
        perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  };
};
