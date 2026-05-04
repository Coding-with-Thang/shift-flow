import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f4f4f5] flex flex-col items-center justify-center relative font-sans text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* Top Left Logo */}
      <div className="absolute top-8 left-8 flex items-center gap-4">
        <div className="flex bg-black w-8 h-8 items-center justify-center gap-[2.5px] shrink-0">
          <div className="w-[4px] h-3.5 bg-white rounded-full"></div>
          <div className="w-[4px] h-[18px] bg-white rounded-full"></div>
          <div className="w-[4px] h-3.5 bg-white rounded-full"></div>
        </div>
        <div className="w-px h-5 bg-zinc-300"></div>
        <span className="font-medium tracking-[0.15em] text-[13px] text-zinc-800 uppercase pt-0.5">
          ShiftFlow
        </span>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center w-full max-w-[560px] px-6 z-10 -mt-12">
        <h1 className="text-[10rem] sm:text-[14rem] font-bold tracking-tighter leading-none mb-6 text-black">
          404
        </h1>

        <div className="w-full border border-zinc-900/15 p-8 flex flex-col mb-8 bg-[#f4f4f5]">
          <div className="flex items-center gap-2.5 mb-5 text-[13px] font-medium tracking-wide">
            <AlertCircle className="w-4 h-4 stroke-2" />
            <span className="uppercase tracking-wider">
              System Notification
            </span>
          </div>

          <div className="w-full h-px bg-zinc-900/10 mb-6"></div>

          <p className="text-[15px] text-zinc-800 mb-10 leading-relaxed">
            RESOURCE_NOT_FOUND: The requested path does not exist on this node.
          </p>

          <div className="flex flex-wrap gap-4 justify-between items-center text-[13px] text-zinc-500 tracking-wider">
            <span className="uppercase">ERR_CODE: 0xFD404</span>
            <span className="uppercase">TRACE_ID: MP-9821-00-Z</span>
          </div>
        </div>

        <Link
          href="/"
          className="bg-black text-white px-8 py-4 font-semibold tracking-widest text-[13px] hover:bg-zinc-800 transition-colors uppercase w-[280px] text-center mb-6"
        >
          Return to Dashboard
        </Link>

        <Link
          href="/"
          className="flex items-center gap-2 text-zinc-600 hover:text-black transition-colors text-[13px] font-medium tracking-wide uppercase"
        >
          <span>&larr;</span>
          <span>Previous Context</span>
        </Link>
      </div>
    </div>
  );
}
