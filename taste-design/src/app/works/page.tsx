import type { Metadata } from "next";
import { WorksBrowser } from "@/components/WorksBrowser";

export const metadata: Metadata = {
  title: "作品 — Taste Design 设计厨房",
  description: "按类型分组的作品档案。",
};

export default function WorksPage() {
  return (
    <section className="relative min-h-[100svh] px-5 pt-[clamp(6.5rem,12svh,8rem)] pb-[clamp(3rem,9svh,7rem)] sm:px-8 sm:pt-[clamp(6.5rem,12svh,10rem)]">
      <div className="mx-auto w-full max-w-[1680px]">
        <p className="label">Selected Works</p>

        <h1 className="display mt-[clamp(0.75rem,2svh,1.25rem)] text-[clamp(2.2rem,min(6.4vw,8svh),5.2rem)]">
          <span className="block">作品</span>
          <span className="mt-2 block text-[0.4em] tracking-[0.06em] text-mute">
            Works
          </span>
        </h1>

        <WorksBrowser />
      </div>
    </section>
  );
}
