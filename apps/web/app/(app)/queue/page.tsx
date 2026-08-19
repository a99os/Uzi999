import { Topbar } from "@/components/layout/topbar";
import { QueueRegisterSection } from "@/components/queue/queue-register-section";

export default function QueuePage() {
  return (
    <>
      <Topbar title="Clinic Queue" subtitle="Live view across every doctor" />
      <QueueRegisterSection />
    </>
  );
}
