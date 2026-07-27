import { useNavigate } from "react-router-dom";
import {
  Inbox,
  ListTodo,
  LifeBuoy,
  BookOpen,
  Users,
  CheckSquare,
  Sparkles,
  BarChart3,
  Settings as SettingsIcon,
  AlertOctagon,
  Clock,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { usePreferences } from "@/design-system/store";

/**
 * ⌘K command palette. Opening/closing is owned by AppShell (which registers the
 * global keydown listener); this component renders the searchable list of
 * navigation targets and quick actions.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const setTheme = usePreferences((s) => s.setTheme);
  const toggleContextPanel = usePreferences((s) => s.toggleContextPanel);

  const run = (fn: () => void) => {
    onOpenChange(false);
    // Defer so the dialog is unmounted before we navigate/mutate.
    requestAnimationFrame(fn);
  };

  const go = (to: string) => run(() => navigate(to));

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search or jump to…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/today")}>
            <Inbox /> Today
          </CommandItem>
          <CommandItem onSelect={() => go("/work")}>
            <ListTodo /> Work queue
          </CommandItem>
          <CommandItem onSelect={() => go("/cases")}>
            <LifeBuoy /> Cases
          </CommandItem>
          <CommandItem onSelect={() => go("/customers")}>
            <Users /> Customers
          </CommandItem>
          <CommandItem onSelect={() => go("/approvals")}>
            <CheckSquare /> Approvals
          </CommandItem>
          <CommandItem onSelect={() => go("/knowledge-gaps")}>
            <BookOpen /> Knowledge gaps
          </CommandItem>
          <CommandItem onSelect={() => go("/ai-activity")}>
            <Sparkles /> AI activity
          </CommandItem>
          <CommandItem onSelect={() => go("/insights")}>
            <BarChart3 /> Insights
          </CommandItem>
          <CommandItem onSelect={() => go("/settings")}>
            <SettingsIcon /> Settings
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Quick views">
          <CommandItem onSelect={() => go("/work?view=critical")}>
            <AlertOctagon /> Critical work
          </CommandItem>
          <CommandItem onSelect={() => go("/work?view=due-today")}>
            <Clock /> Due today
          </CommandItem>
          <CommandItem onSelect={() => go("/work?view=approvals")}>
            <CheckSquare /> Items awaiting approval
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(toggleContextPanel)}>
            <BarChart3 /> Toggle context panel
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("light"))}>
            <Sun /> Theme: Light
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("dark"))}>
            <Moon /> Theme: Dark
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("system"))}>
            <Monitor /> Theme: System
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
