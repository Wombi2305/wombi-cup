import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="fixed inset-0 z-0 flex flex-col justify-end">
      
      {/* HINTERGRUND-BILD */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/banner.png"
          alt="WombiCup Desktop Banner"
          fill
          priority
          sizes="100vw"
          className="hidden object-cover object-top sm:block"
        />
        <Image
          src="/banner-mobile.png"
          alt="WombiCup Mobile Banner"
          fill
          priority
          sizes="100vw"
          className="block object-cover object-top sm:hidden"
        />
      </div>

      {/* BUTTONS */}
      <div className="relative z-10 flex w-full justify-center px-6 pb-6 sm:justify-start sm:pb-24 sm:pl-[12%]">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-4 sm:mx-0 sm:max-w-none sm:w-auto sm:flex-row sm:gap-6">
          
          {/* Button: Jetzt anmelden */}
          <Link 
            href="/anmelden" 
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-8 py-4 text-center text-lg font-semibold text-white shadow-[0_0_25px_rgba(255,0,0,0.4)] transition-all duration-300 active:scale-95 sm:w-auto"
          >
            Jetzt anmelden
          </Link>

          {/* Button: Spielplan ansehen -> Leitet jetzt auf /tabelle weiter */}
          <Link 
            href="/tabelle" 
            className="flex w-full items-center justify-center rounded-xl border border-white/20 bg-black/60 backdrop-blur-md px-8 py-4 text-center text-lg font-semibold text-white transition-all duration-300 active:scale-95 sm:w-auto"
          >
            Spielplan ansehen
          </Link>
          
        </div>
      </div>
    </div>
  );
}