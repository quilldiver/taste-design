import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkIndex } from "@/components/WorkIndex";
import { SECTIONS } from "@/lib/works";

/**
 * 「作品」的二级页 —— 一条一级分类一条路由（/works/logo、/works/event…）。
 * 静态导出（output:"export"）必须把每一条都列出来。
 */
export function generateStaticParams() {
  return SECTIONS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = SECTIONS.find((x) => x.slug === slug);
  if (!s) return { title: "作品 — Taste Design 设计厨房" };
  return {
    title: `${s.cn} ${s.en} — Taste Design 设计厨房`,
    description: `${s.cn}分类下的作品与详情页。`,
  };
}

export default async function WorkSectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!SECTIONS.some((s) => s.slug === slug)) notFound();
  return <WorkIndex slug={slug} />;
}
