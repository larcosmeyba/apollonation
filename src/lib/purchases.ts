import { Capacitor } from "@capacitor/core";
import {
  Purchases,
  LOG_LEVEL,
  type PurchasesOffering,
  type PurchasesPackage,
  type CustomerInfo,
} from "@revenuecat/purchases-capacitor";
import { withTimeout } from "@/lib/timeout";

// RevenueCat public SDK keys are safe to ship in the client.
// Set these in src/lib/purchases.ts after creating your RevenueCat project.
const REVENUECAT_IOS_API_KEY = "appl_TWrKBqTDHnLgHAtRygxDhTxsfXv";
const REVENUECAT_ANDROID_API_KEY = "goog_ClaHieSZkphwjXBEmSJiaFEQhYK";

let configured = false;
let configuringFor: string | null = null;

export const isPurchasesAvailable = (): boolean => Capacitor.isNativePlatform();

const getApiKey = (): string | null => {
  const platform = Capacitor.getPlatform();
  if (platform === "ios") return REVENUECAT_IOS_API_KEY;
  if (platform === "android") return REVENUECAT_ANDROID_API_KEY;
  return null;
};

export const initPurchases = async (userId: string) => {
  if (!isPurchasesAvailable()) return;
  const apiKey = getApiKey();
  if (!apiKey || apiKey.includes("YOUR_")) {
    console.warn("[Purchases] RevenueCat API key not configured");
    return;
  }
  try {
    if (!configured) {
      await withTimeout(Purchases.setLogLevel({ level: LOG_LEVEL.WARN }), 5_000, "Purchase setup timed out");
      await withTimeout(Purchases.configure({ apiKey, appUserID: userId }), 10_000, "Purchase setup timed out");
      configured = true;
      configuringFor = userId;
    } else if (configuringFor !== userId) {
      await withTimeout(Purchases.logIn({ appUserID: userId }), 10_000, "Purchase login timed out");
      configuringFor = userId;
    }
  } catch (err) {
    console.error("[Purchases] init failed", err);
  }
};

export const logOutPurchases = async () => {
  if (!isPurchasesAvailable() || !configured) return;
  try {
    await Purchases.logOut();
    configuringFor = null;
  } catch (err) {
    console.warn("[Purchases] logout failed", err);
  }
};

export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  if (!isPurchasesAvailable()) return null;
  try {
    const result = await withTimeout(Purchases.getOfferings(), 12_000, "Plans took too long to load");
    return result.current ?? null;
  } catch (err) {
    console.error("[Purchases] getOfferings failed", err);
    throw err;
  }
};

export const purchasePackage = async (pkg: PurchasesPackage): Promise<CustomerInfo> => {
  if (!isPurchasesAvailable()) {
    throw new Error("Purchases are only available in the mobile app.");
  }
  const result = await Purchases.purchasePackage({ aPackage: pkg });
  return result.customerInfo;
};

export const restorePurchases = async (): Promise<CustomerInfo> => {
  if (!isPurchasesAvailable()) {
    throw new Error("Restore is only available in the mobile app.");
  }
  const result = await Purchases.restorePurchases();
  return result.customerInfo;
};

export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  if (!isPurchasesAvailable() || !configured) return null;
  try {
    const result = await Purchases.getCustomerInfo();
    return result.customerInfo;
  } catch (err) {
    console.error("[Purchases] getCustomerInfo failed", err);
    return null;
  }
};
