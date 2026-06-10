import Hero from "@/components/landing/Hero";
import MetricsRibbon from "@/components/landing/MetricsRibbon";
import BuiltDifferent from "@/components/landing/BuiltDifferent";
import HowItWorks from "@/components/landing/HowItWorks";
import BuiltToExtend from "@/components/landing/BuiltToExtend";
import Capabilities from "@/components/landing/Capabilities";
import LandingCTA from "@/components/landing/LandingCTA";
import Footer from "@/components/layout/Footer";
import CommandPalette from "@/components/shared/CommandPalette";

export default function Index() {
  return (
    <div className="min-h-screen" style={{ background: "#0A0A0B", scrollBehavior: "smooth" }}>
      <Hero />
      <MetricsRibbon />
      <BuiltDifferent />
      <HowItWorks />
      <BuiltToExtend />
      <Capabilities />
      <LandingCTA />
      <Footer />
      <CommandPalette />
    </div>
  );
}
