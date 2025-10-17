// frontend/src/components/GoalsDialog.tsx

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { UserGoals } from "../types";
import { Target, Utensils, Activity, X } from "lucide-react";

interface GoalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSendMessage?: (message: string) => void; // ADD THIS LINE
}

export function GoalsDialog({
  open,
  onOpenChange,
  userId,
  onSendMessage,
}: GoalsDialogProps) {
  const [goals, setGoals] = useState<UserGoals>({});
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [newRestriction, setNewRestriction] = useState("");

  // Load goals from localStorage on mount
  useEffect(() => {
    const savedGoals = localStorage.getItem(`goals_${userId}`);
    if (savedGoals) {
      const parsed = JSON.parse(savedGoals);
      setGoals(parsed);
      setRestrictions(parsed.dietaryRestrictions || []);
    }
  }, [userId]);

  const handleSave = () => {
    const updatedGoals: UserGoals = {
      ...goals,
      dietaryRestrictions: restrictions,
    };

    // Save to localStorage
    localStorage.setItem(`goals_${userId}`, JSON.stringify(updatedGoals));

    // CRITICAL FIX: Send goals to backend via WebSocket
    if (onSendMessage) {
      // Build the set goals command
      const commandParts: string[] = [];

      if (updatedGoals.dailyCalories) {
        commandParts.push(`calories:${updatedGoals.dailyCalories}`);
      }
      if (updatedGoals.dailyProtein) {
        commandParts.push(`protein:${updatedGoals.dailyProtein}`);
      }
      if (updatedGoals.fitnessGoal) {
        commandParts.push(`goal:${updatedGoals.fitnessGoal}`);
      }

      // Send the command to backend
      const command = `set goals ${commandParts.join(" ")}`;
      console.log("Sending goals command:", command);
      onSendMessage(command);
    }

    // Close dialog
    onOpenChange(false);
  };

  const addRestriction = () => {
    if (
      newRestriction.trim() &&
      !restrictions.includes(newRestriction.trim())
    ) {
      setRestrictions([...restrictions, newRestriction.trim()]);
      setNewRestriction("");
    }
  };

  const removeRestriction = (restriction: string) => {
    setRestrictions(restrictions.filter((r) => r !== restriction));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Nutrition Goals
          </DialogTitle>
          <DialogDescription>
            Set your daily nutrition targets and dietary preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="targets" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="targets">
              <Utensils className="w-4 h-4 mr-2" />
              Targets
            </TabsTrigger>
            <TabsTrigger value="fitness">
              <Activity className="w-4 h-4 mr-2" />
              Fitness
            </TabsTrigger>
            <TabsTrigger value="restrictions">
              <X className="w-4 h-4 mr-2" />
              Restrictions
            </TabsTrigger>
          </TabsList>

          {/* Daily Targets Tab */}
          <TabsContent value="targets" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="calories">Daily Calories Target</Label>
              <Input
                id="calories"
                type="number"
                placeholder="e.g., 2000"
                value={goals.dailyCalories || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setGoals({
                    ...goals,
                    dailyCalories: parseInt(e.target.value) || undefined,
                  })
                }
              />
              <p className="text-xs text-slate-500">
                Your target daily calorie intake
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="protein">Daily Protein Target (grams)</Label>
              <Input
                id="protein"
                type="number"
                placeholder="e.g., 150"
                value={goals.dailyProtein || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setGoals({
                    ...goals,
                    dailyProtein: parseInt(e.target.value) || undefined,
                  })
                }
              />
              <p className="text-xs text-slate-500">
                Your target daily protein intake in grams
              </p>
            </div>
          </TabsContent>

          {/* Fitness Goal Tab */}
          <TabsContent value="fitness" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Fitness Goal</Label>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant={
                    goals.fitnessGoal === "weight-loss" ? "default" : "outline"
                  }
                  className="justify-start"
                  onClick={() =>
                    setGoals({ ...goals, fitnessGoal: "weight-loss" })
                  }
                >
                  🔥 Weight Loss
                </Button>
                <Button
                  variant={
                    goals.fitnessGoal === "muscle-gain" ? "default" : "outline"
                  }
                  className="justify-start"
                  onClick={() =>
                    setGoals({ ...goals, fitnessGoal: "muscle-gain" })
                  }
                >
                  💪 Muscle Gain
                </Button>
                <Button
                  variant={
                    goals.fitnessGoal === "maintenance" ? "default" : "outline"
                  }
                  className="justify-start"
                  onClick={() =>
                    setGoals({ ...goals, fitnessGoal: "maintenance" })
                  }
                >
                  ⚖️ Maintenance
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Dietary Restrictions Tab */}
          <TabsContent value="restrictions" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="restriction">Add Dietary Restriction</Label>
              <div className="flex gap-2">
                <Input
                  id="restriction"
                  placeholder="e.g., vegan, gluten-free"
                  value={newRestriction}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewRestriction(e.target.value)
                  }
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRestriction();
                    }
                  }}
                />
                <Button onClick={addRestriction} variant="secondary">
                  Add
                </Button>
              </div>
            </div>

            {restrictions.length > 0 && (
              <div className="space-y-2">
                <Label>Current Restrictions</Label>
                <div className="flex flex-wrap gap-2">
                  {restrictions.map((restriction) => (
                    <Badge
                      key={restriction}
                      variant="secondary"
                      className="px-3 py-1 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900"
                      onClick={() => removeRestriction(restriction)}
                    >
                      {restriction}
                      <X className="w-3 h-3 ml-2" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500">
              Click on a restriction to remove it
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Goals</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
