import { createFileRoute } from "@tanstack/react-router";
import { SaltProvider } from "@/components/salt/SaltProvider";
import { SaltAppBar } from "@/components/salt/SaltAppBar";
import { TokenEngineSidebar } from "@/components/salt/TokenEngine";
import { LiveCanvas } from "@/components/salt/LiveCanvas";
import { SaltFooter } from "@/components/salt/SaltFooter";

const title = "Nexus-Tokens — Salt Token Engine for Wealth Management";
const description =
  "An AI-native design system console that compiles wealth advisor layouts against JPM Salt Design System tokens, density grids and WCAG 2.1 AAA contrast rules.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <SaltProvider>
      <SaltAppBar />
      <div className="flex flex-col lg:flex-row">
        <TokenEngineSidebar />
        <LiveCanvas />
      </div>
      <SaltFooter />
    </SaltProvider>
  );
}

