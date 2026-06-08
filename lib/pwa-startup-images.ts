type StartupImageDescriptor = {
  url: string;
  media: string;
};

type StartupImageSpec = {
  width: number;
  height: number;
  deviceWidth: number;
  deviceHeight: number;
  pixelRatio: number;
};

function startupMediaQuery(spec: StartupImageSpec): string {
  return `(device-width: ${spec.deviceWidth}px) and (device-height: ${spec.deviceHeight}px) and (-webkit-device-pixel-ratio: ${spec.pixelRatio}) and (orientation: portrait)`;
}

/** Common iOS portrait splash sizes — see https://developer.apple.com/design/human-interface-guidelines/layout */
const STARTUP_IMAGE_SPECS: StartupImageSpec[] = [
  { width: 750, height: 1334, deviceWidth: 375, deviceHeight: 667, pixelRatio: 2 },
  { width: 828, height: 1792, deviceWidth: 414, deviceHeight: 896, pixelRatio: 2 },
  { width: 1170, height: 2532, deviceWidth: 390, deviceHeight: 844, pixelRatio: 3 },
  { width: 1179, height: 2556, deviceWidth: 393, deviceHeight: 852, pixelRatio: 3 },
  { width: 1242, height: 2688, deviceWidth: 414, deviceHeight: 896, pixelRatio: 3 },
  { width: 1284, height: 2778, deviceWidth: 428, deviceHeight: 926, pixelRatio: 3 },
  { width: 1290, height: 2796, deviceWidth: 430, deviceHeight: 932, pixelRatio: 3 },
  { width: 1668, height: 2388, deviceWidth: 834, deviceHeight: 1194, pixelRatio: 2 },
];

export function getPwaStartupImageDescriptors(): StartupImageDescriptor[] {
  return STARTUP_IMAGE_SPECS.map((spec) => ({
    url: `/apple-startup/${spec.width}x${spec.height}`,
    media: startupMediaQuery(spec),
  }));
}

export function parseStartupSizeParam(size: string): { width: number; height: number } | null {
  const match = /^(\d+)x(\d+)$/.exec(size);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return null;
  }
  return { width, height };
}
