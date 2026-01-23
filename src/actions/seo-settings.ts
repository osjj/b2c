"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-utils";

export interface SeoSettings {
  defaultTitle: string;
  titleTemplate: string;
  defaultDescription: string;
  googleVerification?: string;
  bingVerification?: string;
  yandexVerification?: string;
  defaultOgImage?: string;
  twitterHandle?: string;
  facebookAppId?: string;
  customRobotsTxt?: string;
}

const SEO_SETTINGS_KEY = "seo_settings";

export async function getSeoSettings(): Promise<SeoSettings | null> {
  const setting = await prisma.setting.findUnique({
    where: { key: SEO_SETTINGS_KEY },
  });

  return setting?.value as SeoSettings | null;
}

export async function updateSeoSettings(data: SeoSettings) {
  await requireAdmin();

  await prisma.setting.upsert({
    where: { key: SEO_SETTINGS_KEY },
    update: { value: data as any },
    create: { key: SEO_SETTINGS_KEY, value: data as any },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");

  return { success: true };
}
