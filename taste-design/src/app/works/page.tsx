import type { Metadata } from "next";
import { WorksBrowser } from "@/components/WorksBrowser";

export const metadata: Metadata = {
  title: "作品 — Taste Design 设计厨房",
  description: "按类型分组的作品档案。",
};

export default function WorksPage() {
  return (
    <section className="works-page relative flex min-h-[100svh] flex-col justify-center pt-[clamp(6rem,9svh,7rem)] pb-[clamp(3.5rem,11svh,7.5rem)] sm:pt-[clamp(6rem,9svh,9rem)]">
      <div className="mx-auto w-full max-w-[1680px] px-[clamp(1rem,4.5vw,2rem)]">
        <p className="label">Selected Works</p>

        <h1 className="display mt-[clamp(0.5rem,1.6svh,1rem)] text-[clamp(2.2rem,min(6.4vw,6.4svh),4.4rem)]">
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
