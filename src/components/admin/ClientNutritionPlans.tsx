import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import AdminNutritionPlanViewer from "./AdminNutritionPlanViewer";

interface NutritionPlan {
  id: string;
  user_id: string;
  title: string;
  status: string | null;
  daily_calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  duration_weeks: number | null;
  created_at: string;
}

interface Props {
  userId: string;
}

const ClientNutritionPlans = ({ userId }: Props) => {
  const [viewingPlanId, setViewingPlanId] = useState<string | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-client-nutrition-plans", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_plans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as NutritionPlan[];
    },
  });

  if (viewingPlanId) {
    return (
      <AdminNutritionPlanViewer
        planId={viewingPlanId}
        onBack={() => setViewingPlanId(null)}
        isAdmin
      />
    );
  }

  return (
    <div className="card-apollo overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Calories</TableHead>
            <TableHead>Macros (P/C/F)</TableHead>
            <TableHead>Weeks</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
          ) : plans?.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No nutrition plans found.</TableCell></TableRow>
          ) : plans?.map(p => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.title}</TableCell>
              <TableCell>
                <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status || "—"}</Badge>
              </TableCell>
              <TableCell>{p.daily_calories || "—"} kcal</TableCell>
              <TableCell className="text-sm">
                {p.protein_grams || 0}g / {p.carbs_grams || 0}g / {p.fat_grams || 0}g
              </TableCell>
              <TableCell>{p.duration_weeks || "—"}</TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => setViewingPlanId(p.id)}>
                  View Meals
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ClientNutritionPlans;
