import { TerminalShell } from '@/components/dashboard/terminal-shell';
import { Toaster } from '@/components/ui/toast';

export default function Home() {
  return (
    <div data-slot="terminal-page" className="dark flex min-h-screen flex-col bg-background text-foreground">
      <Toaster>
        <TerminalShell />
      </Toaster>
    </div>
  );
}
