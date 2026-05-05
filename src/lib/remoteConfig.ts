import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';
import { app } from '../firebase';
import { getRemoteConfig as getRemoteConfigService } from 'firebase/remote-config';

const remoteConfig = getRemoteConfigService(app);

// Set default values
remoteConfig.defaultConfig = {
  enable_new_feature: 'false',
  bottom_tabs: JSON.stringify(['Do\'kon', 'Chat', 'Sozlamalar']),
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
