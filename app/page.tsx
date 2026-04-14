import PumpingLemmaDashboard from "@/components/PumpingLemmaDashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dff7ff,_#fff2dc_45%,_#ffffff_100%)] px-4 py-8 sm:px-8">
      <main className="mx-auto w-full max-w-6xl">
        <PumpingLemmaDashboard />
      </main>
    </div>
  );
}
