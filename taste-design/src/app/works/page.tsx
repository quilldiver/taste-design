import type { Metadata } from "next";
import { WorksBrowser } from "@/components/WorksBrowser";

export const metadata: Metadata = {
  title: "作品 — Taste Design 设计厨房",
  description: "按类型分组的作品档案。",
};

export default function WorksPage() {
  return (
    <section className="relative min-h-[100svh] px-5 pb-28 pt-32 sm:px-8 sm:pt-40">
      <div className="mx-auto w-full max-w-[1680px]">
        <p className="label">Selected Works</p>

        <h1 className="display mt-5 text-[clamp(2.6rem,6.4vw,5.2rem)]">
          <span className="block">作品</span>
          <span className="mt-2 block text-[0.4em] tracking-[0.06em] text-mute">
            Works
          </span>
        </h1>

        <p className="mt-6 max-w-[34rem] text-[1.0625rem] leading-[1.75] text-mute">
          七个方向的出品记录。把光标放到任意一张上，整叠牌会为它让出位置。
        </p>

        <WorksBrowser />
      </div>
    </section>
  );
}
