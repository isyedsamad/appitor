import axios from "axios";
import { getToken } from "firebase/app-check";
import { appCheck, auth } from "@/lib/firebase";

const secureAxios = axios.create();

secureAxios.interceptors.request.use(async (config) => {
  try {
    if (appCheck) {
      const { token } = await getToken(appCheck, false);
      config.headers["X-Firebase-AppCheck"] = token;
    }
  } catch (err) {
    console.warn("App Check token error", err);
  }
  const user = auth.currentUser;

  if (user) {
    const idToken = await user.getIdToken();
    config.headers.Authorization = `Bearer ${idToken}`;
  }

  return config;
});

export default secureAxios;
