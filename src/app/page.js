import Hero from "@/components/Hero";
import AdmissionCalculator from "@/components/AdmissionCalculator";
import AIStrategist from "@/components/AIStrategist";
import ExploreFuture from "@/components/ExploreFuture";

export default function Home() {
  return (
    <main>
      <Hero />
      <AdmissionCalculator hidePrevious={true} />
      <AIStrategist />
      <ExploreFuture />
    </main>
  );
}
