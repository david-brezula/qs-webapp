import { Hero } from "@/components/sections/Hero";
import { Stats } from "@/components/sections/Stats";
import { Capabilities } from "@/components/sections/Capabilities";
import { Process } from "@/components/sections/Process";
import { Projects } from "@/components/sections/Projects";
import { Certifications } from "@/components/sections/Certifications";
import { Coverage } from "@/components/sections/Coverage";
import { Testimonials } from "@/components/sections/Testimonials";
import { ContactCTA } from "@/components/sections/ContactCTA";

// NOTE: still the original solar sections — replaced with the localized
// construction homepage in Task 10. Marketing chrome now comes from the layout.
export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <Capabilities />
      <Process />
      <Projects />
      <Certifications />
      <Coverage />
      <Testimonials />
      <ContactCTA />
    </>
  );
}
