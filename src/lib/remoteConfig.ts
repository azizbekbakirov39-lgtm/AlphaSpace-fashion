import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';
import { app } from '../firebase';
import { getRemoteConfig as getRemoteConfigService } from 'firebase/remote-config';

const remoteConfig = getRemoteConfigService(app);

// Set default values
remoteConfig.defaultConfig = {
  enable_new_feature: 'false',
  bottom_tabs: JSON.stringify(['Do\'kon', 'Chat', 'Sozlamalar']),
  primary_color: '#3B82F6', // Tailwind blue-500
  app_font_size: '16',
};

// Fetch and activate
export const initRemoteConfig = async () => {
  try {
    await fetchAndActivate(remoteConfig);
    console.log("Remote config fetched and activated");
  } catch (error) {
    console.error("Error fetching remote config:", error);
  }
};

export const getRemoteConfigValue = (key: string) => {
  return getValue(remoteConfig, key);
};
