import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 3600; // revalidate every hour

// Static-content pages don't change on every build — using a fixed date tells
// search engines the resource is genuinely stable, which strengthens update
// signals when these pages *do* change.
const TOOLS_CONTENT_LASTMOD = new Date("2026-04-20");
const EXCLUDED_SOLUTION_SLUGS = new Set(['ppe-safety-equipment-for-construction-sites'])

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();

  // 获取所有活跃产品
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });

  // 获取所有活跃分类（带父级 slug，用于生成嵌套 URL）
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: {
      slug: true,
      updatedAt: true,
      parent: { select: { slug: true, isActive: true } },
    },
  });

  // 获取所有活跃 Solutions
  const solutions = await prisma.solution.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });

  // 获取所有已发布 Blog 文章
  const blogPosts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    select: { slug: true, updatedAt: true },
  });

  // 静态页面
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/cases`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/news`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/solutions`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tools`,
      lastModified: TOOLS_CONTENT_LASTMOD,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/ai-quote`,
      lastModified: TOOLS_CONTENT_LASTMOD,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/ppe-calculator`,
      lastModified: TOOLS_CONTENT_LASTMOD,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/size-guide`,
      lastModified: TOOLS_CONTENT_LASTMOD,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/compliance-checker`,
      lastModified: TOOLS_CONTENT_LASTMOD,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // 产品页面
  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // 分类页面 —— 子分类用嵌套 URL（/categories/{parent}/{child}），
  // 与 /categories/[slug]/page.tsx 的 301 重定向保持一致，避免给 Google 重复内容信号
  const categoryPages: MetadataRoute.Sitemap = categories
    .filter((category) => !category.parent || category.parent.isActive)
    .map((category) => ({
      url: category.parent
        ? `${baseUrl}/categories/${category.parent.slug}/${category.slug}`
        : `${baseUrl}/categories/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: category.parent ? 0.6 : 0.7,
    }));

  // Solutions 页面
  const solutionPages: MetadataRoute.Sitemap = solutions.map((solution) => ({
    url: `${baseUrl}/solutions/${solution.slug}`,
    lastModified: solution.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  })).filter((solution) => {
    const slug = solution.url.split('/').pop()
    return slug ? !EXCLUDED_SOLUTION_SLUGS.has(slug) : true
  });

  // Blog 文章页面
  const blogPostPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...productPages,
    ...categoryPages,
    ...solutionPages,
    ...blogPostPages,
  ];
}
