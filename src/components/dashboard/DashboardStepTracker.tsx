import { Footprints } from "lucide-react";

const DashboardStepTracker = () => {
  return (
    <div className="card-apollo p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg">Step Tracker</h2>
          <p className="text-sm text-muted-foreground mt-1">Connect Apple Health</p>
        </div>
        <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center">
          <Footprints className="w-8 h-8 text-primary/60" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Step tracking integration coming soon. Your daily activity will show here.
      </p>
    </div>
  );
};

export default DashboardStepTracker;
