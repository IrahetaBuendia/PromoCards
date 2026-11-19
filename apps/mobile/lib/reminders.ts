import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { Promo } from "./types";

const channelId = "promo-expirations";

if (Platform.OS === "android") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
    }),
  });
}

export const reminderId = (id: string) => `promocards-${id}`;

export async function schedulePromoReminder(promo: Promo) {
  const remaining = promo.expiresAt ? Date.parse(promo.expiresAt) - Date.now() : 0;
  if (!promo.expiresAt || remaining <= 3_600_000) throw new Error("La promoción no tiene un vencimiento con tiempo suficiente para recordarte.");

  await Notifications.setNotificationChannelAsync(channelId, {
    name: "Vencimientos de promociones",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error("Habilita las notificaciones de PromoCards en los ajustes de Android.");

  const expiresAt = Date.parse(promo.expiresAt);
  const lead = remaining > 86_400_000 ? 86_400_000 : 3_600_000;
  await Notifications.scheduleNotificationAsync({
    identifier: reminderId(promo.id),
    content: { title: "Tu promoción está por vencer", body: promo.title, data: { promoId: promo.id } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(expiresAt - lead), channelId },
  });
}

export async function hasPromoReminder(id: string) {
  if (Platform.OS !== "android") return false;
  return (await Notifications.getAllScheduledNotificationsAsync()).some((entry) => entry.identifier === reminderId(id));
}

export function cancelPromoReminder(id: string) {
  return Notifications.cancelScheduledNotificationAsync(reminderId(id));
}
