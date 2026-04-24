// RevenueCat IAP wrapper. Only meaningful on native iOS/Android builds via Capacitor.
// On the web, all calls degrade gracefully so the Subscribe page renders an
// "Open in app to purchase" fallback instead of crashing.
import { Capacitor } from "@capacitor/core";

let purchasesPromise: Promise<typeof import("@revenuecat/purchases-capacitor") | null> | null = null;
let initialized = false;
let initializedUserId: string | null = null;

const isNative = () => Capacitor.isNativePlatform();

const loadPurchases = () => {
  if (!isNative()) return Promise.resolve(null);
  if (!purchasesPromise) {
    purchasesPromise = import("@revenuecat/purchases-capacitor").catch((err) => {
      console.warn("[purchases] SDK failed to load", err);
      return null;
    });
  }
  return purchasesPromise;
};

export const isPurchasesAvailable = (): boolean => isNative();

export const initPurchases = async (userId: string) => {
  if (!isNative()) return;
  const mod = await loadPurchases();
  if (!mod) return;
  const { Purchases, LOG_LEVEL } = mod;
  try {
    if (!initialized) {
      const platform = Capacitor.getPlatform();
      const apiKey =
        platform === "ios"
          ? import.meta.env.VITE_REVENUECAT_IOS_KEY
          : import.meta.env.VITE_REVENUECAT_ANDROID_KEY;
      if (!apiKey) {
        console.warn("[purchases] Missing RevenueCat API key for", platform);
        return;
      }
      await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
      await Purchases.configure({ apiKey, appUserID: userId });
      initialized = true;
      initializedUserId = userId;
    } else if (initializedUserId !== userId) {
      await Purchases.logIn({ appUserID: userId });
      initializedUserId = userId;
    }
  } catch (err) {
    console.error("[purchases] init error", err);
  }
};

export const logOutPurchases = async () => {
  if (!isNative()) return;
  const mod = await loadPurchases();
  if (!mod) return;
  try {
    await mod.Purchases.logOut();
  } catch (err) {
    // logOut throws if user is anonymous; safe to ignore
    console.warn("[purchases] logOut", err);
  }
  initializedUserId = null;
};

export const getOfferings = async () => {
  if (!isNative()) return null;
  const mod = await loadPurchases();
  if (!mod) return null;
  const result = await mod.Purchases.getOfferings();
  return result.current ?? null;
};

export const purchasePackage = async (pkg: any) => {
  if (!isNative()) throw new Error("Purchases are only available in the mobile app.");
  const mod = await loadPurchases();
  if (!mod) throw new Error("Purchases SDK unavailable.");
  const result = await mod.Purchases.purchasePackage({ aPackage: pkg });
  return result.customerInfo;
};

export const restorePurchases = async () => {
  if (!isNative()) throw new Error("Restore is only available in the mobile app.");
  const mod = await loadPurchases();
  if (!mod) throw new Error("Purchases SDK unavailable.");
  const result = await mod.Purchases.restorePurchases();
  return result.customerInfo;
};

export const getCustomerInfo = async () => {
  if (!isNative()) return null;
  const mod = await loadPurchases();
  if (!mod) return null;
  const result = await mod.Purchases.getCustomerInfo();
  return result.customerInfo;
};
