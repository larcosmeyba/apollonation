import { Capacitor } from "@capacitor/core";

const unavailableError = () => new Error("In-app purchases are temporarily unavailable.");

export const isPurchasesAvailable = (): boolean => false;

export const initPurchases = async (_userId: string) => {
  return;
};

export const logOutPurchases = async () => {
  return;
};

export const getOfferings = async () => {
  return null;
};

export const purchasePackage = async (_pkg: unknown) => {
  if (Capacitor.isNativePlatform()) throw unavailableError();
  throw new Error("Purchases are only available in the mobile app.");
};

export const restorePurchases = async () => {
  if (Capacitor.isNativePlatform()) throw unavailableError();
  throw new Error("Restore is only available in the mobile app.");
};

export const getCustomerInfo = async () => {
  return null;
};
