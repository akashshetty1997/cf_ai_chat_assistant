// frontend/src/components/Header.tsx

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Activity } from "lucide-react";

interface HeaderProps {
  isConnected: boolean;
  onOpenGoals: () => void;
}

export function Header({ isConnected, onOpenGoals }: HeaderProps) {
  return (
    <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 max-w-6xl">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Nutrition Coach
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                AI-Powered Meal Analysis
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <Badge
              variant={isConnected ? "default" : "secondary"}
              className={isConnected ? "bg-green-500 hover:bg-green-600" : ""}
            >
              <div
                className={`w-2 h-2 rounded-full mr-2 ${
                  isConnected ? "bg-white" : "bg-slate-400"
                }`}
              />
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>

            {/* Goals Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenGoals}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Goals
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
